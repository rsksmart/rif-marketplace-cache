import compress from 'compression'
import helmet from 'helmet'
import cors from 'cors'

import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'

import { Application } from './definitions'
import { loggingFactory } from './logger'
import sequelize from './sequelize'
import blockchain from './blockchain'
import { configure as confConfigure } from './conf'

import storage from './storage'
import rates from './rates'

const logger = loggingFactory()

export enum SupportedServices {
  STORAGE = 'storage',
  RATES = 'rates'
}

export const services = {
  [SupportedServices.STORAGE]: storage,
  [SupportedServices.RATES]: rates
}

export function isSupportedServices (value: any): value is SupportedServices {
  return Object.values(SupportedServices).includes(value)
}

export function appFactory (): Application {
  const app: Application = express(feathers())

  // Enable security, CORS, compression and body parsing
  app.use(helmet())
  app.use(cors())
  app.use(compress())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Set up Plugins and providers
  app.configure(express.rest())
  app.configure(socketio())

  // Custom general services
  app.configure(sequelize)
  app.configure(blockchain)
  app.configure(confConfigure)

  /**********************************************************/
  // Configure each services

  for (const service of Object.values(services)) {
    app.configure(service.initialize)
  }

  // Configure a middleware for 404s and the error handler
  app.use(express.notFound())
  app.use(express.errorHandler({ logger }))

  return app
}
