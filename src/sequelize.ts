import { DataType, Model, Sequelize as TSSequelize, SequelizeOptions } from 'sequelize-typescript'
import { ModelAttributeColumnOptions, Sequelize } from 'sequelize'
import BigNumber from 'bignumber.js'
import path from 'path'
import config from 'config'
import sqlFormatter from 'sql-formatter'

import { Application } from './definitions'
import { loggingFactory } from './logger'

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

  return new TSSequelize(`sqlite:${config.get('db')}`, dbSettings) as unknown as Sequelize
}

/**
 * BigNumber getter/setter functions for sequelize column declaration
 * @param propName
 */
export function bigNumberGetterSetter (propName: string): Partial<ModelAttributeColumnOptions> {
  return {
    get (this: Model): BigNumber {
      return new BigNumber(this.getDataValue(propName as any))
    },
    set (this: Model, value: string | number | BigNumber): void {
      const n = new BigNumber(value)

      if (isNaN(n.toNumber())) {
        throw new Error(`${this.constructor.name + ' ' || ''}Model Error: ${propName} should be a one of [number, string(number), BigNumber]`)
      }
      this.setDataValue(propName as any, n.toString(10))
    }
  }
}

/**
 * consider that the field will be stored as string in the data base,
 * so you not be able to use number comparision when querying
 * BigNumberStringType for sequelize models
 * @param propName
 * @constructor
 */
export function BigNumberStringType (propName: string): Partial<ModelAttributeColumnOptions> {
  return {
    type: DataType.STRING(),
    ...bigNumberGetterSetter(propName)
  }
}

/**
 * Consider that the field will be stored as BigInt in the database. 
 * Based on the database engine this might have limited precision. 
 * Using comparison and ordering is supported.
 * @param propName
 * @constructor
 */
export function BigNumberBigIntType (propName: string): Partial<ModelAttributeColumnOptions> {
  return {
    type: DataType.BIGINT(),
    ...bigNumberGetterSetter(propName)
  }
}

/**
 * consider that the field will be stored as string separated by '|' symbol in the database,
 * so you not be able to use array comparision when querying
 * ArrayStringType for sequelize models
 * @param propName
 * @constructor
 */
export function ArrayStringType (propName: string): Partial<ModelAttributeColumnOptions> {
  const separator = '|'
  return {
    type: DataType.STRING(),
    get (this: Model): Array<string> {
      return this.getDataValue(propName as any).split(separator)
    },
    set (this: Model, value: string[]): void {
      const invalidEl = value.find(el => el.indexOf(separator) !== -1)

      if (invalidEl) {
        throw new Error(`Element ${invalidEl} should not containe separator symbol (${separator})`)
      }
      this.setDataValue(propName as any, value.join(separator))
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
