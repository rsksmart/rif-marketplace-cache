import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { Op } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'
import DomainOffer from '../models/domain-offer.model'
import DomainExpiration from '../models/expiration.model'
import DomainOwner from '../models/owner.model'

export default {
  before: {
    all: [
      (context: HookContext): HookContext => {
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

        return context
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
      (context: HookContext): HookContext => {
        if (context.params.query) {
          const { ownerAddress, placed, name } = context.params.query

          if (!ownerAddress) {
            throw new Error('No ownerAddress specified.')
          }

          context.params.sequelize = {
            raw: false,
            nest: true,
            include: [
              {
                model: DomainExpiration,
                attributes: ['date']
              },
              {
                model: DomainOwner,
                attributes: ['address'],
                where: {
                  address: ownerAddress.toLowerCase()
                }
              },
              {
                model: DomainOffer,
                attributes: placed ? ['paymentToken', 'priceString'] : [],
                as: 'offers',
                required: false
              }
            ],
            where: {
              '$offers.tokenId$': placed
                ? { [Op.not]: null }
                : { [Op.is]: null }
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
        }

        return context
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
