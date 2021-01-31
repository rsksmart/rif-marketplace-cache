import Sequelize, { QueryInterface } from 'sequelize'
import DomainOffer from '../../services/rns/models/domain-offer.model'
import { getTokenSymbol } from '../../services/storage/utils'

export default {
  // eslint-disable-next-line require-await
  async up (queryInterface: QueryInterface): Promise<void> {
    await queryInterface.addColumn(
      'rns_domain_offer',
      'rateId',
      {
        type: Sequelize.STRING,
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
        references: {
          model: 'rates',
          key: 'token'
        },
        field: 'rateId'
      }
    )

    const domains = await DomainOffer.findAll()

    domains.forEach((domain) => {
      queryInterface.sequelize.query(`
        UPDATE "rns_domain_offer"
        SET "rateId" = ${getTokenSymbol(domain.paymentToken)}
        WHERE "id" = ${domain.id}
      `)
    })

    await queryInterface.addConstraint(
      'rns_domain_offer',
      {
        type: 'foreign key',
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
        references: {
          table: 'rates',
          field: 'token'
        },
        fields: ['rateId']
      }
    )
  },
  // eslint-disable-next-line require-await
  async down (queryInterface: QueryInterface): Promise<void> {
    return queryInterface.removeColumn('rns_domain_offer', 'rateId')
  }
}
