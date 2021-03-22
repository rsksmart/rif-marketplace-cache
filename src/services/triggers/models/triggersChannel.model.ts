import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import PlanModel from './plan.model'

@Table({ freezeTableName: true, tableName: 'triggers_channel', timestamps: false })
export default class TriggersChannelModel extends Model {
    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id!: number

    @Column({ allowNull: false })
    name!: string

    @ForeignKey(() => PlanModel)
    @Column({ allowNull: false })
    planId!: number

    @BelongsTo(() => PlanModel)
    plan!: PlanModel
}
