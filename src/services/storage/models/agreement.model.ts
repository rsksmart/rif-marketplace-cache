import { Table, Column, Model, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import Offer from './offer.model'

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

  @Column
  size!: number

  @Column({ defaultValue: true })
  isActive!: boolean

  @Column
  billingPeriod!: number

  @Column
  billingPrice!: number

  @Column
  availableFunds!: number

  @Column
  lastPayout!: Date

  @ForeignKey(() => Offer)
  @Column
  offerId!: string

  @BelongsTo(() => Offer)
  offer!: Offer

  @Column(DataType.VIRTUAL)
  get numberOfPrepaidPeriods () {
    const totalPeriodPrice = this.size * this.billingPrice
    return totalPeriodPrice ? Math.floor(this.availableFunds / totalPeriodPrice) : 0
  }

  @Column(DataType.VIRTUAL)
  get periodsSinceLastPayout () {
    return Math.floor((Date.now() - this.lastPayout.getTime()) / (this.billingPeriod * 1000))
  }

  @Column(DataType.VIRTUAL)
  get toBePayedOut () {
    const totalPeriodPrice = this.size * this.billingPrice
    const price = this.periodsSinceLastPayout * totalPeriodPrice
    return price <= this.availableFunds ? price : this.availableFunds
  }

  /**
   * Helper which specifies if the Agreement has at the moment of the call
   * sufficient funds for at least one more period.
   */
  @Column(DataType.VIRTUAL)
  get hasSufficientFunds () {
    return this.availableFunds - this.toBePayedOut >= this.size * this.billingPrice
  }
}
