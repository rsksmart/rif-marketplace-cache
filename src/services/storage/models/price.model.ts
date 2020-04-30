import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import Offer from './offer.model'

@Table({ freezeTableName: true, tableName: 'storage_billing-plan' })
export default class BillingPlan extends Model {
  @Column
  period!: number

  @Column
  amount!: number

  @ForeignKey(() => Offer)
  @Column
  offerId!: string

  @BelongsTo(() => Offer)
  offer!: Offer
}
