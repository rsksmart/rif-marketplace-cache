import { HookContext } from '@feathersjs/feathers'
import BillingPlan from './models/price.model'
import Agreement from './models/agreement.model'
import { disallow } from 'feathers-hooks-common'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          include: [BillingPlan, Agreement],
          nest: true
        }

        if (context.params?.query?.['non-active']) {
          delete context.params?.query?.['non-active']
        } else {
          context.params.sequelize.scope = 'active'
        }
      }
    ],
    find: [],
    get: [],
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
