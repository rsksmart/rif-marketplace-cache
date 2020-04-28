import { Table, DataType, Column, Model, Scopes, ForeignKey, BelongsTo } from 'sequelize-typescript'

import Domain from './domain.model'

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
  id: string

  @ForeignKey(() => Domain)
  @Column
  tokenId!: string

  @BelongsTo(() => Domain)
  domain: Domain

  @Column
  sellerAddress: string // previous owner

  @Column
  newOwnerAddress: string // buyer

  @Column
  paymentToken!: string // currency

  @Column({ type: DataType.DECIMAL })
  price!: number// selling price

  @Column({ type: DataType.BIGINT })
  soldDate: number // selling date
}
