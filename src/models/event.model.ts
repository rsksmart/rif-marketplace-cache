import { Table, Column, Model } from 'sequelize-typescript'

@Table
export default class Event extends Model {
  @Column
  blockNumber!: number

  @Column
  content!: string
}
