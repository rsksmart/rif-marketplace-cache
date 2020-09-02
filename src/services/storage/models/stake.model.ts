import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import Offer from './offer.model'
import { BigNumberStringType } from '../../../sequelize'

@Table({ freezeTableName: true, tableName: 'storage_stakes' })
export default class StakeModel extends Model {
  @Column({ ...BigNumberStringType('total') })
  total!: BigNumber

  @Column
  currencyId!: number

  @ForeignKey(() => Offer)
  @Column
  offerId!: string

  @BelongsTo(() => Offer)
  offer!: Offer
}
