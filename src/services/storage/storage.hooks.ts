import { HookContext } from '@feathersjs/feathers'
import Price from './models/price.model'
import Request from './models/request.model'
import { disallow } from 'feathers-hooks-common'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          include: [Price, Request],
          nest: true
        }

        if (!context.params.query || !context.params.query['not-completed']) {
          context.params.sequelize.scope = 'active'
        } else {
          delete context.params.query['not-completed']
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
