import { Table, DataType, Column, Model, ForeignKey, BelongsTo, Scopes } from 'sequelize-typescript'
import { Op } from 'sequelize'

import Domain from './domain.model'

@Scopes(() => ({
  approved: {
    where: {
      approved: { [Op.eq]: true }
    }
  }
}))
@Table({ freezeTableName: true, tableName: 'rns_domain_offer', timestamps: false })
export default class DomainOffer extends Model {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number

  @Column(DataType.STRING)
  txHash!: string // transaction hash

  @ForeignKey(() => Domain)
  @Column(DataType.STRING)
  tokenId!: string

  @BelongsTo(() => Domain)
  domain!: Domain

  @Column(DataType.STRING)
  ownerAddress!: string

  @Column(DataType.STRING)
  ownerDomain!: string

  @Column(DataType.STRING)
  paymentToken!: string

  @Column(DataType.DECIMAL)
  price!: number

  @Column(DataType.STRING)
  priceString!: string

  @Column(DataType.BOOLEAN)
  approved!: boolean

  @Column(DataType.DATE)
  creationDate!: number
}
