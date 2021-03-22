import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript'
import TriggersChannelModel from './triggersChannel.model'
import PriceModel from './price.model'
import ProviderModel from './provider.model'

@Table({ freezeTableName: true, tableName: 'triggers_plan', timestamps: false })
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

    @HasMany(() => TriggersChannelModel, 'planId')
    channels!: TriggersChannelModel[]

    @HasMany(() => PriceModel, 'planId')
    prices!: PriceModel[]

    @ForeignKey(() => ProviderModel)
    @Column({ allowNull: false })
    providerId!: string

    @BelongsTo(() => ProviderModel)
    provider!: ProviderModel
}
