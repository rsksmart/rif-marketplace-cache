import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import ProviderModel from './provider.model'

@Table({ freezeTableName: true, tableName: 'notifier_subscription' })
export default class SubscriptionModel extends Model {
  @Column({ primaryKey: true })
  hash!: string

  @Column({ allowNull: false })
  subscriptionId!: number

  @Column({ allowNull: false })
  status!: string

  @Column({ allowNull: false })
  subscriptionPlanId!: number

  @Column({ allowNull: true })
  previousSubscription!: string

  @Column({ allowNull: false })
  expirationDate!: Date

  @Column({ allowNull: false })
  consumer!: string

  @Column({ type: DataType.JSON, allowNull: false })
  topics!: Record<any, any>[]

  @ForeignKey(() => ProviderModel)
  @Column
  providerId!: string

  @BelongsTo(() => ProviderModel)
  provider!: ProviderModel
}
