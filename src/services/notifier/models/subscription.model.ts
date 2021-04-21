import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import ProviderModel from './provider.model'

@Table({ freezeTableName: true, tableName: 'notifier_subscription' })
export default class SubscriptionModel extends Model {
  @Column({ primaryKey: true })
  hash!: string

  @Column({ allowNull: false })
  url!: string

  @ForeignKey(() => ProviderModel)
  @Column
  providerId!: string

  @BelongsTo(() => ProviderModel)
  provider!: ProviderModel
}
