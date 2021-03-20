import { BelongsTo, Column, DataType, HasMany, Model, Table } from 'sequelize-typescript'
import TriggersChannelModel from './triggersChannel.model'
import PriceModel from './price.model'
import ProviderModel from './provider.model'

@Table({ freezeTableName: true, tableName: 'triggers_plan', timestamps: false })
export default class PlanModel extends Model {
    @Column({ primaryKey: true, type: DataType.INTEGER })
    id!: string

    @Column({ type: DataType.STRING })
    name!: string

    @Column({ allowNull: false, type: DataType.STRING })
    planStatus!: 'ACTIVE' | 'INACTIVE'

    @Column({ allowNull: false, type: DataType.INTEGER })
    daysLeft!: number

    @Column({ allowNull: false, type: DataType.INTEGER })
    quantity!: number

    @HasMany(() => TriggersChannelModel, 'id')
    channels!: TriggersChannelModel[]

    @HasMany(() => PriceModel, 'id')
    prices!: PriceModel[]

    @BelongsTo(() => ProviderModel, 'id')
    provider!: ProviderModel
}
