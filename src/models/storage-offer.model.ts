import { Table, DataType, Column, Model, HasMany, Scopes } from 'sequelize-typescript'
import Price from './price.model'
import { Op } from 'sequelize'

@Scopes(() => ({
  active: {
    where: {
      capacity: { [Op.ne]: null },
      maximumDuration: { [Op.ne]: null }
    }
  }
}))
@Table
export default class StorageOffer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING(64) })
  address!: string

  @Column
  capacity!: number

  @Column
  maximumDuration!: number

  @HasMany(() => Price)
  prices!: Price[]
}
