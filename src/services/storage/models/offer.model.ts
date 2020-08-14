import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import { Op } from 'sequelize'
import BigNumber from 'bignumber.js'

import BillingPlan from './billing-plan.model'
import Agreement from './agreement.model'
import { BigNumberStringType } from '../../../sequelize'

@Scopes(() => ({
  active: {
    where: {
      totalCapacity: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '0' }] },
      peerId: { [Op.ne]: null }
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
}
