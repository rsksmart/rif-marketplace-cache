import { DataType, Model, Sequelize, SequelizeOptions } from 'sequelize-typescript'
import { ModelAttributeColumnOptions } from 'sequelize'
import path from 'path'
import config from 'config'
import sqlFormatter from 'sql-formatter'
import BigNumber from 'bignumber.js'

import { Application } from './definitions'
import { loggingFactory } from './logger'
import { bn } from './utils'

const logger = loggingFactory('db')

function formatLogs (msg: string): string {
  const result = msg.match(/^Executing \(([\w\d-]+)\): (.*)/m)

  if (!result) {
    return msg
  }

  return `Executing SQL (${result[1]}):\n${sqlFormatter.format(result[2])}`
}

export function sequelizeFactory (): Sequelize {
  const dbSettings: SequelizeOptions = {
    models: [path.join(__dirname, '/**/*.model.+(ts|js)')],
    modelMatch: (filename: string, member: string): boolean => {
      return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase()
    },
    logging: (msg) => logger.debug(formatLogs(msg)),
    // @ts-ignore
    transactionType: 'IMMEDIATE'
  }

  return new Sequelize(config.get('db'), dbSettings)
}

export function BigNumberStringType (propName: string): Partial<ModelAttributeColumnOptions> {
  return {
    type: DataType.STRING(),
    get (this: Model): BigNumber {
      return bn(this.getDataValue(propName as any))
    },
    set (this: Model, value: string | number | BigNumber): void {
      const n = bn(value)

      if (isNaN(n.toNumber())) {
        throw new Error(`${this.constructor.name + ' ' || ''}Model Error: ${propName} should be a one of [number, string(number), BigNumber]`)
      }
      this.setDataValue(propName as any, bn(value).toString(10))
    }
  }
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
