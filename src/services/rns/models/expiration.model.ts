import { Column, DataType, Model, Table, HasMany, BelongsTo, ForeignKey } from 'sequelize-typescript'
import Domain from './domain.model'

@Table({ freezeTableName: true, tableName: 'rns_domain_expiration', timestamps: false })
export default class DomainExpiration extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  tokenId!: string

  @Column({ type: DataType.DATE })
  expirationDate!: number
}
