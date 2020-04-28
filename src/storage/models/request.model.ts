import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import StorageOffer from './storage-offer.model'

@Table({
  freezeTableName: true,
  tableName: 'request'
})
export default class Request extends Model {
  @Column({ type: DataType.STRING(67), primaryKey: true })
  requestId!: string

  @Column({ type: DataType.STRING() })
  reference!: string

  @Column({ type: DataType.STRING(64) })
  requester!: string

  @Column
  size!: number

  @Column
  period!: number

  @Column
  price!: number

  @Column
  deposited!: number

  @ForeignKey(() => StorageOffer)
  @Column
  offerId!: string

  @BelongsTo(() => StorageOffer)
  offer!: StorageOffer
}
