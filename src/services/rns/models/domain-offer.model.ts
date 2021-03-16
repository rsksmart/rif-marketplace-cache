import { Table, DataType, Column, Model, ForeignKey, BelongsTo, Scopes } from 'sequelize-typescript'
import { literal, Op, Sequelize } from 'sequelize'

import Domain from './domain.model'
import Rate from '../../../rates/rates.model'
import { SupportedTokens } from '../../../definitions'
import { Literal } from 'sequelize/types/lib/utils'
import { WEI } from '../../utils'

@Scopes(() => ({
  approved: {
    where: {
      approved: { [Op.eq]: true }
    }
  }
}))
@Table({ freezeTableName: true, tableName: 'rns_domain_offer', timestamps: false })
export default class DomainOffer extends Model {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  id!: number

  @Column(DataType.STRING)
  txHash!: string // transaction hash

  @ForeignKey(() => Domain)
  @Column(DataType.STRING)
  tokenId!: string

  @BelongsTo(() => Domain)
  domain!: Domain

  @Column(DataType.STRING)
  ownerAddress!: string

  @Column(DataType.STRING)
  ownerDomain!: string

  @Column(DataType.STRING)
  paymentToken!: string

  @Column(DataType.DECIMAL)
  price!: number

  @Column(DataType.STRING)
  priceString!: string

  @Column(DataType.BOOLEAN)
  approved!: boolean

  @Column(DataType.DATE)
  creationDate!: number

  @ForeignKey(() => Rate)
  @Column({ allowNull: false })
  rateId!: SupportedTokens
}

/**
 * This function generate a query that calculates the domain price in fiat for a specific currency
 * @param sequelize
 * @param currency
 */
export function getDomainPriceFiat (
  sequelize: Sequelize,
  currency: 'usd' | 'eur' | 'btc' = 'usd'
): Literal {
  return literal(`
    (
      SELECT
        CAST(
          SUM(
            (cast(priceString as REAL) / ${WEI}) * coalesce("rates".${sequelize.escape(currency)}, 0)
          )
          as REAL
        )
      FROM
        "rns_domain_offer"
      LEFT OUTER JOIN
        "rates" AS "rates" ON "rns_domain_offer"."rateId" = "rates"."token"
      WHERE
        id = "DomainOffer"."id"
    )
  `)
}
