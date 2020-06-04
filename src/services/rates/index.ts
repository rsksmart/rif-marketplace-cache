import { Service } from 'feathers-sequelize'
import config from 'config'

import { Application, CachedService, ServiceAddresses } from '../../definitions'
import { loggingFactory } from '../../logger'
import hooks from './rates.hooks'
import Rate from './rates.model'
import { updater } from './update'

export class RatesService extends Service {
}

const SERVICE_NAME = 'rates'
const CONFIG_UPDATE_PERIOD = 'rates.refresh'
const logger = loggingFactory(SERVICE_NAME)

const storage: CachedService = {
  // eslint-disable-next-line require-await
  async initialize (app: Application): Promise<void> {
    if (!config.get<boolean>('rates.enabled')) {
      logger.info('Rates service: disabled')
      return
    }
    logger.info('Rates service: enabled')

    // Initialize feather's service
    app.use(ServiceAddresses.XR, new RatesService({ Model: Rate }))
    const service = app.service(ServiceAddresses.XR)
    service.hooks(hooks)

    // Start periodical refresh
    const updatePeriod = config.get<number>(CONFIG_UPDATE_PERIOD) * 1000 // Converting seconds to ms
    setInterval(() => updater().catch(logger.error), updatePeriod)
  },

  async purge (): Promise<void> {
    const rateCount = await Rate.destroy({ truncate: true, cascade: true })
    logger.info(`Removed ${rateCount} rates from database.`)
  },

  precache (): Promise<void> {
    return updater()
  }
}

export default storage
