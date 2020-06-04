import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { Op } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'
import DomainOffer from '../models/domain-offer.model'
import DomainExpiration from '../models/expiration.model'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true
        }

        if (!context.params.query) {
          context.params.query = {}
        }

        if (context.params.route?.ownerAddress) {
          context.params.query.ownerAddress = context.params.route.ownerAddress.toLowerCase()
        }
      }
    ],
    find: [
      (context: HookContext): HookContext => {
        if (!context.params.query) {
          context.params.query = {}
        }

        if (context.params.route?.ownerAddress) {
          context.params.query.ownerAddress = context.params.route.ownerAddress.toLowerCase()
        }
        return context
      },
      (context: HookContext) => {
        if (context.params.query) {
          const { ownerAddress, placed, name } = context.params.query

          context.params.sequelize = {
            raw: false,
            nest: true,
            include: [
              {
                model: DomainExpiration,
                attributes: ['expirationDate']
              },
              {
                model: DomainOffer,
                as: 'offers',
                required: false
              }
            ],
            where: {
              '$offers.tokenId$': placed
                ? { [Op.not]: null }
                : { [Op.is]: null },
              ownerAddress
            }
          }

          if (name) {
            const { $like: nameFilter } = name
            context.params.sequelize.where = {
              ...context.params.sequelize.where,
              [Op.or]: {
                name: {
                  [Op.like]: `%${nameFilter}%`
                },
                tokenId: {
                  [Op.eq]: numberToHex(((sha3(nameFilter)) as string))
                }
              }
            }
          }
          delete (context.params.query as any).status
          delete (context.params.query as any).name
        }
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
