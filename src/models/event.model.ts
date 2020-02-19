import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({ freezeTableName: true, tableName: 'event' })
export default class Event extends Model {
  @Column
  blockNumber!: number

  @Column(DataType.TEXT)
  content!: string
}
