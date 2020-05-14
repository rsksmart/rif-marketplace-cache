import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

import Domain from '../models/domain.model'
import { Op } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [Domain]
        }

        if (!context.params.query) {
          context.params.query = {}
        }

        if (context.params.route?.ownerAddress) {
          context.params.query.sellerAddress = context.params.route.ownerAddress.toLowerCase()
        }
      }
    ],
    find: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: {
            model: Domain
          }
        }
        const { params: { sequelize: { include } } } = context
        const { domain } = context.params.query as any

        if (include && domain) {
          const { name: { $like } } = domain
          include.where = {
            [Op.or]: {
              name: {
                [Op.like]: `%${$like}%`
              },
              tokenId: {
                [Op.eq]: numberToHex(((sha3($like)) as string))
              }
            }
          }
        }

        delete (context.params.query as any).domain
      }
    ],
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
