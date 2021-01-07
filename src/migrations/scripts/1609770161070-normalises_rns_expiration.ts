import { QueryInterface } from 'sequelize'
import { DataType, Sequelize } from 'sequelize-typescript'

export default {
  // eslint-disable-next-line require-await
  async up (
    queryInterface: QueryInterface,
    sequelize: Sequelize
  ): Promise<void> {
    const transaction = await sequelize.transaction()
    try {
      await queryInterface.addColumn('rns_domain', 'expirationDate', {
        type: DataType.DATE
      }, { transaction })
      await sequelize.query(`
        UPDATE rns_domain
        SET expirationDate = (
          SELECT rns_domain_expiration.date
          FROM rns_domain_expiration
          WHERE rns_domain_expiration.tokenId = rns_domain.tokenId
          )
        WHERE EXISTS (
          SELECT *
          FROM rns_domain_expiration
          WHERE rns_domain_expiration.tokenId = rns_domain.tokenId
        )
      `, { transaction })
      await queryInterface.dropTable('rns_domain_expiration', { transaction })

      await transaction.commit()
    } catch (e) {
      await transaction.rollback()
      throw e
    }
  },

  // eslint-disable-next-line require-await
  async down (queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
    return Promise.reject(Error('Not implemented'))
  }
}
