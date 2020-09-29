import BigNumber from 'bignumber.js'
import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import { Op, literal, Sequelize } from 'sequelize'
import { Literal } from 'sequelize/types/lib/utils'

import BillingPlan from './billing-plan.model'
import { SupportedTokens } from '../../../definitions'
import Agreement from './agreement.model'
import { BigNumberStringType } from '../../../sequelize'

@Scopes(() => ({
  active: {
    where: {
      [Op.and]: [literal('cast(totalCapacity as integer) > 0')]
      // peerId: { [Op.ne]: null }
    },
    include: [
      {
        model: BillingPlan,
        required: true
      }
    ]
  }
}))
@Table({ freezeTableName: true, tableName: 'storage_offer' })
export default class Offer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING(64) })
  provider!: string

  @Column({ ...BigNumberStringType('totalCapacity') })
  totalCapacity!: BigNumber

  @Column
  peerId!: string

  @HasMany(() => BillingPlan)
  plans!: BillingPlan[]

  @HasMany(() => Agreement)
  agreements!: Agreement[]

  @Column(DataType.VIRTUAL)
  get utilizedCapacity (): BigNumber {
    return (this.agreements || [])
      .map(request => request.size)
      .reduce((previousValue, currentValue) => previousValue.plus(currentValue), new BigNumber(0))
  }

  @Column(DataType.VIRTUAL)
  get availableCapacity (): BigNumber {
    return this.totalCapacity.minus(this.utilizedCapacity)
  }

  @Column(DataType.VIRTUAL)
  get acceptedCurrencies (): Array<SupportedTokens> {
    return Array.from(
      new Set(
        (this.plans || []).map(plan => plan.rateId)
      )
    )
  }
}

/**
 * This function generate nested query for aggregating total stakes for offer in specific currency
 * @param sequelize
 * @param currency
 */
export function getStakesAggregateQuery (
  sequelize: Sequelize,
  currency: 'usd' | 'eur' | 'btc' = 'usd'
): Literal {
  return literal(`
  (
    SELECT
      SUM(total * coalesce("rates"."${currency}", 0))
    FROM
      storage_stakes
    LEFT OUTER JOIN
      "rates" AS "rates" ON "storage_stakes"."symbol" = "rates"."token"
    WHERE
      account = provider
  )
  `)
}

/**
 * This function generate nested query for aggregating an avg billing price for offer for specific currency
 * @param sequelize
 * @param currency
 */
export function getBillingPriceAvgQuery (
  sequelize: Sequelize,
  currency: 'usd' | 'eur' | 'btc' = 'usd'
): Literal {
  return literal(`
  (
    SELECT
      CAST(
        SUM(price * coalesce("rates"."${currency}", 0)) / COUNT(*) * 1024 / period * (3600 * 24)
        as INTEGER
      )
    FROM
      "storage_billing-plan"
    LEFT OUTER JOIN
      "rates" AS "rates" ON "storage_billing-plan"."rateId" = "rates"."token"
    WHERE
      offerId = provider
  )
  `)
}
