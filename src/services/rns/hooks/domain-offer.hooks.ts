import { HookContext } from '@feathersjs/feathers'
import { disallow, discardQuery } from 'feathers-hooks-common'
import { hooks } from 'feathers-sequelize'
import { literal, Op, Sequelize } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'
import { WEI } from '../../storage/utils'
import DomainOffer, { getDomainPriceFiat } from '../models/domain-offer.model'
import Domain from '../models/domain.model'
import DomainExpiration from '../models/expiration.model'
import { getSortDirection } from './utils'
import dehydrate = hooks.dehydrate

/**
 * Price in fiat filter query
 * @param sequelize
 * @param context
 * @param priceLimits
 */
function priceFiatFilter (
  sequelize: Sequelize,
  context: HookContext,
  priceLimits: { $gte: number | string, $lte: number | string }
): void {
  const minPrice = sequelize.escape(priceLimits.$gte)
  const maxPrice = sequelize.escape(priceLimits.$lte)
  const rawQ = `priceFiat BETWEEN ${minPrice} AND ${maxPrice}`
  // We should use Op.and to prevent overwriting the scope values
  context.params.sequelize.where[Op.and] = [
    ...context.params.sequelize.where[Op.and] || [],
    literal(rawQ)
  ]
}

const paginate = (context: HookContext): HookContext => {
  const paginateOverride = context.params.query?.paginate

  if (typeof paginate !== 'undefined') {
    context.params.paginate = paginateOverride
    discardQuery('paginate')(context)
  }

  return context
}

export default {
  before: {
    all: [
      (context: HookContext): HookContext => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          scope: 'approved',
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

        return context
      }
    ],
    find: [
      paginate,
      (context: HookContext): HookContext => {
        if (!context.params.query) return context

        const {
          $sort,
          fiatSymbol,
          domain,
          priceFiat
        } = context.params.query
        const sequelize = context.app.get('sequelize')

        context.params.sequelize = {
          ...context.params.sequelize,
          raw: false,
          nest: true,
          scope: 'approved',
          include: {
            model: Domain,
            include: {
              model: DomainExpiration,
              attributes: ['date']
            }
          },
          attributes: {
            exclude: ['price', 'approved'],
            include: [[getDomainPriceFiat(sequelize, fiatSymbol), 'priceFiat']]
          },
          order: [],
          where: {}
        }

        if ($sort) {
          const {
            priceFiat,
            domain
          } = $sort

          if (priceFiat) {
            const sqlOrderBy = `priceFiat ${getSortDirection(priceFiat)}`
            context.params.sequelize.order.push(literal(sqlOrderBy))
          }

          if (domain) {
            context.params.sequelize.order.push([
              {
                model: Domain,
                as: 'domain'
              }, 'name', getSortDirection(domain.name)
            ])
          }
        }

        if (domain) {
          const { name: { $like } } = domain
          context.params.sequelize.include.where = {
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

        if (priceFiat) {
          priceFiatFilter(sequelize, context, priceFiat)
        }

        return context
      },
      discardQuery('domain', 'priceFiat', '$sort', 'fiatSymbol')
    ],
    get: [],
    create: disallow('external'),
    update: disallow('external'),
    patch: disallow('external'),
    remove: disallow('external')
  },

  after: {
    all: [],
    find: [
      async (context: HookContext): Promise<HookContext> => {
        const result = context.result as { dataValues: any }[]
        const total = (await DomainOffer.findAll(context.params.sequelize)).length // TODO: optimise by implmenting custom count query

        if (context.params.query?.$limit > 1) {
          context.result = {
            total,
            limit: context.params.query?.$limit as number || 0,
            skip: context.params.query?.$skip as number || 0,
            data: [...result]
          }
        }

        return context
      }
    ],
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
