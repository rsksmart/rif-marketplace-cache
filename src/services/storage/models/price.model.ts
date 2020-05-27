import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import StorageOffer from './storage-offer.model'

@Table({ freezeTableName: true, tableName: 'price' })
export default class Price extends Model {
  @Column(DataType.INTEGER)
  period!: number

  @Column(DataType.INTEGER)
  amount!: number

  @ForeignKey(() => StorageOffer)
  @Column(DataType.STRING)
  offerId!: string

  @BelongsTo(() => StorageOffer)
  offer!: StorageOffer
}
