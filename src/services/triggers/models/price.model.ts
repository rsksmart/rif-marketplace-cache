import BigNumber from 'bignumber.js'
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript'

import { SupportedTokens } from '../../../definitions'
import Rate from '../../../rates/rates.model'
import { BigNumberStringType } from '../../../sequelize'
import PlanModel from './plan.model'

@Table({ freezeTableName: true, tableName: 'triggers_price' })
export default class PriceModel extends Model {
    @Column({ ...BigNumberStringType('price'), allowNull: false })
    price!: BigNumber

    @ForeignKey(() => Rate)
    @Column({ primaryKey: true, allowNull: false })
    rateId!: SupportedTokens

    @ForeignKey(() => PlanModel)
    @Column(DataType.STRING)
    planId!: string

    @BelongsTo(() => PlanModel)
    plan!: PlanModel
}
