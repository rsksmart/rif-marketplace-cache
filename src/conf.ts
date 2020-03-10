import { Application } from './types'
import config from 'config'
import Conf from 'conf'
import { factory as logFactory } from './logger'

const logger = logFactory('conf')

export interface ConfOptions {
  host: string
  port: number
  log?: {
    level?: string
    filter?: string
    path?: string
  }
  blockchain: {
    provider: string
    pinningContractAddress: string
    startingBlock: string | number
    eventsEmitter?: {
      polling: boolean
      pollingInterval?: number
      confirmations?: number
    }
  }
  newBlockEmitter: {
    polling: boolean
    pollingInterval?: number
  }
}

export default function factory (): Conf {
  const configName = config.get<string>('conf.name')

  return new Conf<ConfOptions>({ configName })
}

export function configure (app: Application): void {
  if (!config.get('conf.persist')) {
    logger.info('Clearing all persisted configuration.')

    factory().clear()
  }
}
