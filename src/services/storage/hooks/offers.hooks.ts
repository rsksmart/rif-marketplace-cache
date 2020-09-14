import { Op, literal, Sequelize } from 'sequelize'
import { HookContext } from '@feathersjs/feathers'
import { disallow, discard } from 'feathers-hooks-common'
import { hooks } from 'feathers-sequelize'

import { SUPPORTED_TOKENS_SYMBOLS } from '../handlers/stake'
import BillingPlan from '../models/billing-plan.model'
import StakeModel from '../models/stake.model'
import Rate from '../../rates/rates.model'
import Agreement from '../models/agreement.model'
import dehydrate = hooks.dehydrate

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          include: [BillingPlan, Agreement, StakeModel],
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

          if (!$limit) {
            const rates = await Rate.findAll()
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
                },
                {
                  model: StakeModel,
                  as: 'stakes'
                }
              ],
              attributes: [
                literal(`
                  SUM(
                    case
                      ${SUPPORTED_TOKENS_SYMBOLS.reduce(
                        (acc, el) => {
                          const rate = rates.find(r => r.token === el)?.usd || 0
                          return `${acc} \n when stakes.symbol = ${el} then cast(stakes.total as integer) * ${rate}`
                        },
                        ''
                      )}
                      else 0
                    end
                  ) as totalStakeUSD
                `)
              ],
              order: [['totalStakeUSD', 'ASC'], ['plans', 'period', 'ASC']],
              groupBy: ['storage_offer.provider'],
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
              const sequelize = context.app.get('sequelize') as Sequelize
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
