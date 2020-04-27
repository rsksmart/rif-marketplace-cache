import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
  freezeTableName: true,
  tableName: 'rates'
})
export default class Rate extends Model {
  @Column({ type: DataType.STRING(15), primaryKey: true })
  token!: string

  @Column({ type: DataType.FLOAT })
  usd!: number

  @Column({ type: DataType.FLOAT })
  eur!: number

  @Column({ type: DataType.FLOAT })
  btc!: number

  @Column({ type: DataType.FLOAT })
  ars!: number

  @Column({ type: DataType.FLOAT })
  cny!: number

  @Column({ type: DataType.FLOAT })
  krw!: number

  @Column({ type: DataType.FLOAT })
  jpy!: number
}
