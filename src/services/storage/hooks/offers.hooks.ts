import { HookContext } from '@feathersjs/feathers'
import { disallow, discard } from 'feathers-hooks-common'
import { hooks } from 'feathers-sequelize'
import { Op, literal, Sequelize } from 'sequelize'

import BillingPlan from '../models/billing-plan.model'
import Agreement from '../models/agreement.model'
import { lowerCaseAddressesQueryParamsHook } from '../../utils'
import Offer, { getAvailableCapacityQuery, getBillingPriceAvgQuery, getStakesAggregateQuery } from '../models/offer.model'
import dehydrate = hooks.dehydrate

/**
 * This hook will sort billing plans array by period ASC
 * @param context
 */
function sortBillingPlansHook (context: HookContext): HookContext {
  context.result.forEach((offer: Offer & { acceptedCurrencies: string[] }) => {
    offer.plans = offer.plans
      .sort((planA, planB) => planA.period.minus(planB.period).toNumber())
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
  // We should use Op.and to prevent overwriting the scope values
  context.params.sequelize.where[Op.and] = [
    ...context.params.sequelize.where[Op.and] || [],
    literal(rawQ)
  ]
}

/**
 * available capacity filter query
 * @param sequelize
 * @param context
 * @param availableCapacity
 */
function availableCapacityFilter (
  sequelize: Sequelize,
  context: HookContext,
  availableCapacity: { min: number | string, max: number | string }
): void {
  const minCap = sequelize.escape(availableCapacity.min)
  const maxCap = sequelize.escape(availableCapacity.max)
  const rawQ = `cast(availableCapacity as integer) BETWEEN ${minCap} AND ${maxCap}`
  // We should use Op.and to prevent overwriting the scope values
  context.params.sequelize.where[Op.and] = [
    ...context.params.sequelize.where[Op.and] || [],
    literal(rawQ)
  ]
}

const ADDRESSES_FIELDS = ['provider']

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          include: [BillingPlan, Agreement],
          nest: true
        }

        if (context.params?.query?.withInactive) {
          delete context.params?.query?.withInactive
        } else {
          context.params.sequelize.scope = 'active'
        }
      },
      lowerCaseAddressesQueryParamsHook(ADDRESSES_FIELDS)
    ],
    find: [
      (context: HookContext) => {
        if (context.params.query && !context.params.query.$limit) {
          const {
            averagePrice,
            totalCapacity,
            periods,
            provider,
            availableCapacity
          } = context.params.query
          const sequelize = context.app.get('sequelize')

          context.params.sequelize = {
            ...context.params.sequelize,
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
            attributes: {
              include: [
                [getBillingPriceAvgQuery(sequelize, 'usd'), 'avgBillingPrice'],
                [getStakesAggregateQuery(sequelize, 'usd'), 'totalStakedUSD'],
                [getAvailableCapacityQuery(), 'availableCapacity']
              ]
            },
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

          if (periods?.length) {
            context.params.sequelize.where['$plans.period$'] = { [Op.in]: periods }
          }

          if (availableCapacity) {
            availableCapacityFilter(sequelize, context, availableCapacity)
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
    find: [sortBillingPlansHook],
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
