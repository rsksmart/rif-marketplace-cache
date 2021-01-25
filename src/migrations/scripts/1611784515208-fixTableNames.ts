import { QueryInterface } from 'sequelize'

export default {
  // eslint-disable-next-line require-await
  async up (queryInterface: QueryInterface): Promise<void> {
    await queryInterface.renameTable('storage_billing-plan', 'storage_billing_plan')
    await queryInterface.renameTable('rns_sold-domain', 'rns_domain_sold')
    return queryInterface.renameTable('rns_domain-offer', 'rns_domain_offer')
  },
  // eslint-disable-next-line require-await
  async down (queryInterface: QueryInterface): Promise<void> {
    await queryInterface.renameTable('storage_billing_plan', 'storage_billing-plan')
    await queryInterface.renameTable('rns_domain_sold', 'rns_sold-domain')
    return queryInterface.renameTable('rns_domain_offer', 'rns_domain-offer')
  }
}
