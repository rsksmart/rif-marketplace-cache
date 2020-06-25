import { Table, DataType, Column, Model } from 'sequelize-typescript'

@Table({ freezeTableName: true, tableName: 'rns_transfer', timestamps: false })
export default class Transfer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  id!: string

  @Column({ primaryKey: true, type: DataType.STRING })
  tokenId!: string

  @Column(DataType.STRING)
  sellerAddress!: string // previous owner

  @Column(DataType.STRING)
  buyerAddress!: string // buyer
}
