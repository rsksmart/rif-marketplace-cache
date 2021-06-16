import Sequelize, { QueryInterface } from 'sequelize'

export default {
  async up (queryInterface: QueryInterface): Promise<void> {
    await queryInterface.addColumn('notifier_subscription', 'signature', Sequelize.STRING)
  },

  async down (queryInterface: QueryInterface): Promise<void> {
    await queryInterface.removeColumn('notifier_subscription', 'signature')
  }
}
