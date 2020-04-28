import config from 'config'
import Conf from 'conf'
import { loggingFactory as logFactory } from './logger'

const logger = logFactory('conf')

export interface ConfOptions {
  storage: {
    lastProcessedBlock: number
  }
  rates: {
    lastUpdate: number
  }
}

export function confFactory (): Conf {
  const configName = config.get<string>('conf.name')

  return new Conf<ConfOptions>({ configName })
}

export function configure (): void {
  if (!config.get('conf.persist')) {
    logger.info('Clearing all persisted configuration.')

    confFactory().clear()
  }
}
