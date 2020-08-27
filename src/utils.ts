import { Command, flags } from '@oclif/command'
import { Input, OutputFlags } from '@oclif/parser'
import { promisify } from 'util'
import config from 'config'
import fs from 'fs'
import path from 'path'
import { hexToAscii } from 'web3-utils'
import BigNumber from 'bignumber.js'
import { BlockHeader, Eth } from 'web3-eth'

import {
  Application,
  Config,
  isSupportedServices,
  Logger,
  SupportedServices,
  EventsEmitterOptions,
  DbBackUpConfig
} from './definitions'
import { AutoStartStopEventEmitter, NEW_BLOCK_EVENT_NAME } from './blockchain/new-block-emitters'
import { services } from './app'
import { getNewBlockEmitter } from './blockchain/utils'

const readFile = promisify(fs.readFile)

/**
 * Bignumber.js utils functions
 */
export function bnFloor (v: string | number | BigNumber): BigNumber {
  return new BigNumber(v).integerValue(BigNumber.ROUND_FLOOR)
}

/**
 * Function that will split array into two groups based on callback that returns Promise.
 *
 * @param arr
 * @param callback
 * @return [success, failure] array where first are positives based on callback and second are negatives
 */
export async function asyncSplit<T> (arr: T[], callback: (elem: T) => Promise<boolean>): Promise<[T[], T[]]> {
  const splitArray = await Promise.all(arr.map(async item => await callback(item)))
  return arr.reduce<[T[], T[]]>(([pass, fail], elem, currentIndex) => {
    return splitArray[currentIndex] ? [[...pass, elem], fail] : [pass, [...fail, elem]]
  }, [[], []])
}

/**
 * Utility function that will split array into two groups based on sync callback.
 * @param array
 * @param isValid
 * @return [success, failure] array where first are positives based on callback and second are negatives
 */
export function split<T> (array: T[], isValid: (elem: T) => boolean): [T[], T[]] {
  return array.reduce<[T[], T[]]>(([pass, fail], elem) => {
    return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]]
  }, [[], []])
}

/**
 * Utility function for decoding Solidity's byte32 array.
 * @param fileReference
 */
export function decodeByteArray (fileReference: string[]): string {
  return fileReference
    .map(hexToAscii)
    .join('')
    .trim()
    .replace(/\0/g, '') // Remove null-characters
}

/**
 * Utility function that capitalize first letter of given string
 * @param value
 */
export function capitalizeFirstLetter (value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Takes Sets A and B and create a difference of those, which results in a subset of A, where
 * elements from set B are removed.
 * @param setA
 * @param setB
 */
export function setDifference<T> (setA: Set<T>, setB: Set<T>): Set<T> {
  const _difference = new Set(setA)
  for (const elem of setB) {
    _difference.delete(elem)
  }
  return _difference
}

/**
 * Function mainly for CLI that validates the given list of string if they are valid service's names
 * or if it is "all" (in case that is allowed).
 *
 * It returns the list of services. In case of "all" then it is expanded to list of all service's names.
 * @param args
 * @param onlyEnabledForAll
 */
export function validateServices (args: string[], onlyEnabledForAll = false): SupportedServices[] {
  if (args.length === 0) {
    throw new Error('You have to specify a service!')
  }

  if (args.length === 1 && args[0] === 'all') {
    if (!onlyEnabledForAll) {
      return Object.values(SupportedServices)
    }

    return Object.values(SupportedServices)
      .filter(service => config.get(`${service}.enabled`))
  }

  for (const service of args) {
    if (!isSupportedServices(service)) {
      throw new Error(`${service} is not valid service name!`)
    }
  }

  return args as SupportedServices[]
}

/**
 * General handler closure function mainly for Event Emitters, which in case of rejected promise logs the rejection
 * using given logger.
 *
 * @param fn
 * @param logger
 */
export function errorHandler (fn: (...args: any[]) => Promise<any>, logger: Logger): (...args: any[]) => Promise<any> {
  return (...args) => {
    return fn(...args).catch(err => logger.error(err))
  }
}

/**
 * Helper function which awaits on all the initializations Promises that are set on the `app` object.
 * @param app
 */
export async function waitForReadyApp (app: Application): Promise<void> {
  await app.get('storeInit')
  await app.get('sequelizeSync')
}

/**
 * Helper for wrapping events
 * @param {String} event
 * @param {Object} payload
 */
export function wrapEvent (event: string, payload: Record<string, any>) {
  return {
    event,
    payload
  }
}

export abstract class BaseCLICommand extends Command {
  static flags = {
    config: flags.string({
      description: 'path to JSON config file to load',
      env: 'RIFM_CONFIG'
    }),
    log: flags.string({
      description: 'what level of information to log',
      options: ['error', 'warn', 'info', 'verbose', 'debug'],
      default: 'warn',
      env: 'LOG_LEVEL'
    }),
    'log-filter': flags.string(
      {
        description: 'what components should be logged (+-, chars allowed)'
      }
    ),
    'log-path': flags.string(
      {
        description: 'log to file, default is STDOUT'
      }
    )
  }

  async loadConfig (configPath?: string): Promise<Config> {
    if (!configPath) {
      return {}
    }

    const data = await readFile(configPath, 'utf-8')
    return JSON.parse(data) as Config
  }

  async init (): Promise<void> {
    const { flags: originalFlags } = this.parse(this.constructor as Input<typeof BaseCLICommand.flags>)
    const flags = originalFlags as OutputFlags<typeof BaseCLICommand.flags>

    const logObject = {
      log:
        {
          level: flags.log,
          filter: flags['log-filter'] || null,
          path: flags['log-path'] || null
        }
    }

    const userConfig = await this.loadConfig(flags.config)

    config.util.extendDeep(config, userConfig)
    config.util.extendDeep(config, logObject)

    return Promise.resolve()
  }
}

type BackUpEntry = { name: string, block: { hash: string, number: BigNumber } }

function parseBackUps (backUpName: string): BackUpEntry {
  const [block] = backUpName.split('.')[0].split('-')
  const [hash, blockNumber] = block.split(':')

  return {
    name: backUpName,
    block: { number: new BigNumber(blockNumber), hash }
  }
}

function getBackUps (): BackUpEntry[] {
  const backupConfig = config.get<DbBackUpConfig>('dbBackUp')

  const backups = fs.readdirSync(path.resolve(__dirname, `../${backupConfig.path}`))

  if (backups.length) {
    return backups
      .map(parseBackUps)
      .sort(
        (a: Record<string, any>, b: Record<string, any>) =>
          a.block.number.gt(b.block.number) ? -1 : 1
      )
  }

  return []
}

export class DbBackUpJob {
  readonly newBlockEmitter: AutoStartStopEventEmitter
  readonly db: string
  readonly eth: Eth
  readonly backUpConfig: DbBackUpConfig

  constructor (eth: Eth) {
    if (!config.has('dbBackUp')) {
      throw new Error('DB Backup config not exist')
    }
    this.backUpConfig = config.get<DbBackUpConfig>('dbBackUp')
    this.db = config.get<string>('db')

    const eventEmittersConfirmations = this.getEventEmittersConfigs()
    const invalidConfirmation = eventEmittersConfirmations.find(c => c.config.confirmations && c.config.confirmations > this.backUpConfig.blocks)

    if (invalidConfirmation) {
      throw new Error(`Invalid db backup configuration. Number of backup blocks should be greater then confirmation blocks for ${invalidConfirmation.name} service`)
    }

    if (!fs.existsSync(this.backUpConfig.path)) {
      fs.mkdirSync(this.backUpConfig.path)
    }

    this.eth = eth
    this.newBlockEmitter = getNewBlockEmitter(eth)
  }

  /**
   * Back-up database if blocks condition met
   * @return {Promise<void>}
   * @param block
   */
  private async backupDb (block: BlockHeader): Promise<void> {
    const [lastBackUp, previousBackUp] = getBackUps()

    if (!lastBackUp || new BigNumber(block.number).minus(this.backUpConfig.blocks).gte(lastBackUp.block.number)) {
      // copy and rename current db
      await fs.promises.copyFile(this.db, path.resolve(this.backUpConfig.path, `${block.hash}:${block.number}-${this.db}`))

      // remove the oldest version
      if (previousBackUp) {
        await fs.promises.unlink(path.resolve(this.backUpConfig.path, previousBackUp.name))
      }
    }
  }

  /**
   * Restore database backup
   * @param {(message:any) => void} errorCallback
   * @return {Promise<void>}
   */
  public async restoreDb (errorCallback: (message: any) => void): Promise<void> {
    const backUps = getBackUps()
    const [_, oldest] = backUps

    if (backUps.length < 2) {
      errorCallback({ code: 1, message: 'Not enough backups' })
      throw new Error('Should be two backups to be able to restore')
    }

    // Check if back up block hash exist after reorg
    const block = await this.eth.getBlock(oldest.block.hash).catch(() => false)

    if (!block) {
      errorCallback({ code: 2, message: 'Invalid backup. Block Hash is not valid!' })
      throw new Error('Invalid backup. Block Hash is not valid!')
    }

    // remove current db
    await fs.promises.unlink(this.db)

    // restore backup
    await fs.promises.copyFile(path.resolve(this.backUpConfig.path, oldest.name), path.resolve(process.cwd(), this.db))
  }

  private getEventEmittersConfigs (): { config: EventsEmitterOptions, name: string }[] {
    return Object.values(SupportedServices)
      .reduce((acc: { config: EventsEmitterOptions, name: string }[], serviceName: string) => {
        if (config.has(serviceName) && config.get(`${serviceName}.enabled`)) {
          if (serviceName === SupportedServices.RNS) {
            const rnsEmitters = ['owner', 'reverse', 'placement']
              .reduce(
                (acc2: any[], contract: string) => {
                  if (config.has(`${serviceName}.${contract}.eventsEmitter`)) {
                    const emitterConfig = config.get<EventsEmitterOptions>(`${serviceName}.${contract}.eventsEmitter`)
                    return [...acc2, { config: emitterConfig, name: `${serviceName}.${contract}` }]
                  }
                  return acc2
                },
                []
              )
            return [...acc, ...rnsEmitters]
          }

          if (config.has(`${serviceName}.eventsEmitter`)) {
            const emitterConfig = config.get<EventsEmitterOptions>(`${serviceName}.eventsEmitter`)
            return [...acc, { config: emitterConfig, name: serviceName }]
          }
        }
        return acc
      }, [])
  }

  public run (): void {
    this.newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, this.backupDb.bind(this))
  }

  public stop (): void {
    this.newBlockEmitter.stop()
  }
}
