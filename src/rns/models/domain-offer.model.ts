import { Table, DataType, Column, Model, Scopes } from 'sequelize-typescript'
import { Op } from 'sequelize'

@Scopes(() => ({
  active: {
    where: {
      expirationDate: { [Op.gt]: new Date() }
    }
  }
}))
@Table({ freezeTableName: true, tableName: 'rns_domain-offer', timestamps: false })
export default class DomainOffer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  offerId!: string

  @Column
  tokenId!: string

  @Column
  sellerAddress!: string

  @Column
  sellerDomain: string

  @Column
  paymentToken!: number

  @Column
  price!: number

  @Column({ type: DataType.DATE })
  expirationDate!: date

  @Column
  newOwnerAddress: string

  @Column({ type: DataType.DATE })
  creationDate: date

  @Column({ type: DataType.DATE })
  soldDate: date
}
