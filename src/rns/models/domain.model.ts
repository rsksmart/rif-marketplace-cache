import { Table, DataType, Column, Model, Scopes, HasMany } from 'sequelize-typescript'
import { Op } from 'sequelize'

import DomainOffer from './domain-offer.model'
import SoldDomain from './sold-domain.model'

@Scopes(() => ({
  active: {
    where: {
      expirationDate: { [Op.gt]: Date.now() }
    }
  }
}))
@Table({ freezeTableName: true, tableName: 'rns_domain', timestamps: false })
export default class Domain extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  tokenId!: string

  @Column
  ownerAddress!: string

  @Column
  name!: string

  @Column({ type: DataType.DATE })
  expirationDate!: number

  @HasMany(() => SoldDomain)
  sales!: SoldDomain[]

  @HasMany(() => DomainOffer)
  offers!: DomainOffer[]
}
