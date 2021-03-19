import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'
import PlanModel from './plan.model'

@Table({ freezeTableName: true, tableName: 'triggers_channel', timestamps: false })
export default class TriggersChannelModel extends Model {
    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id!: number

    @Column({ allowNull: false })
    name!: string

    @BelongsTo(() => PlanModel, 'id')
    plan!: PlanModel
}
