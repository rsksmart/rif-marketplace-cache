import { Table, DataType, Column, Model, Scopes, HasMany } from 'sequelize-typescript'
import { Op } from 'sequelize'

import SoldDomain from './sold-domain.model'

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
  ownerAddress!: string

  @Column
  tokenId!: string

  @Column
  name!: string

  @Column({ type: DataType.DATE })
  expirationDate: date

  @HasMany(() => SoldDomain)
  sales: SoldDomain[]
}
