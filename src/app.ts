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
import { configureStore } from './store'

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

export function appFactory (): Application {
  const app: Application = express(feathers())

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

  // Custom general services
  app.configure(sequelize)
  app.configure(blockchain)
  app.configure(configureStore)

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
