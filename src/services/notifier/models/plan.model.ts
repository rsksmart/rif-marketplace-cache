import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Scopes, Table } from 'sequelize-typescript'
import PriceModel from './price.model'
import ProviderModel from './provider.model'
import { Op } from 'sequelize'
import SubscriptionModel from './subscription.model'
import { NotifierChannel } from '../api/notifierSvcProvider'

export const scopes = {
  active: 'active'
}
@Scopes(() => ({
  active: {
    where: {
      planStatus: { [Op.eq]: 'ACTIVE' }
    }
  }
}))
@Table({ freezeTableName: true, tableName: 'notifier_plan', timestamps: false })
export default class PlanModel extends Model {
    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id!: number

    @Column({ allowNull: false, type: DataType.INTEGER })
    planId!: number

    @Column({ type: DataType.STRING })
    name!: string

    @Column({ allowNull: false, type: DataType.STRING })
    planStatus!: 'ACTIVE' | 'INACTIVE'

    @Column({ allowNull: false, type: DataType.INTEGER })
    daysLeft!: number

    @Column({ allowNull: false, type: DataType.INTEGER })
    quantity!: number

    @Column({ allowNull: false, type: DataType.JSON })
    channels!: NotifierChannel[]

    @HasMany(() => PriceModel, 'planId')
    prices!: PriceModel[]

    @ForeignKey(() => ProviderModel)
    @Column({ allowNull: false })
    providerId!: string

    @BelongsTo(() => ProviderModel)
    provider!: ProviderModel

    @HasMany(() => SubscriptionModel, 'subscriptionPlanId')
    subscriptions!: SubscriptionModel[]
}
