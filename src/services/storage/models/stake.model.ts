import { Table, Column, Model } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import { BigNumberStringType } from '../../../sequelize'

@Table({ freezeTableName: true, tableName: 'storage_stakes' })
export default class StakeModel extends Model {
  @Column({ ...BigNumberStringType('total') })
  total!: BigNumber

  @Column
  symbol?: string

  @Column
  token!: string

  @Column
  account!: string
}
