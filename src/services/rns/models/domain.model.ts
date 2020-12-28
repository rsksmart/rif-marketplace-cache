import { Op } from 'sequelize'
import { Column, DataType, HasMany, HasOne, Model, Scopes, Table } from 'sequelize-typescript'
import DomainOffer from './domain-offer.model'
import SoldDomain from './sold-domain.model'
import DomainOwner from './owner.model'

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

  @Column(DataType.STRING)
  name!: string

  @HasOne(() => DomainOwner, {
    foreignKey: 'tokenId'
  })
  owner!: DomainOwner

  @Column({ type: DataType.DATE })
  expirationDate!: number

  @HasMany(() => SoldDomain)
  sales!: SoldDomain[]

  @HasMany(() => DomainOffer)
  offers!: DomainOffer[]
}
