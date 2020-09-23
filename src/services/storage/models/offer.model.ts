import config from 'config'
import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import { Op, literal, Sequelize } from 'sequelize'
import BigNumber from 'bignumber.js'

import BillingPlan from './billing-plan.model'
import Agreement from './agreement.model'
import { BigNumberStringType } from '../../../sequelize'
import Rate from '../../rates/rates.model'

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

  @Column(DataType.INTEGER)
  averagePrice!: number

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
}

/**
 * This function generate nested query for aggregating total stakes for offer in specific currency
 * @param sequelize
 * @param currency
 */
export async function getStakesAggregateQuery (sequelize: Sequelize, currency: 'usd' | 'eur' | 'btc' = 'usd') {
  if (!config.get('storage.tokens')) {
    throw new Error('"storage.tokens" not exist in config')
  }

  const supportedTokens = Object.entries(config.get('storage.tokens'))
  const rates = await Rate.findAll()
  return literal(`(
    SELECT SUM(
      case
        ${supportedTokens.reduce(
          (acc, [tokenAddress, tokenSymbol]) => {
            const rate: number = rates.find(r => r.token === tokenSymbol)?.[currency] || 0
            return `${acc} \n when token = ${sequelize.escape(tokenAddress)} then cast(total as integer) * ${sequelize.escape(rate)}`
          },
          ''
        )}
        else 0
      end
    ) from storage_stakes where account = provider)
  `)
}
