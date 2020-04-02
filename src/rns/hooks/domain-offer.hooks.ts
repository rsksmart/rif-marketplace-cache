import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

const intAttributes = ['paymentToken', 'cost']

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true
        }

        intAttributes.forEach(value => {
          if (context.params.query[value]) {
            context.params.query[value] = parseInt(context.params.query[value], 10)
          }
        })

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
