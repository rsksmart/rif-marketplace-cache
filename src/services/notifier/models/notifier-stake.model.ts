import { Table, Column, Model, ForeignKey } from 'sequelize-typescript'
import BigNumber from 'bignumber.js'
import { Sequelize } from 'sequelize'

import Rate from '../../../rates/rates.model'
import { SupportedTokens } from '../../../definitions'
import { BigNumberStringType } from '../../../sequelize'
import { WEI } from '../../utils'

@Table({ freezeTableName: true, tableName: 'notifier_stakes' })
export default class NotifierStakeModel extends Model {
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

export function getStakesForAccount (
  sequelize: Sequelize,
  account: string, currency: 'usd' | 'eur' | 'btc' = 'usd'
): string {
  return `
    SELECT
      CAST(
        SUM((cast(total as real) / ${WEI}) * coalesce("rates".${sequelize.escape(currency)}, 0)) as REAL
      ) as totalStakedFiat
    FROM
      notifier_stakes
    LEFT OUTER JOIN
      "rates" AS "rates" ON "notifier_stakes"."symbol" = "rates"."token"
    WHERE
      account = ${sequelize.escape(account)}
  `
}
