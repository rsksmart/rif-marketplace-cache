import { HookContext } from '@feathersjs/feathers'
import { disallow, discardQuery } from 'feathers-hooks-common'
import { Op } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'
import Domain from '../models/domain.model'
import Transfer from '../models/transfer.model'

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
      }
    ],
    find: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [
            { model: Domain, attributes: ['tokenId', 'name'] },
            {
              model: Transfer,
              attributes: ['sellerAddress', 'newOwnerAddress'],
              where: {
                sellerAddress: context.params.route?.ownerAddress.toLowerCase()
              }
            }
          ]
        }
        const { params: { sequelize: { include }, domain } } = context

        if (domain && include) {
          const { name: { $like: searchTerm } } = domain
          include.where = {
            [Op.or]: {
              name: {
                [Op.like]: `%${searchTerm}%`
              },
              tokenId: {
                [Op.eq]: numberToHex(((sha3(searchTerm)) as string))
              }
            }
          }
        }

        discardQuery('domain')
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
