import { Table, Column, Model, DataType } from 'sequelize-typescript'
import { CommsPayloads } from '../../definitions'
import { ArrayStringType } from '../../sequelize'

@Table({
  freezeTableName: true,
  tableName: 'notifications'
})
export default class NotificationModel extends Model {
  @Column({ allowNull: false })
  type!: string

  @Column({ ...ArrayStringType('accounts'), allowNull: false })
  accounts!: string[]

  @Column({ type: DataType.JSON, allowNull: false })
  payload!: CommsPayloads & { code: string }
}
