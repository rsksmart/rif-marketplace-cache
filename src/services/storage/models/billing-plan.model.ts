import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import { BigNumberStringType } from '../../../sequelize'
import { SupportedTokens } from '../../../definitions'
import Offer from './offer.model'
import Rate from '../../rates/rates.model'

@Table({ freezeTableName: true, tableName: 'storage_billing-plan' })
export default class BillingPlan extends Model {
  @Column({ ...BigNumberStringType('period'), allowNull: false })
  period!: BigNumber

  @Column({ ...BigNumberStringType('price'), allowNull: false })
  price!: BigNumber

  @Column({ allowNull: false })
  tokenAddress!: string

  @ForeignKey(() => Offer)
  @Column({ allowNull: false })
  offerId!: string

  @BelongsTo(() => Offer)
  offer!: Offer

  @ForeignKey(() => Rate)
  @Column({ allowNull: false })
  rateId!: SupportedTokens
}
