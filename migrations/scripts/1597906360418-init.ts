import { QueryInterface } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'

export default {
  // eslint-disable-next-line require-await
  async up (queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
    await sequelize.sync({ force: true })
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async down (): Promise<void> {}
}
