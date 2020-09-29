import { SupportedTokens } from '../../definitions'
import config from 'config'

export const WEI = 1000000000000000000
export type MinMax = 1 | -1

/**
 * get token symbol by token address from config
 * @param tokenContractAddress
 * @returns {SupportedTokens} token symbol
 */
export function getTokenSymbol (tokenContractAddress: string): SupportedTokens {
  if (!config.has(`storage.tokens.${tokenContractAddress}`)) {
    throw new Error(`Token on address ${tokenContractAddress} is not supported`)
  }

  return config.get<SupportedTokens>(`storage.tokens.${tokenContractAddress}`)
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
                CAST(price as REAL) / ${WEI} * COALESCE("rates"."usd", 0) * 1024 / period * (3600 * 24)
              ) / COUNT(*)
              as INTEGER
            ) as avgPrice
        FROM "storage_billing-plan"
        LEFT OUTER JOIN
            "rates" AS "rates" ON "storage_billing-plan"."rateId" = "rates"."token"
        GROUP BY offerId
        ORDER BY avgPrice ${minMax === -1 ? 'DESC' : 'ASC'}
        LIMIT 1
     `
}
