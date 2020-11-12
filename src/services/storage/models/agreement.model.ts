import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import Offer from './offer.model'
import { BigNumberBigIntType, BigNumberStringType } from '../../../sequelize'
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
  @Column({ ...BigNumberBigIntType('size') })
  size!: BigNumber

  @Column({ defaultValue: true })
  isActive!: boolean

  @Column({ ...BigNumberStringType('billingPeriod') })
  billingPeriod!: BigNumber

  @Column({ ...BigNumberStringType('billingPrice') })
  billingPrice!: BigNumber

  @Column
  tokenAddress!: string

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

  getPeriodsSinceLastPayout (floor = true): BigNumber {
    // Date.now = ms
    // this.lastPayout.getTime = ms
    // this.billingPeriod = seconds ==> * 1000
    const timePassedMs = Math.max(Date.now() - this.lastPayout.getTime(), 0)
    const periods = new BigNumber(timePassedMs).div(this.billingPeriod.times(1000))
    return floor
      ? bnFloor(periods)
      : periods
  }

  getToBePayedOut (floor = true) {
    const amountToPay = this.getPeriodsSinceLastPayout(floor).times(this.periodPrice())
    return amountToPay.lte(this.availableFunds)
      ? bnFloor(amountToPay)
      : this.availableFunds
  }

  @Column(DataType.VIRTUAL)
  get numberOfPrepaidPeriods (): BigNumber {
    return this.periodPrice().gt(0)
      ? bnFloor(this.availableFunds.div(this.periodPrice()))
      : new BigNumber(0)
  }

  @Column(DataType.VIRTUAL)
  get periodsSinceLastPayout (): BigNumber {
    return this.getPeriodsSinceLastPayout()
  }

  @Column(DataType.VIRTUAL)
  get toBePayedOut (): BigNumber {
    return this.getToBePayedOut()
  }

  /**
   * Helper which specifies if the Agreement has at the moment of the call
   * sufficient funds for at least one more period.
   */
  @Column(DataType.VIRTUAL)
  get hasSufficientFunds (): boolean {
    return this.availableFunds.minus(this.getToBePayedOut()).gte(this.periodPrice())
  }

  /**
   * Field represents the time (in seconds) until the agreement expires
   */
  @Column(DataType.VIRTUAL)
  get expiresIn (): BigNumber {
    if (!this.hasSufficientFunds) return new BigNumber(0)
    const availableFundsAfterPayout = this.availableFunds.minus(this.getToBePayedOut(false))

    return bnFloor(availableFundsAfterPayout.div(this.periodPrice()).times(this.billingPeriod))
  }
}
