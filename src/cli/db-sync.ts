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
    const { args } = this.parse(DBSync)

    if (args.db) {
      config.util.extendDeep(config, { db: args.db })
    }

    // Init database connection
    const sequelize = sequelizeFactory()
    this.log('Syncing database')
    await sequelize.sync({ force: args.force })
    this.log('Done')
    this.exit(0)
  }
}
