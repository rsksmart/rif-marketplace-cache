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

          const isOwned = status === 'owned'
          const sql =
            `SELECT
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
              ${isOwned ? `LEFT JOIN "rns_domain-offer" AS "active_offers" ON "Domain"."tokenId" = "active_offers"."tokenId"
              AND "active_offers"."status" = 'ACTIVE'` : ''}
              LEFT JOIN (
                  SELECT
                      "tokenId",
                      "creationDate",
                      ROW_NUMBER() OVER(
                          PARTITION BY "tokenId"
                          ORDER BY
                              "creationDate" DESC
                      ) AS "ROW_PRIORITY"
                  FROM
                      "rns_domain-offer"
                  WHERE
                      "status" = '${isOwned ? 'CANCELED' : 'ACTIVE'}'
              ) "INACTIVE_OFFERS" ON "INACTIVE_OFFERS"."tokenId" = "Domain"."tokenId"
              AND "INACTIVE_OFFERS"."creationDate" = "offers"."creationDate"
              AND "INACTIVE_OFFERS"."ROW_PRIORITY" = 1
          WHERE
              "Domain"."ownerAddress" = '${ownerAddress}'
              AND (
                  "offers"."status" = '${isOwned ? 'CANCELED' : 'ACTIVE'}'
                  ${isOwned ? 'OR "offers"."tokenId" is null' : ''}
              )
              ${isOwned ? `AND "active_offers"."tokenId" IS NULL
              AND ("INACTIVE_OFFERS"."tokenId" IS NOT NULL OR "offers"."tokenId" IS NULL)` : ''}
          `

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
