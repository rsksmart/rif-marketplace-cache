import { Table, DataType, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'

import Domain from './domain.model'

@Table({ freezeTableName: true, tableName: 'rns_domain-offer', timestamps: false })
export default class DomainOffer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  offerId!: string

  @ForeignKey(() => Domain)
  @Column(DataType.STRING)
  tokenId!: string

  @BelongsTo(() => Domain)
  domain!: Domain

  @Column(DataType.STRING)
  sellerAddress!: string

  @Column(DataType.STRING)
  sellerDomain!: string

  @Column(DataType.STRING)
  paymentToken!: string

  @Column(DataType.DECIMAL)
  price!: number

  @Column(DataType.DATE)
  creationDate!: number

  @Column(DataType.ENUM('ACTIVE', 'CANCELED', 'SOLD'))
  status!: string
}
