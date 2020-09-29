import { Table, Column, Model, ForeignKey } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'

import Rate from '../../rates/rates.model'
import { SupportedTokens } from '../../../definitions'
import { BigNumberStringType } from '../../../sequelize'

@Table({ freezeTableName: true, tableName: 'storage_stakes' })
export default class StakeModel extends Model {
  @Column({ ...BigNumberStringType('total') })
  total!: BigNumber

  @ForeignKey(() => Rate)
  @Column
  symbol!: SupportedTokens

  @Column
  token!: string

  @Column
  account!: string
}
