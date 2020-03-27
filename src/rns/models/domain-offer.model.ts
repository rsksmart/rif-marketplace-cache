import { Table, DataType, Column, Model, Scopes } from 'sequelize-typescript'
import { Op } from 'sequelize'

@Scopes(() => ({
  active: {
    where: {
      expirationDate: { [Op.gt]: new Date() }
    }
  }
}))
@Table({ freezeTableName: true, tableName: 'domain-offer' })
export default class DomainOffer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  domain!: string

  @Column
  seller!: string

  @Column({ type: DataType.DATE })
  expirationDate!: date

  @Column
  tokenId!: number

  @Column
  paymentToken!: number

  @Column
  cost!: number
}
