import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import { Application } from './declarations'
import { factory } from './logger'
import path from 'path'
import config from 'config'

const logger = factory('db')

export default function (app: Application): void {
  const dbSettings: SequelizeOptions = Object.assign({
    models: [path.join(__dirname, '/models/**/*.model.ts')],
    modelMatch: (filename: string, member: string): boolean => {
      return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase()
    },
    logging: (sql: string) => logger.debug(sql)
  }, config.get('db'))

  const sequelize = new Sequelize(dbSettings)
  const oldSetup = app.setup

  app.set('sequelizeClient', sequelize)

  app.setup = function (...args): ReturnType<Application['setup']> {
    const result = oldSetup.apply(this, args)

    // Set up data relationships
    const models = sequelize.models
    Object.keys(models).forEach(name => {
      if ('associate' in models[name]) {
        (models[name] as any).associate(models)
      }
    })
    sequelize.sync({ force: true })

    // Sync to the database
    app.set('sequelizeSync', sequelize.sync())

    return result
  }
}
