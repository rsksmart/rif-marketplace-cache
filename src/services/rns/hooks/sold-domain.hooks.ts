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
        const { params: { query } } = context
        const sellerAddress = query?.ownerAddress.toLowerCase()
        const domain = query?.domain

        if (!sellerAddress) {
          throw new Error('No ownerAddress specified.')
        }

        const includeDomain = { model: Domain, attributes: ['tokenId', 'name'], where: {} }
        const includeTransfer = {
          model: Transfer,
          attributes: ['sellerAddress', 'buyerAddress'],
          where: { sellerAddress }
        }

        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [includeDomain, includeTransfer]
        }

        if (domain) {
          const { name: { $like: searchTerm } } = domain
          includeDomain.where = {
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
      },
      discardQuery('ownerAddress'),
      discardQuery('domain')
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
