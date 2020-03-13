import { Application } from './types'
import config from 'config'
import Conf from 'conf'
import { factory as logFactory } from './logger'

const logger = logFactory('conf')

export interface ConfOptions {
  storage: {
    lastProcessedBlock: number
  }
}

export default function factory (): Conf {
  const configName = config.get<string>('conf.name')

  return new Conf<ConfOptions>({ configName })
}

export function configure (): void {
  if (!config.get('conf.persist')) {
    logger.info('Clearing all persisted configuration.')

    factory().clear()
  }
}
