import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({ freezeTableName: true, tableName: 'triggers_provider' })
export default class ProviderModel extends Model {
  @Column({ primaryKey: true, type: DataType.STRING(64) })
  provider!: string

  @Column({ allowNull: false })
  url!: string
}
