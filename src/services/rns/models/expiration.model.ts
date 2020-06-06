import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ freezeTableName: true, tableName: 'rns_domain_expiration', timestamps: false })
export default class DomainExpiration extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  id!: string

  @Column({ type: DataType.STRING })
  tokenId!: string

  @Column({ type: DataType.DATE })
  expirationDate!: number
}
