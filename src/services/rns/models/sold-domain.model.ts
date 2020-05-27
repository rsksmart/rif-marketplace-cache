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
  @Column({ primaryKey: true, type: DataType.STRING })
  id!: string

  @ForeignKey(() => Domain)
  @Column(DataType.STRING)
  tokenId!: string

  @BelongsTo(() => Domain)
  domain!: Domain

  @BelongsTo(() => Transfer, {
    foreignKey: 'id'
  })
  transfer!: Transfer

  @Column(DataType.STRING)
  paymentToken!: string // currency

  @Column(DataType.DECIMAL)
  price!: number// selling price

  @Column(DataType.DATE)
  soldDate!: number // selling date
}
