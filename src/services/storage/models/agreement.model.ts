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

  @Column({ type: DataType.STRING(), allowNull: false })
  dataReference!: string

  @Column({ type: DataType.STRING(64) })
  consumer!: string

  @Column({ allowNull: false })
  size!: number

  @Column({ defaultValue: true })
  isActive!: boolean

  /**
   * Billing period IN SECONDS
   */
  @Column({ allowNull: false })
  billingPeriod!: number

  @Column({ allowNull: false })
  billingPrice!: number

  @Column({ allowNull: false })
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
    return this.availableFunds / totalPeriodPrice
  }

  @Column(DataType.VIRTUAL)
  get periodsSinceLastPayout () {
    // Date.now = ms
    // this.lastPayout.getTime = ms
    // this.billingPeriod = seconds ==> * 1000
    return Math.floor((Date.now() - this.lastPayout.getTime()) / (this.billingPeriod * 1000))
  }

  @Column(DataType.VIRTUAL)
  get toBePayedOut () {
    const totalPeriodPrice = this.size * this.billingPrice
    const price = this.periodsSinceLastPayout * totalPeriodPrice
    return price <= this.availableFunds ? price : this.availableFunds
  }

  @Column(DataType.VIRTUAL)
  get hasSufficientFunds () {
    return this.toBePayedOut !== this.availableFunds
  }
}
