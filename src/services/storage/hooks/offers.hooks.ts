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
          const { averagePrice, totalCapacity, periods, $limit } = context.params.query

          if (!$limit) {
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
              order: [['plans', 'period', 'ASC']]
            }

            if ((averagePrice || totalCapacity)) {
              context.params.sequelize.where = {
                averagePrice: averagePrice && {
                  [Op.between]: [averagePrice.min, averagePrice.max]
                },
                totalCapacity: totalCapacity && {
                  [Op.between]: [totalCapacity.min, totalCapacity.max]
                }
              }
            }

            if (periods?.length) {
              context.params.sequelize.where['$plans.period$'] = { [Op.in]: periods }
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
