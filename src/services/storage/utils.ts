import { SupportedTokens } from '../../definitions'
import config from 'config'

export const WEI = 1e18
export type MinMax = 1 | -1

/**
 * get token symbol by token address from config
 * @param tokenContractAddress
 * @returns {SupportedTokens} token symbol
 */
export function getTokenSymbol (tokenContractAddress: string): SupportedTokens {
  const supportedTokens = config.get<Record<string, SupportedTokens>>('storage.tokens')
  const token = Object
    .keys(supportedTokens)
    .find(t => t.toLowerCase() === tokenContractAddress.toLowerCase())

  if (!token) {
    throw new Error(`Token on address ${tokenContractAddress} is not supported`)
  }

  return config.get<SupportedTokens>(`storage.tokens.${token}`)
}

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
        FROM "storage_billing-plan"
        LEFT OUTER JOIN
            "rates" AS "rates" ON "storage_billing-plan"."rateId" = "rates"."token"
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
      "storage_agreement" as "storage_agreement" ON "storage_offer"."provider" = "storage_agreement"."offerId"
    GROUP BY provider
    ORDER BY availableCapacity ${minMax === 1 ? 'DESC' : 'ASC'}
    LIMIT 1
     `
}
