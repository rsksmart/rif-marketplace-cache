import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import { Application } from './definitions'
import { loggingFactory } from './logger'
import path from 'path'
import config from 'config'

const logger = loggingFactory('db')

export function sequelizeFactory (): Sequelize {
  const dbSettings: SequelizeOptions = {
    models: [path.join(__dirname, '/**/*.model.+(ts|js)')],
    modelMatch: (filename: string, member: string): boolean => {
      return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase()
    },
    logging: logger.debug
  }

  return new Sequelize(config.get('db'), dbSettings)
}

export default function (app: Application): void {
  const sequelize = sequelizeFactory()
  const oldSetup = app.setup

  app.set('sequelize', sequelize)

  app.setup = function (...args): ReturnType<Application['setup']> {
    const result = oldSetup.apply(this, args)

    // Set up data relationships
    const models = sequelize.models
    Object.keys(models).forEach(name => {
      if ('associate' in models[name]) {
        (models[name] as any).associate(models)
      }
    })
    // Sync to the database
    app.set('sequelizeSync', sequelize.sync())

    return result
  }
}
