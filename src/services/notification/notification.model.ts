import { Table, Column, Model, DataType } from 'sequelize-typescript'
import { CommsPayloads } from '../../definitions'

@Table({
  freezeTableName: true,
  tableName: 'notifications'
})
export default class NotificationModel extends Model {
  @Column
  title!: string

  @Column({ allowNull: false })
  type!: string

  @Column({ allowNull: false })
  account!: string

  @Column({ type: DataType.JSON, allowNull: false })
  payload!: Record<any, any> | CommsPayloads
}
