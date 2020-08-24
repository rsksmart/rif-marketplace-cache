import { Table, DataType, Column, Model, Scopes, ForeignKey, BelongsTo } from 'sequelize-typescript'

import Domain from './domain.model'
import Transfer from './transfer.model'

@Scopes(() => ({
  active: {
    include: [
      {
        model: Domain,
        required: true
      }
    ]
  }
}))
@Table({ freezeTableName: true, tableName: 'rns_sold-domain', timestamps: false })
export default class SoldDomain extends Model {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number

  @Column(DataType.STRING)
  txHash!: string // transaction hash

  @ForeignKey(() => Domain)
  @Column(DataType.STRING)
  tokenId!: string

  @BelongsTo(() => Domain)
  domain!: Domain

  @ForeignKey(() => Transfer)
  @Column(DataType.INTEGER)
  transferId!: Transfer

  @BelongsTo(() => Transfer)
  transfer!: Transfer

  @Column(DataType.STRING)
  paymentToken!: string // currency

  @Column(DataType.DECIMAL)
  price!: number // selling price

  @Column(DataType.STRING)
  priceString!: string

  @Column(DataType.DATE)
  soldDate!: number // selling date
}
