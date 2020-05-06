import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

import Domain from '../models/domain.model'
import { setSellerAddressParamHook } from './utils'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [Domain]
        }
      }
    ],
    find: [setSellerAddressParamHook],
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
