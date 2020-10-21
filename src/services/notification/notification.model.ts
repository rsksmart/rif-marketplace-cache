import { Table, Column, Model, DataType } from 'sequelize-typescript'
import { CommsPayloads } from '../../definitions'

@Table({
  freezeTableName: true,
  tableName: 'notifications'
})
export default class NotificationModel extends Model {
  @Column({ allowNull: false })
  type!: string

  // TODO: implement get/set and make it type of String. This is needed for quering notification for specific account
  @Column({ type: DataType.JSON, allowNull: false })
  accounts!: string[]

  @Column({ type: DataType.JSON, allowNull: false })
  payload!: CommsPayloads & { code: string }
}
