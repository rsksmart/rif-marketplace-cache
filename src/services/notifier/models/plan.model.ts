import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Scopes, Table } from 'sequelize-typescript'
import NotifierChannelModel from './notifier-channel.model'
import PriceModel from './price.model'
import ProviderModel from './provider.model'
import { Op } from 'sequelize'
import SubscriptionModel from './subscription.model'

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
    @Column({ primaryKey: true, type: DataType.INTEGER })
    id!: number

    @Column({ type: DataType.STRING })
    name!: string

    @Column({ allowNull: false, type: DataType.STRING })
    planStatus!: 'ACTIVE' | 'INACTIVE'

    @Column({ allowNull: false, type: DataType.INTEGER })
    daysLeft!: number

    @Column({ allowNull: false, type: DataType.INTEGER })
    quantity!: number

    @HasMany(() => NotifierChannelModel, 'planId')
    channels!: NotifierChannelModel[]

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
