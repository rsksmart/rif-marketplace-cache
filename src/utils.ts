import { Command, flags } from '@oclif/command'
import { Input, OutputFlags } from '@oclif/parser'
import { promisify } from 'util'
import config from 'config'
import fs from 'fs'
import { hexToAscii } from 'web3-utils'
import BigNumber from 'bignumber.js'
import path from 'path'

import {
  Application,
  Config,
  isSupportedServices,
  Logger,
  SupportedServices
} from './definitions'
import { AsyncRetryError } from './errors'

const readFile = promisify(fs.readFile)

/**
 * Promise retry
 */
export async function asyncRetry<T> (
  fn: () => Promise<T>,
  retriesLeft: number,
  interval: number,
  exponential = false
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retriesLeft) {
      await new Promise(resolve => setTimeout(resolve, interval))
      return asyncRetry(
        fn,
        retriesLeft - 1,
        exponential ? interval * 2 : interval,
        exponential
      )
    } else throw new AsyncRetryError(`Max retries reached for function ${fn.name}`)
  }
}

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
  await app.get('commsInit')
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

export function waitForConfigure (app: Application, configure: (app: Application) => Promise<any>): Promise<any> {
  let promise: Promise<void>
  app.configure(app => {
    promise = configure(app)
  })

  return promise!
}

/**
 * Resolve given path using dataDir configuration.
 * @param paths relative or absolute paths. If absolute then no resolution is performed and it is returned as passed. If nothing is passed then the dataDir is returned.
 */
export function resolvePath (...paths: string[]): string {
  // Heavily using feature of path.resolve() that returns the first absolute path it gets when processing from right to left.
  // Hence if ...paths already have absolute path, it won't even get to the dataDir or __dirname.
  // Also if dataDir is already absolute then it won't get to __dirname.
  // See its documentation to understand it better: https://nodejs.org/api/path.html#path_path_resolve_paths
  return path.resolve(__dirname, '..', config.get('dataDir'), ...paths)
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
