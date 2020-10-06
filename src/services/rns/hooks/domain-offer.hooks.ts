import { HookContext } from '@feathersjs/feathers'
import { disallow, discardQuery } from 'feathers-hooks-common'
import { Op } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'
import Domain from '../models/domain.model'
import DomainExpiration from '../models/expiration.model'

const paginate = (context: HookContext): void => {
  const paginate = context.params.query?.paginate

  if (typeof paginate !== 'undefined') {
    context.params.paginate = paginate
    delete context.params.query?.paginate
  }
}

export default {
  before: {
    all: [
      (context: HookContext): void => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          scope: 'approved',
          include: {
            model: Domain,
            include: {
              model: DomainExpiration,
              attributes: ['date']
            }
          }
        }

        if (!context.params.query) {
          context.params.query = {}
        }
      }
    ],
    find: [
      paginate,
      (context: HookContext): void => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          scope: 'approved',
          attributes: {
            exclude: ['price', 'approved']
          },
          include: {
            model: Domain,
            include: {
              model: DomainExpiration,
              attributes: ['date']
            }
          }
        }
        const { params: { sequelize: { include } } } = context
        const domain = context.params.query?.domain

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
      },
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
