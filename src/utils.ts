import { Command, flags } from '@oclif/command'
import { Input, OutputFlags } from '@oclif/parser'
import { readFile as readFileCb } from 'fs'
import { promisify } from 'util'
import config from 'config'

import { Config, Store } from './types'
import { isSupportedServices, SupportedServices } from './app'

const readFile = promisify(readFileCb)

export async function asyncFilter<T> (arr: Array<T>, callback: (elem: T) => Promise<boolean>): Promise<Array<T>> {
  const fail = Symbol('async-filter-fail')
  const mappedArray = await Promise.all(arr.map(async item => (await callback(item)) ? item : fail))
  return mappedArray.filter(i => i !== fail) as T[]
}

export function scopeStore (store: Store, prefix: string): Store {
  return {
    get (key: string): any {
      return store.get(`${prefix}.${key}`)
    },

    set (key: string, value: any): void {
      store.set(`${prefix}.${key}`, value)
    }
  }
}

export function capitalizeFirstLetter (value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function validateServices (args: string[]): SupportedServices[] {
  if (args.length === 0) {
    throw new Error('You have to specify a service!')
  }

  if (args.length === 1 && args[0] === 'all') {
    return Object.values(SupportedServices)
  }

  for (const service of args) {
    if (!isSupportedServices(service)) {
      throw new Error(`${service} is not valid service name!`)
    }
  }

  return args as SupportedServices[]
}

export abstract class BaseCLICommand extends Command {
  static flags = {
    config: flags.string({
      description: 'path to JSON config file to load',
      env: 'RIFM_CONFIG'
    }),
    log: flags.string({
      description: 'what level of information to log',
      options: ['error', 'warn', 'info', 'debug'],
      default: 'error',
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
