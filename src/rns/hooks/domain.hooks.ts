import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { sha3, numberToHex } from 'web3-utils'
import Domain from '../models/domain.model'
import DomainOffer from '../models/domain-offer.model'

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
          const { status, ownerAddress, name: nameFilter } = context.params.query

          const isOwned = status === 'owned'
          const sql =
            `SELECT
              "Domain"."tokenId",
              "Domain"."ownerAddress",
              "Domain"."name",
              "Domain"."expirationDate",
              "offers"."offerId",
              "offers"."paymentToken",
              "offers"."price",
              "offers"."creationDate"
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
                  ${isOwned ? '"status" IN (\'CANCELED\', \'SOLD\')' : '"status" = \'ACTIVE\''}
              ) "INACTIVE_OFFERS" ON "INACTIVE_OFFERS"."tokenId" = "Domain"."tokenId"
              AND "INACTIVE_OFFERS"."creationDate" = "offers"."creationDate"
              AND "INACTIVE_OFFERS"."ROW_PRIORITY" = 1
          WHERE
              "Domain"."ownerAddress" = '${ownerAddress}'
              ${isOwned
              ? `
              AND ("offers"."status" IN ('CANCELED', 'SOLD') OR "offers"."tokenId" IS NULL) 
              AND "active_offers"."tokenId" IS NULL
              AND ("INACTIVE_OFFERS"."tokenId" IS NOT NULL OR "offers"."tokenId" IS NULL)
              `
              : `
              AND "offers"."status" = 'ACTIVE'
              `}
              ${nameFilter?.$like ? `AND ("Domain"."name" LIKE '%${nameFilter.$like}%' OR "Domain"."tokenId" = '${numberToHex((sha3(nameFilter.$like)) as string)}')` : ''}
          `

          const sequelize = context.app.get('sequelize')
          const results = (await sequelize.query(sql))[0]

          context.result = results.map((item: Domain & DomainOffer) => {
            const { offerId, paymentToken, price, creationDate, ...rest } = item

            return {
              ...rest,
              offer: offerId && {
                offerId,
                paymentToken,
                price,
                creationDate
              }
            }
          })
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
