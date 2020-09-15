import { Op, literal, Sequelize } from 'sequelize'
import { HookContext } from '@feathersjs/feathers'
import { disallow, discard } from 'feathers-hooks-common'
import { hooks } from 'feathers-sequelize'

import { getStakesAggregateQuery } from '../models/offer.model'
import BillingPlan from '../models/billing-plan.model'
import Agreement from '../models/agreement.model'
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
      async (context: HookContext) => {
        if (context.params.query) {
          const { averagePrice, totalCapacity, periods, provider, $limit } = context.params.query
          const sequelize = context.app.get('sequelize') as Sequelize

          if (!$limit) {
            const aggregateLiteral = await getStakesAggregateQuery(sequelize, 'usd')
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
              attributes: [[aggregateLiteral, 'totalStakedUSD']],
              order: [literal('totalStakedUSD DESC'), ['plans', 'period', 'ASC']],
              where: {}
            }

            if (provider && provider.$like) {
              context.params.sequelize.where.provider = {
                [Op.like]: `%${provider.$like}%`
              }
            }

            if (averagePrice) {
              context.params.sequelize.where.averagePrice = {
                [Op.between]: [averagePrice.min, averagePrice.max]
              }
            }

            if (totalCapacity) {
              const minCap = sequelize.escape(totalCapacity.min)
              const maxCap = sequelize.escape(totalCapacity.max)
              const rawQ = `cast(totalCapacity as integer) BETWEEN ${minCap} AND ${maxCap}`
              context.params.sequelize.where.totalCapacity = literal(rawQ)
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
