import { QueryInterface } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'

export default {
  // eslint-disable-next-line require-await
  async up (queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
    const transaction = await sequelize.transaction()
    try {
      await sequelize.query('UPDATE storage_offer SET provider = lower(provider)', { transaction })
      await sequelize.query('UPDATE "storage_billing-plan" SET tokenAddress = lower(tokenAddress), offerId = lower(offerId)', { transaction })
      await sequelize.query('UPDATE storage_agreement SET consumer = lower(consumer), tokenAddress = lower(tokenAddress), offerId = lower(offerId)', { transaction })
      await sequelize.query('UPDATE storage_stakes SET account = lower(account), token = lower(token)', { transaction })

      await transaction.commit()
    } catch (e) {
      await transaction.rollback()
      throw e
    }
  },
  // Lower-casing can not be restored
  // eslint-disable-next-line require-await,@typescript-eslint/no-empty-function
  async down (queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {}
}
