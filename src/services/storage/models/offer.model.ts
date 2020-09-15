import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import { Op, literal, Sequelize } from 'sequelize'
import BigNumber from 'bignumber.js'

import BillingPlan from './billing-plan.model'
import Agreement from './agreement.model'
import { BigNumberStringType } from '../../../sequelize'
import Rate from '../../rates/rates.model'
import { SUPPORTED_TOKENS_SYMBOLS } from './stake.model'

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

export async function getStakesAggregateQuery (sequelize: Sequelize, currency: 'usd' | 'eur' | 'btc' = 'usd') {
  const rates = await Rate.findAll()
  return literal(`(
    SELECT SUM(
      case
        ${SUPPORTED_TOKENS_SYMBOLS.reduce(
          (acc, el) => {
            const rate: number = rates.find(r => r.token === el)?.[currency] || 0
            return `${acc} \n when symbol = ${sequelize.escape(el)} then cast(total as integer) * ${sequelize.escape(rate)}`
          },
          ''
        )}
        else 0
      end
    ) from storage_stakes where account = provider)
  `)
}
