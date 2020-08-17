import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import Offer from './offer.model'
import { BigNumberStringType } from '../../../sequelize'

@Table({ freezeTableName: true, tableName: 'storage_billing-plan' })
export default class BillingPlan extends Model {
  @Column({ ...BigNumberStringType('period') })
  period!: BigNumber

  @Column({ ...BigNumberStringType('price') })
  price!: BigNumber

  @ForeignKey(() => Offer)
  @Column
  offerId!: string

  @BelongsTo(() => Offer)
  offer!: Offer
}
