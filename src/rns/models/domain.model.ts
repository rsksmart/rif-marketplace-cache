import { Table, DataType, Column, Model, Scopes } from 'sequelize-typescript'
import { Op } from 'sequelize'

@Scopes(() => ({
  active: {
    where: {
      expirationDate: { [Op.gt]: new Date() }
    }
  }
}))
@Table({ freezeTableName: true, tableName: 'rns_domain', timestamps: false })
export default class Domain extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  tokenId!: string

  @Column
  ownerAddress: string

  @Column
  name: string

  @Column({ type: DataType.DATE })
  expirationDate: date
}
