import BigNumber from 'bignumber.js'
import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import { SupportedTokens } from '../../../definitions'
import Rate from '../../../rates/rates.model'
import { BigNumberStringType } from '../../../sequelize'
import PlanModel from './plan.model'
import ProviderModel from './provider.model'

type Topic = {
  notificationPreferences: string | Array<string>
  type: string
  topicParams: Array<any>
}

type Status =
  | 'ACTIVE'
  | 'PENDING'
  | 'EXPIRED'
  | 'COMPLETED'

@Table({ freezeTableName: true, tableName: 'notifier_subscription', timestamps: false })
export default class SubscriptionModel extends Model {
  @Column({ primaryKey: true })
  hash!: string

  @Column({ allowNull: false })
  subscriptionId!: number

  @Column({ allowNull: false })
  status!: Status

  @ForeignKey(() => PlanModel)
  @Column({ allowNull: false })
  subscriptionPlanId!: number

  @Column({ allowNull: false })
  notificationBalance!: number

  @Column({ allowNull: true })
  previousSubscription!: string

  @Column({ allowNull: false })
  expirationDate!: Date

  @Column({ allowNull: false })
  consumer!: string

  @Column({ type: DataType.JSON, allowNull: false })
  topics!: Array<Topic>

  @Column({ allowNull: false })
  paid!: boolean

  @Column({ ...BigNumberStringType('price'), allowNull: false })
  price!: BigNumber

  @ForeignKey(() => Rate)
  @Column({ allowNull: false })
  rateId!: SupportedTokens

  @ForeignKey(() => ProviderModel)
  @Column
  providerId!: string

  @BelongsTo(() => ProviderModel)
  provider!: ProviderModel

  @BelongsTo(() => PlanModel)
  plan!: PlanModel
}
