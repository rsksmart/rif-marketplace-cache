import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { getLastUpdateTimestamp, updater } from './update'
import config from 'config'
import { loggingFactory } from '../logger'

const logger = loggingFactory('rates:hooks')
const CONFIG_UPDATE_PERIOD = 'rates.refresh'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false
        }

        const updatePeriod = config.get<number>(CONFIG_UPDATE_PERIOD) * 1000 // Conversion from seconds to milliseconds
        const lastUpdate = getLastUpdateTimestamp()
        logger.debug(`Checking last update: ${Date.now()} >= ${lastUpdate} + ${updatePeriod}`)

        if (Date.now() >= lastUpdate + updatePeriod) {
          // We deliberately are not awaiting for the update to
          // finish in order to not block the execution. Instead the updated
          // data will be ready for next requests.
          updater()
            .catch(logger.error)
        }
      }
    ],
    find: [],
    get: disallow(),
    create: disallow(),
    update: disallow(),
    patch: disallow(),
    remove: disallow()
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
