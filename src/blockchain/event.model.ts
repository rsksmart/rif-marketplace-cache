import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
  freezeTableName: true,
  tableName: 'event',
  indexes: [
    {
      unique: true,
      fields: ['transactionHash', 'logIndex']
    }
  ]
})

export default class Event extends Model {
  @Column(DataType.INTEGER)
  blockNumber!: number

  @Column(DataType.STRING(64))
  transactionHash!: string

  @Column(DataType.INTEGER)
  logIndex!: number

  @Column(DataType.TEXT)
  content!: string
}

export type EventInterface = Pick<Event, 'blockNumber' | 'transactionHash' | 'logIndex' | 'content'>
