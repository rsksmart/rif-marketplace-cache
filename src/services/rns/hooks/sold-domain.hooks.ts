import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
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
        const { params: { query } } = context
        const sellerAddress = query?.ownerAddress.toLowerCase()

        if (!sellerAddress) { return Promise.reject(new Error('No ownerAddress specified.')) }

        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [
            { model: Domain, attributes: ['tokenId', 'name'] },
            {
              model: Transfer,
              attributes: ['sellerAddress', 'buyerAddress'],
              where: {
                sellerAddress
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

        context.params.query = {}
      }
    ],
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
