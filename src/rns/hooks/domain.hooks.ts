import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true
        }

        if (!context.params.query) {
          context.params.query = {}
        }

        if (context.params.route?.ownerAddress) {
          context.params.query.ownerAddress = context.params.route.ownerAddress.toLowerCase()
        }
      }
    ],
    find: [
      (context: HookContext): HookContext => {
        if (!context.params.query) {
          context.params.query = {}
        }

        if (context.params.route?.ownerAddress) {
          context.params.query.ownerAddress = context.params.route.ownerAddress.toLowerCase()
        }
        return context
      },
      async (context: HookContext) => {
        if (context.params.query?.status) {
          const { status, ownerAddress } = context.params.query
          const statusConds: Record<string, string> = {
            owned: '"offers"."status" = \'CANCELED\' OR "offers"."tokenId" is null',
            placed: '"offers"."status" = \'ACTIVE\''
          }
          const sql = `SELECT
              "Domain"."tokenId",
              "Domain"."ownerAddress",
              "Domain"."name",
              "Domain"."expirationDate",
              "offers"."offerId" AS "offers.offerId",
              "offers"."tokenId" AS "offers.tokenId",
              "offers"."sellerAddress" AS "offers.sellerAddress",
              "offers"."sellerDomain" AS "offers.sellerDomain",
              "offers"."paymentToken" AS "offers.paymentToken",
              "offers"."price" AS "offers.price",
              "offers"."creationDate" AS "offers.creationDate",
              "offers"."status" AS "offers.status"
          FROM
              "rns_domain" AS "Domain"
              LEFT JOIN "rns_domain-offer" AS "offers" ON "Domain"."tokenId" = "offers"."tokenId"
              
          WHERE
              "Domain"."ownerAddress" = '${ownerAddress}'
              AND (${statusConds[status]});`

          const sequelize = context.app.get('sequelize')
          context.result = (await sequelize.query(sql))[0]
        }
        return context
      }
    ],
    get: [],
    create: disallow(),
    update: disallow(),
    patch: disallow(),
    remove: disallow()
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
