import { HookContext } from '@feathersjs/feathers'
import { disallow, discardQuery } from 'feathers-hooks-common'
import { literal, Op } from 'sequelize'
import { numberToHex, sha3 } from 'web3-utils'
import { WEI } from '../../storage/utils'
import Domain from '../models/domain.model'
import DomainExpiration from '../models/expiration.model'

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
        const orderBy = context.params.query?.$sort

        const seqContext = context.app.get('sequelize')
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
          },
          attributes: {
            exclude: ['price', 'approved'],
            include: [
              [(() => {
                return literal(`
                (
                  SELECT
                    CAST(
                      SUM(
                        (cast(priceString as REAL) / ${WEI}) * coalesce("rates".${seqContext.escape('usd')}, 0) * 1024
                      )
                      as INTEGER
                    )
                  FROM
                    "rns_domain_offer"
                  LEFT OUTER JOIN
                    "rates" AS "rates" ON "rns_domain_offer"."rateId" = "rates"."token"
                  WHERE
                    id = "DomainOffer"."id"
                )
                `)
              })(), 'avgUSDPrice']
            ]
          },
        }
        const { params: { sequelize } } = context
        const { include } = sequelize
        const domain = context.params.query?.domain

        if (include && domain) {
          const { name: { $like } } = domain
          include.where = {
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

        if (orderBy) {
          const {
            avgUSDPrice,
            domain,
          } = orderBy

          const sequelizeOrder = []

          if (avgUSDPrice) {
            const sqlOrderBy = `avgUSDPrice ${getSortDirection(avgUSDPrice)}`
            sequelizeOrder.push(literal(sqlOrderBy))
          }
          if(domain) {
            sequelizeOrder.push([
            {
              model: Domain,
              as: 'domain'
            }, 'name', getSortDirection(domain.name)
          ])
          }

          context.params.sequelize.order = sequelizeOrder
        }

        delete context.params.query

        return context
      },
      discardQuery('domain')
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

