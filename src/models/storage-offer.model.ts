import { Table, DataType, Column, Model, HasMany, PrimaryKey } from 'sequelize-typescript'
import Price from './price.model'

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
