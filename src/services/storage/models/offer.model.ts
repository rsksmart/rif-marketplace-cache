import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import BillingPlan from './price.model'
import Agreement from './agreement.model'
import { Op } from 'sequelize'

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

  @Column
  totalCapacity!: number

  @Column
  peerId!: string

  @HasMany(() => BillingPlan)
  plans!: BillingPlan[]

  @HasMany(() => Agreement)
  agreements!: Agreement[]

  @Column(DataType.VIRTUAL)
  get utilizedCapacity (): number {
    return (this.agreements || []).map(request => request.size).reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  }

  @Column(DataType.VIRTUAL)
  get availableCapacity (): number {
    return this.totalCapacity - this.utilizedCapacity
  }
}
