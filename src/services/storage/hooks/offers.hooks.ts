import { HookContext } from '@feathersjs/feathers'
import BillingPlan from '../models/billing-plan.model'
import { disallow, discard } from 'feathers-hooks-common'
import Agreement from '../models/agreement.model'
import { hooks } from 'feathers-sequelize'
import { Op } from 'sequelize'
import dehydrate = hooks.dehydrate

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          include: [BillingPlan, Agreement],
          nest: true
        }

        if (context.params?.query?.['non-active']) {
          delete context.params?.query?.['non-active']
        } else {
          context.params.sequelize.scope = 'active'
        }
      }
    ],
    find: [
      (context: HookContext) => {
        if (context.params.query) {
          const { averagePrice, totalCapacity, periods } = context.params.query

          if (!(averagePrice || totalCapacity || periods)) return
          context.params.sequelize = {
            raw: false,
            nest: true,
            include: [
              {
                model: BillingPlan,
                as: 'plans'
              },
              {
                model: Agreement
              }
            ],
            where: {
              '$plans.period$': periods?.length
                ? { [Op.in]: periods } : true,
              averagePrice,
              totalCapacity
            }
          }
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
    all: [dehydrate(), discard('agreements')],
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
