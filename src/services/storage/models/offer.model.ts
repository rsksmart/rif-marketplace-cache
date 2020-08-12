import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import { Op } from 'sequelize'
import BigNumber from 'bignumber.js'

import BillingPlan from './price.model'
import Agreement from './agreement.model'
import { bn } from '../../../utils'
import { BigNumberStringType } from '../../../sequelize'

@Scopes(() => ({
  active: {
    where: {
      totalCapacity: { [Op.and]: [{ [Op.ne]: null }, { [Op.gt]: 0 }] }
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
  address!: string

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
    return (this.agreements || []).map(request => request.size).reduce((previousValue, currentValue) => previousValue.plus(currentValue), bn(0))
  }

  @Column(DataType.VIRTUAL)
  get availableCapacity (): BigNumber {
    return this.totalCapacity.minus(this.utilizedCapacity)
  }
}
