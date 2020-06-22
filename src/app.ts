import compress from 'compression'
import helmet from 'helmet'
import cors, { CorsOptionsDelegate } from 'cors'
import config from 'config'

import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'

import { Application } from './definitions'
import { loggingFactory } from './logger'
import sequelize from './sequelize'
import blockchain from './blockchain'
import healthcheck from './healthcheck'
import { configureStore } from './store'
import { errorHandler } from './utils'

import storage from './services/storage'
import rates from './services/rates'
import rns from './services/rns'

const logger = loggingFactory()

export enum SupportedServices {
  STORAGE = 'storage',
  RATES = 'rates',
  RNS = 'rns'
}

export const services = {
  [SupportedServices.STORAGE]: storage,
  [SupportedServices.RATES]: rates,
  [SupportedServices.RNS]: rns
}

export function isSupportedServices (value: any): value is SupportedServices {
  return Object.values(SupportedServices).includes(value)
}

export async function appFactory (): Promise<Application> {
  const app: Application = express(feathers())

  logger.verbose('Current configuration: ', config)
  const corsOptions: CorsOptionsDelegate = config.get('cors')

  // Enable security, CORS, compression and body parsing
  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(compress())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Set up Plugins and providers
  app.configure(express.rest())
  app.configure(socketio())

  // Log errors in hooks
  app.hooks({
    error (context) {
      logger.error(`Error in '${context.path}' service method '${context.method}'`, context.error.stack)
    }
  })

  // Custom general services
  app.configure(sequelize)
  app.configure(blockchain)
  app.configure(configureStore)
  app.configure(healthcheck)

  /**********************************************************/
  // Configure each services

  const servicePromises: Promise<void>[] = []
  for (const service of Object.values(services)) {
    app.configure((app) => servicePromises.push(errorHandler(service.initialize, logger)(app)))
  }

  // Wait for services to initialize
  await Promise.all(servicePromises)

  // Configure a middleware for 404s and the error handler
  app.use(express.notFound())
  app.use(express.errorHandler({ logger }))

  return app
}
