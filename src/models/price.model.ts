import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import StorageOffer from './storage-offer.model'

@Table({ freezeTableName: true, tableName: 'price' })
export default class Price extends Model {
  @Column
  period!: number

  @Column
  amount!: number

  @ForeignKey(() => StorageOffer)
  @Column
  offerId!: string

  @BelongsTo(() => StorageOffer)
  offer!: StorageOffer
}
