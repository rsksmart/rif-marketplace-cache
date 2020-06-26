import { Command, flags } from '@oclif/command'
import { Input, OutputFlags } from '@oclif/parser'
import { readFile as readFileCb } from 'fs'
import { promisify } from 'util'
import config from 'config'
import { hexToAscii } from 'web3-utils'

import { Application, Config, isSupportedServices, Logger, SupportedServices } from './definitions'

const readFile = promisify(readFileCb)

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
export function errorHandler (fn: (...args: any[]) => Promise<void>, logger: Logger): (...args: any[]) => Promise<void> {
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

  async loadConfig (path?: string): Promise<Config> {
    if (!path) {
      return {}
    }

    const data = await readFile(path, 'utf-8')
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
