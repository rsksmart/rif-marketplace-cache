import { Table, DataType, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import StorageOffer from './storage-offer.model'

@Table
export default class Price extends Model {
  @Column
  period!: number

  @Column
  amount!: number

  @ForeignKey(() => StorageOffer)
  @Column
  offerId!: number

  @BelongsTo(() => StorageOffer)
  offer!: StorageOffer
}
