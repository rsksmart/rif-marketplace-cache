import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

import Domain from '../models/domain.model'
import { Op } from 'sequelize'

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

        context.params.query.status = 'ACTIVE'
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

        if ((context.params.query as any).domain) {
          delete (context.params.query as any).domain
        }

        if (include && domain) {
          const { name: { $like } } = domain
          include.where = {
            name: {
              [Op.like]: $like
            }
          }
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
