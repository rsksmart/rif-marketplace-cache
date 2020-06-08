import { HookContext } from '@feathersjs/feathers'
import { disallow, discardQuery } from 'feathers-hooks-common'

import Domain from '../models/domain.model'
import { Op } from 'sequelize'
import { sha3, numberToHex } from 'web3-utils'
import DomainExpiration from '../models/expiration.model'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
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
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: {
            model: Domain,
            include: {
              model: DomainExpiration,
              attributes: ['date']
            }
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
