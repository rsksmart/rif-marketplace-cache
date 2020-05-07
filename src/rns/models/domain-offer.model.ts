import { Table, DataType, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'

import Domain from './domain.model'

@Table({ freezeTableName: true, tableName: 'rns_domain-offer', timestamps: false })
export default class DomainOffer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  offerId!: string

  @ForeignKey(() => Domain)
  @Column
  tokenId!: string

  @BelongsTo(() => Domain)
  domain!: Domain

  @Column
  sellerAddress!: string

  @Column
  sellerDomain!: string

  @Column
  paymentToken!: string

  @Column({ type: DataType.DECIMAL })
  price!: number

  @Column({ type: DataType.DATE })
  creationDate!: number

  @Column({ type: DataType.ENUM('ACTIVE', 'CANCELED', 'SOLD') })
  status!: string
}
