import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript'
import PlanModel from './plan.model'
import SubscriptionModel from './subscription.model'

@Table({ freezeTableName: true, tableName: 'notifier_provider' })
export default class ProviderModel extends Model {
  @Column({ primaryKey: true, type: DataType.STRING(64) })
  provider!: string

  @Column({ allowNull: false })
  url!: string

  @HasMany(() => PlanModel, 'providerId')
  plans!: PlanModel[]

  @HasMany(() => SubscriptionModel)
  subscriptions!: SubscriptionModel[]
}
