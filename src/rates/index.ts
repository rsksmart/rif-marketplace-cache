import { Service } from 'feathers-sequelize'
import config from 'config'

import { Application, CachedService, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'
import hooks from './hooks'
import Rate from './rates.model'
import { updater } from './update'
import { Observable } from 'rxjs'

export class RatesService extends Service {
}

const SERVICE_NAME = 'rates'
const CONFIG_UPDATE_PERIOD = 'rates.refresh'
const logger = loggingFactory(SERVICE_NAME)

const rates: CachedService = {
  // eslint-disable-next-line require-await
  async initialize (app: Application): Promise<{ stop: () => void }> {
    logger.info('Rates service: initialization')

    // Initialize feather's service
    app.use(ServiceAddresses.XR, new RatesService({ Model: Rate }))
    const service = app.service(ServiceAddresses.XR)
    service.hooks(hooks)

    // Init rates
    await updater().catch(logger.error)

    // Start periodical refresh
    const updatePeriod = config.get<number>(CONFIG_UPDATE_PERIOD) * 1000 // Converting seconds to ms
    const intervalId = setInterval(() => updater().catch(logger.error), updatePeriod)

    return { stop: () => clearInterval(intervalId) }
  },

  async purge (): Promise<void> {
    const rateCount = await Rate.destroy({ truncate: true, cascade: true })
    logger.info(`Removed ${rateCount} rates from database.`)
  },

  precache (): Observable<string> {
    return new Observable<string>(subscriber => {
      updater().then(() => subscriber.complete())
    })
  }
}

export default rates
