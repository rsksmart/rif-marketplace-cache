import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

import { lowerCaseAddressesQueryParamsHook } from '../../utils'

const ADDRESSES_FIELDS = ['consumer', 'tokenAddress', 'offerId']

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false
        }
      },
      lowerCaseAddressesQueryParamsHook(ADDRESSES_FIELDS)
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
