import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import Price from './price.model'
import Request from './request.model'
import { Op } from 'sequelize'

@Scopes(() => ({
  active: {
    where: {
      capacity: { [Op.and]: [{ [Op.ne]: null }, { [Op.gt]: 0 }] },
      maximumDuration: { [Op.ne]: null }
    },
    include: [
      {
        model: Price,
        required: true
      }
    ]
  }
}))
@Table({ freezeTableName: true, tableName: 'storage-offer' })
export default class StorageOffer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING(64) })
  address!: string

  @Column(DataType.INTEGER)
  capacity!: number

  @Column(DataType.INTEGER)
  maximumDuration!: number

  @HasMany(() => Price)
  prices!: Price[]

  @HasMany(() => Request)
  requests!: Request[]

  @Column(DataType.VIRTUAL)
  get utilizedCapacity (): number {
    return this.requests.map(request => request.size).reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  }

  @Column(DataType.VIRTUAL)
  get availableCapacity (): number {
    return this.capacity - this.utilizedCapacity
  }
}
