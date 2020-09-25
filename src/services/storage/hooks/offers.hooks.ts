import config from 'config'
import { HookContext } from '@feathersjs/feathers'
import { disallow, discard } from 'feathers-hooks-common'
import { hooks } from 'feathers-sequelize'
import { Op, literal, Sequelize } from 'sequelize'

import BillingPlan from '../models/billing-plan.model'
import Agreement from '../models/agreement.model'
import Offer, { getBillingPriceAvgQuery, getStakesAggregateQuery } from '../models/offer.model'
import dehydrate = hooks.dehydrate

/**
 * This hook will add an array of support currencies to each offer in query result
 * @param context
 */
function supportCurrenciesHook (context: HookContext): HookContext {
  const tokens = config.get<Record<string, string>>('storage.tokens')
  context.result.forEach((offer: Offer & { acceptedCurrencies: string[] }) => {
    offer.acceptedCurrencies = Array.from(new Set(offer.plans.map(plan => tokens[plan.token])))
  })
  return context
}

/**
 * average price filter query
 * @param sequelize
 * @param context
 * @param averagePrice
 */
function averagePriceFilter (
  sequelize: Sequelize,
  context: HookContext,
  averagePrice: { min: number | string, max: number | string }
): void {
  const minPrice = sequelize.escape(averagePrice.min)
  const maxPrice = sequelize.escape(averagePrice.max)
  const rawQ = `avgBillingPrice BETWEEN ${minPrice} AND ${maxPrice}`
  context.params.sequelize.where[Op.and] = [literal(rawQ)]
}

/**
 * total capacity filter query
 * @param sequelize
 * @param context
 * @param totalCapacity
 */
function totalCapacityFilter (
  sequelize: Sequelize,
  context: HookContext,
  totalCapacity: { min: number | string, max: number | string }
): void {
  const minCap = sequelize.escape(totalCapacity.min)
  const maxCap = sequelize.escape(totalCapacity.max)
  const rawQ = `cast(totalCapacity as integer) BETWEEN ${minCap} AND ${maxCap}`
  context.params.sequelize.where.totalCapacity = literal(rawQ)
}

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
        if (context.params.query && !context.params.query.$limit) {
          const { averagePrice, totalCapacity, periods, provider } = context.params.query
          const sequelize = context.app.get('sequelize')

          const aggregateLiteral = await getStakesAggregateQuery(sequelize, 'usd')
          const avgBillingPlanPriceUsdQuery = await getBillingPriceAvgQuery(sequelize, 'usd')

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
              attributes: [[avgBillingPlanPriceUsdQuery, 'avgBillingPrice'], [aggregateLiteral, 'totalStakedUSD']],
              order: [literal('totalStakedUSD DESC')],
              where: {}
            }

          if (provider && provider.$like) {
            context.params.sequelize.where.provider = {
              [Op.like]: `%${provider.$like}%`
            }
          }

          if (averagePrice) {
            averagePriceFilter(sequelize, context, averagePrice)
          }

          if (totalCapacity) {
            totalCapacityFilter(sequelize, context, totalCapacity)
          }

          if (periods?.length) {
            context.params.sequelize.where['$plans.period$'] = { [Op.in]: periods }
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
    find: [supportCurrenciesHook],
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
