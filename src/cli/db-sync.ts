import { sequelizeFactory } from '../sequelize'
import { BaseCLICommand } from '../utils'
import { flags } from '@oclif/command'
import config from 'config'

export default class DBSync extends BaseCLICommand {
  static description = 'synchronize database schema'

  static flags = {
    db: flags.string({ description: 'database connection URI', env: 'RIFM_DB' }),
    force: flags.boolean({ description: 'removes all tables and recreates them' }),
    ...BaseCLICommand.flags
  }

  async run (): Promise<void> {
    const { flags } = this.parse(DBSync)

    if (flags.db) {
      config.util.extendDeep(config, { db: flags.db })
    }

    // Init database connection
    const sequelize = sequelizeFactory()
    this.log('Syncing database')
    await sequelize.sync({ force: flags.force })
    this.log('Done')
    this.exit(0)
  }
}
