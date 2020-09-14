import { Table, Column, Model, ForeignKey, BelongsTo } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import { BigNumberStringType } from '../../../sequelize'
import Offer from './offer.model'

@Table({ freezeTableName: true, tableName: 'storage_stakes' })
export default class StakeModel extends Model {
  @Column({ ...BigNumberStringType('total') })
  total!: BigNumber

  @Column
  symbol?: string

  @Column
  token!: string

  // TODO remove this relation when we have ability to have `account hasMany offers`
  @ForeignKey(() => Offer)
  @Column
  account!: string

  @BelongsTo(() => Offer)
  offer!: Offer
}
