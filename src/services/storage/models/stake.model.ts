import { Table, Column, Model } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import { BigNumberStringType } from '../../../sequelize'

export const SUPPORTED_TOKENS_SYMBOLS = ['rbtc', 'rif', 'cfp']

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
