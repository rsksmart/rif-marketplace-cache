import BigNumber from 'bignumber.js'
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'

import { SupportedTokens } from '../../../definitions'
import Rate from '../../../rates/rates.model'
import { BigNumberStringType } from '../../../sequelize'
import PlanModel from './plan.model'

@Table({ freezeTableName: true, tableName: 'notifier_price', timestamps: false })
export default class PriceModel extends Model {
    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id!: number

    @Column({ ...BigNumberStringType('price'), allowNull: false })
    price!: BigNumber

    @ForeignKey(() => Rate)
    @Column({ allowNull: false })
    rateId!: SupportedTokens

    @ForeignKey(() => PlanModel)
    @Column({ allowNull: false })
    planId!: number

    @BelongsTo(() => PlanModel)
    plan!: PlanModel
}
