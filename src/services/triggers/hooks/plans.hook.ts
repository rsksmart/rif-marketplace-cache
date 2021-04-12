import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { literal, Op, Sequelize } from 'sequelize'
import { scopes } from '../models/plan.model'
import PriceModel from '../models/price.model'
import TriggersChannelModel from '../models/triggersChannel.model'
import { findLimits } from '../utils/plansHookUtils'

export default {
  before: {
    all: [],
    find: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          scope: scopes.active,
          include: [
            {
              model: TriggersChannelModel,
              as: 'channels',
              attributes: ['name'],
              required: true
            },
            {
              model: PriceModel,
              as: 'prices',
              required: true,
              attributes: ['price', 'rateId']
            }
          ],
          attributes: {
            include: [
              [
                literal('(SELECT url FROM triggers_provider AS provider WHERE PlanModel.providerId = provider.provider)'),
                'url'
              ]
            ]
          },
          order: [],
          where: {}
        }

        return context
      },
      async (context: HookContext) => {
        if (!context.params.query) return context

        const { limits, ...query } = context.params.query

        if (limits) return await findLimits(limits, context)

        const paramsSeq = context.params.sequelize
        const {
          currency,
          size,
          channels,
          price,
          provider
        } = query

        if (channels?.length) {
          paramsSeq.include = [
            ...paramsSeq.include,
            {
              model: TriggersChannelModel,
              as: 'channels',
              required: true,
              attributes: ['name'],
              where: {
                name: channels
              }
            }
          ]
        }

        if (size) {
          const { min, max } = size
          paramsSeq.where = {
            ...paramsSeq.where,
            quantity: {
              [Op.between]: [min, max]
            }
          }
        }
        const priceInclude = {
          model: PriceModel,
          as: 'prices',
          required: true,
          attributes: {},
          where: {}
        }

        if (currency?.length) {
          priceInclude.where = { rateId: currency }
        }

        if (price) {
          const { min, max, fiatSymbol } = price
          const sequelize: Sequelize = context.app.get('sequelize')
          const minLimit = sequelize.escape(min)
          const maxLimit = sequelize.escape(max)

          priceInclude.attributes = {
            include: [[literal(`(SELECT ${fiatSymbol} FROM rates WHERE prices.rateId = rates.token)`), 'rate']]
          }

          paramsSeq.include = [
            ...paramsSeq.include,
            priceInclude
          ]

          paramsSeq.where[Op.and] = [
            ...paramsSeq.where[Op.and] || [],
            literal(`CAST(CAST(prices.price as REAL) / 1000000000000000000 * COALESCE("prices.rate", 0) as REAL) BETWEEN ${minLimit} AND ${maxLimit}`)
          ]
        }

        if (provider) {
          paramsSeq.where[Op.and] = [
            ...paramsSeq.where[Op.and] || [],
            literal(`providerId LIKE "${provider}"`)
          ]
        }

        context.params = {
          ...context.params,
          query,
          sequelize: paramsSeq
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
