import compress from 'compression'
import helmet from 'helmet'
import cors, { CorsOptionsDelegate } from 'cors'
import config from 'config'

import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'

import { Application, ServiceAddresses, SupportedServices } from './definitions'
import { loggingFactory } from './logger'
import sequelize from './sequelize'
import blockchain from './blockchain'
import healthcheck from './healthcheck'
import { configureStore } from './store'
import { errorHandler } from './utils'

import authentication from './services/authentication'

import storage from './services/storage'
import rates from './services/rates'
import rns from './services/rns'
import { REORG_OUT_OF_RANGE_EVENT_NAME } from './blockchain/events'

const logger = loggingFactory()

export const services = {
  [SupportedServices.STORAGE]: storage,
  [SupportedServices.RATES]: rates,
  [SupportedServices.RNS]: rns
}

export type AppOptions = { appResetCallBack: (...args: any) => void }

export async function startApp (options: AppOptions): Promise<{ stop: () => void }> {
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

  // Authenticatoin service
  app.configure(authentication)

  // Custom general services
  app.configure(sequelize)
  app.configure(configureStore)
  app.configure(blockchain)
  app.configure(healthcheck)

  /**********************************************************/
  // Configure each services

  const servicePromises: Promise<{ stop: () => void }>[] = []
  for (const service of Object.values(services)) {
    app.configure((app) => servicePromises.push(errorHandler(service.initialize, logger)(app)))
  }

  // Wait for services to initialize
  const servicesInstances = await Promise.all(servicePromises)

  // Log errors in hooks
  app.hooks({
    error (context) {
      logger.error(`Error in '${context.path}' service method '${context.method}'`, context.error.stack)
    }
  })

  // Configure a middleware for 404s and the error handler
  app.use(express.notFound())
  app.use(express.errorHandler({ logger }))

  // Start server
  const port = config.get('port')
  const server = app.listen(port)

  server.on('listening', () =>
    logger.info(`Server started on port ${port}`)
  )

  process.on('unhandledRejection', err =>
    logger.error(`Unhandled Rejection at: ${err}`)
  )

  // Subscribe for reorg event
  const reorgService = app.service(ServiceAddresses.REORG_EMITTER)
  reorgService.on(REORG_OUT_OF_RANGE_EVENT_NAME, () => {
    // wait 5 seconds to be sure that reorg event received by connected services
    setTimeout(() => options.appResetCallBack(), 5000)
  })

  return {
    stop: () => {
      server.close()
      servicesInstances.forEach(service => service.stop())
    }
  }
}
