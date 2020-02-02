import { Table, DataType, Column, Model, HasMany } from 'sequelize-typescript'
import Price from './price.model'

@Table
export default class StorageOffer extends Model {
  @Column
  capacity!: number

  @Column
  maximumDuration!: number

  @Column
  address!: string

  @HasMany(() => Price)
  prices!: Price[]
}
