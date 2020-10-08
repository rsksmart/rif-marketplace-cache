import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
  freezeTableName: true,
  tableName: 'notifications'
})
export default class NotificationModel extends Model {
  @Column
  title!: string

  @Column
  type!: string

  @Column({ type: DataType.JSON })
  payload!: Record<any, any>
}
