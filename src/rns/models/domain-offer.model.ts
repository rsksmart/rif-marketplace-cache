import { Table, DataType, Column, Model, Scopes, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Op } from 'sequelize'

import Domain from './domain.model'

@Scopes(() => ({
  active: {
    where: {
      price: { [Op.gt]: 0 }
    },
    include: [
      {
        model: Domain,
        required: true
      }
    ]
  }
}))
@Table({ freezeTableName: true, tableName: 'domain-offer' })
export default class DomainOffer extends Model {
  @Column({ primaryKey: true, type: DataType.STRING })
  domain!: string

  @ForeignKey(() => Domain)
  @Column
  seller!: string

  @BelongsTo(() => Domain)
  domain: Domain

  @Column
  sellerAddress: string

  @Column
  tokenId!: number

  @Column
  paymentToken!: string

  @Column({ type: DataType.DECIMAL })
  price!: number

  @Column({ type: DataType.BIGINT })
  creationDate: number

  @Column({ type: DataType.ENUM('COMPLETED', 'CANCELED') })
  status: string
}
