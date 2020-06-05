import { Op } from 'sequelize'
import { BelongsTo, Column, DataType, HasMany, Model, Scopes, Table } from 'sequelize-typescript'
import DomainOffer from './domain-offer.model'
import DomainExpiration from './expiration.model'
import SoldDomain from './sold-domain.model'

@Scopes(() => ({
  active: {
    include: [
      {
        model: DomainExpiration,
        where: {
          expirationDate: { [Op.gt]: Date.now() }
        }
      }
    ]
  }
}))
@Table({ freezeTableName: true, tableName: 'rns_domain', timestamps: false })
export default class Domain extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  tokenId!: string

  @Column(DataType.STRING)
  ownerAddress!: string

  @Column(DataType.STRING)
  name!: string

  @BelongsTo(() => DomainExpiration, {
    foreignKey: 'tokenId'
  })
  expiration!: DomainExpiration

  @HasMany(() => SoldDomain)
  sales!: SoldDomain[]

  @HasMany(() => DomainOffer)
  offers!: DomainOffer[]
}
