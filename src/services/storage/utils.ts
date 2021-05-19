import { WEI } from '../utils'

export type MinMax = 1 | -1

/**
 * Get query for generating average minimum or maximum billing price
 * @param minMax
 */
export function getAvgMinMaxBillingPriceQuery (minMax: MinMax): string {
  return `
        SELECT
            CAST(
              SUM(
                CAST(price as REAL) / ${WEI} * COALESCE("rates"."usd", 0) * 1024 / period * (3600 * 24 * 30)
              ) / COUNT(*)
              as INTEGER
            ) as avgPrice
        FROM "storage_billing_plan"
        LEFT OUTER JOIN
            "rates" AS "rates" ON "storage_billing_plan"."rateId" = "rates"."token"
        GROUP BY offerId
        ORDER BY avgPrice ${minMax === 1 ? 'DESC' : 'ASC'}
        LIMIT 1
     `
}

/**
 * Get query for generating minimum or maximum available capacity
 * @param minMax
 */
export function getMinMaxAvailableCapacityQuery (minMax: MinMax): string {
  return `
  SELECT
      CAST(
        totalCapacity - SUM(
          COALESCE("storage_agreement"."size", 0)
          ) as STRING
      ) as availableCapacity
    FROM
      "storage_offer"
    LEFT OUTER JOIN
      "storage_agreement" as "storage_agreement" ON (
        "storage_offer"."provider" = "storage_agreement"."offerId"
        AND
        "storage_agreement".isActive
      )
    GROUP BY provider
    ORDER BY availableCapacity ${minMax === 1 ? 'DESC' : 'ASC'}
    LIMIT 1
     `
}
