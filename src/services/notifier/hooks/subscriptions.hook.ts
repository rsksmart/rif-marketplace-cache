import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { literal } from 'sequelize'
import PlanModel from '../models/plan.model'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false
        }
        return context
      }
    ],
    find: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [
            {
              model: PlanModel,
              as: 'plan',
              where: literal('plan.id = subscriptionPlanId')
            }
          ],
          attributes: { exclude: ['subscriptionPlanId'] }
        }
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
