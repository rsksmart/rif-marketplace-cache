import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true
        }

        if(context.params.query.sellerAddress) {
          if(typeof context.params.query.sellerAddress === 'object') {
            Object.keys(context.params.query.sellerAddress).map(key => {
              context.params.query.sellerAddress[key] = context.params.query.sellerAddress[key].toLowerCase()
            })
          } else {
            context.params.query.sellerAddress = context.params.query.sellerAddress.toLowerCase()
          }
        }

        if(context.params.query.domainName) {
          const domainName = context.params.query.domainName
          context.params.sequelize['where'] = {
            '$domain.name$': domainName
          }
          delete context.params.query.domainName
        }

        context.params.query.status = 'ACTIVE'
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
