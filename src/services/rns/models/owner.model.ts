import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ freezeTableName: true, tableName: 'rns_owner', timestamps: false })
export default class DomainOwner extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  tokenId!: string

  @Column(DataType.STRING)
  address!: string
}
