import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import { Op, literal } from 'sequelize'
import BigNumber from 'bignumber.js'

import BillingPlan from './billing-plan.model'
import Agreement from './agreement.model'
import StakeModel from './stake.model'
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

  @Column(DataType.INTEGER)
  averagePrice!: number

  @HasMany(() => BillingPlan)
  plans!: BillingPlan[]

  @HasMany(() => StakeModel)
  stakes?: StakeModel[]

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
