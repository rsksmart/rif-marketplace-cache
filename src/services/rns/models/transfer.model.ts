import { Table, DataType, Column, Model } from 'sequelize-typescript'

@Table({ freezeTableName: true, tableName: 'rns_transfer', timestamps: false })
export default class Transfer extends Model {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number

  @Column(DataType.STRING)
  txHash!: string // transaction hash

  @Column(DataType.STRING)
  tokenId!: string

  @Column(DataType.STRING)
  sellerAddress!: string // previous owner

  @Column(DataType.STRING)
  buyerAddress!: string // buyer
}
