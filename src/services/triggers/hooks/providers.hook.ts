import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { Application } from '../../../definitions'
import { loggingFactory } from '../../../logger'
import { lowerCaseAddressesQueryParamsHook } from '../../utils'
import { updater } from '../update'

// const ADDRESSES_FIELDS = ['token', 'account']

const updatePlans = (context: HookContext) => {
  const { url } = context.data
  const app: Application = context.app as Application
  const logger = loggingFactory('triggers.after.create')
  logger.info(`Updating provider plans from url ${url}...`)

  updater(app, url).catch(logger.error)
}

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false
        }
      }
      // lowerCaseAddressesQueryParamsHook(ADDRESSES_FIELDS)
    ],
    find: [],
    get: [],
    create: disallow('external'),
    update: disallow('external'),
    patch: disallow('external'),
    remove: disallow('external')
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [updatePlans],
    update: [updatePlans],
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
