import path from 'path'
import Umzug from 'umzug'

import { loggingFactory } from '../logger'
import { Sequelize } from 'sequelize'

const logger = loggingFactory('db:migrations')

type UpOptions = string | string[] | Umzug.UpToOptions | Umzug.UpDownMigrationsOptions
type DownOptions = string | string[] | Umzug.DownToOptions | Umzug.UpDownMigrationsOptions

export default class Migration {
  private readonly umzugIns: Umzug.Umzug

  constructor (sequelize: Sequelize) {
    this.umzugIns = new Umzug({
      storage: 'sequelize',
      logging: logger.info,
      storageOptions: { sequelize },
      migrations: {
        path: path.resolve(__dirname, './scripts'),
        params: [sequelize.getQueryInterface(), sequelize],
        pattern: /^\d+[\w-]+\.ts$/
      }
    })
  }

  // eslint-disable-next-line require-await
  async up (options?: UpOptions): Promise<Umzug.Migration[]> {
    return this.umzugIns.up(options as any)
  }

  // eslint-disable-next-line require-await
  async down (options?: DownOptions): Promise<Umzug.Migration[]> {
    return this.umzugIns.down(options as any)
  }

  get on (): Function {
    return this.umzugIns.on
  }

  // eslint-disable-next-line require-await
  async pending (): Promise<Umzug.Migration[]> {
    return this.umzugIns.pending().catch((e: any) => {
      if (e.code === 'ENOENT') {
        return []
      }
      return Promise.reject(e)
    })
  }

  // eslint-disable-next-line require-await
  async executed (): Promise<Umzug.Migration[]> {
    return this.umzugIns.executed()
  }
}
