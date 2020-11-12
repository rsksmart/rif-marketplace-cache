import { Table, Column, Model, DataType } from 'sequelize-typescript'
import { NotificationPayload } from '../definitions'
import { ArrayStringType } from '../sequelize'

@Table({
  freezeTableName: true,
  tableName: 'notifications'
})
export default class NotificationModel extends Model {
  @Column({ allowNull: false })
  type!: string

  @Column({type: DataType.STRING, allowNull: true})
  consumer!: string[]

  @Column({type: DataType.STRING, allowNull: true})
  provider!: string[]

  @Column({ type: DataType.JSON, allowNull: false })
  payload!: NotificationPayload
}
