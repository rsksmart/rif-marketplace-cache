import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

import Domain from '../models/domain.model'
import { Op } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'
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
        const { domain } = context.params.query as any
        let nameSearch

        if (domain) {
          nameSearch = {
            [Op.or]: {
              name: {
                [Op.like]: `%${domain}%`
              },
              tokenId: {
                [Op.eq]: numberToHex(((sha3(domain)) as string))
              }
            }
          }
        }

        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [
            { model: Domain, attributes: ['tokenId', 'name', 'expirationDate'], where: nameSearch },
            {
              model: Transfer,
              attributes: ['sellerAddress', 'newOwnerAddress'],
              where: {
                sellerAddress: context.params.route?.ownerAddress
              }
            }
          ]
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
