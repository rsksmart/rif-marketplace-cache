import { Application } from './declarations'
import config from 'config'
import Conf from 'conf'
import { factory } from './logger'

const logger = factory('conf')

export default function conf (app: Application): void {
  if (!config.get('persistConf')) {
    logger.info('Clearing all persisted configuration.')
    new Conf().clear()
  }
}
