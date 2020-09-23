import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import Offer from './offer.model'
import { BigNumberStringType } from '../../../sequelize'
import { bnFloor } from '../../../utils'

@Table({
  freezeTableName: true,
  tableName: 'storage_agreement',
  timestamps: false
})
export default class Agreement extends Model {
  @Column({ type: DataType.STRING(67), primaryKey: true })
  agreementReference!: string

  @Column({ type: DataType.STRING() })
  dataReference!: string

  @Column({ type: DataType.STRING(64) })
  consumer!: string

  // In Megabytes
  @Column({ ...BigNumberStringType('size') })
  size!: BigNumber

  @Column({ defaultValue: true })
  isActive!: boolean

  @Column({ ...BigNumberStringType('billingPeriod') })
  billingPeriod!: BigNumber

  @Column({ ...BigNumberStringType('billingPrice') })
  billingPrice!: BigNumber

  @Column
  token!: string

  @Column({ ...BigNumberStringType('availableFunds') })
  availableFunds!: BigNumber

  @Column
  lastPayout!: Date

  @ForeignKey(() => Offer)
  @Column
  offerId!: string

  @BelongsTo(() => Offer)
  offer!: Offer

  periodPrice (): BigNumber {
    return this.size.times(this.billingPrice)
  }

  @Column(DataType.VIRTUAL)
  get numberOfPrepaidPeriods (): BigNumber {
    return this.periodPrice().gt(0)
      ? bnFloor(this.availableFunds.div(this.periodPrice()))
      : new BigNumber(0)
  }

  @Column(DataType.VIRTUAL)
  get periodsSinceLastPayout (): BigNumber {
    // Date.now = ms
    // this.lastPayout.getTime = ms
    // this.billingPeriod = seconds ==> * 1000
    return bnFloor(new BigNumber(Date.now() - this.lastPayout.getTime()).div(this.billingPeriod.times(1000)))
  }

  @Column(DataType.VIRTUAL)
  get toBePayedOut (): BigNumber {
    const amountToPay = this.periodsSinceLastPayout.times(this.periodPrice())
    return amountToPay.lte(this.availableFunds)
      ? amountToPay
      : this.availableFunds
  }

  /**
   * Helper which specifies if the Agreement has at the moment of the call
   * sufficient funds for at least one more period.
   */
  @Column(DataType.VIRTUAL)
  get hasSufficientFunds (): boolean {
    return this.availableFunds.minus(this.toBePayedOut).gte(this.periodPrice())
  }
}
