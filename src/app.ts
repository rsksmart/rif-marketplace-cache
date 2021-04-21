import compress from 'compression'
import helmet from 'helmet'
import cors, { CorsOptionsDelegate } from 'cors'
import config from 'config'
import { Web3Events, REORG_OUT_OF_RANGE_EVENT_NAME } from '@rsksmart/web3-events'
import { Sequelize } from 'sequelize'

import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'

import { Application, ServiceAddresses, SupportedServices } from './definitions'
import { loggingFactory } from './logger'
import sequelize from './sequelize'
import blockchain from './blockchain'
import healthcheck from './healthcheck'
import { DbBackUpJob, initBackups } from './db-backup'
import comms, { stop as commsStop } from './communication'
import { configureStore } from './store'
import { errorHandler, resolvePath, waitForConfigure } from './utils'

import authentication from './services/authentication'

import storage from './services/storage'
import rates from './rates'
import rns from './services/rns'
import notifier from './services/notifier'
import notification from './notification'
import { Eth } from 'web3-eth'
import * as fs from 'fs'

const logger = loggingFactory()

export const services = {
  [SupportedServices.STORAGE]: storage,
  [SupportedServices.RNS]: rns,
  [SupportedServices.TRIGGERS]: notifier
}

export interface AppOptions {
  appResetCallBack: (...args: any) => void
  requirePrecache?: boolean
}

export interface AppReturns {
  app: Application
  backups: DbBackUpJob
  stop: () => Promise<void>
}

export async function appFactory (options: AppOptions): Promise<AppReturns> {
  const app: Application = express(feathers())

  logger.verbose('Current configuration: ', config)
  const corsOptions: CorsOptionsDelegate = config.get('cors')

  // Create dataDir if it does not exist
  const dataDir = resolvePath()
  try {
    await fs.promises.access(dataDir)
  } catch (e) {
    if (e.code === 'ENOENT') {
      await fs.promises.mkdir(dataDir, { recursive: true })
    }
  }

  // Enable security, CORS, compression and body parsing
  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(compress())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Set up Plugins and providers
  app.configure(express.rest())
  app.configure(socketio())

  // Authentication service
  app.configure(authentication)

  // Custom general services
  app.configure(sequelize)
  app.configure(configureStore)
  await waitForConfigure(app, blockchain)
  const { stop: stopRates } = await waitForConfigure(app, rates.initialize)
  app.configure(initBackups)
  app.configure(healthcheck)
  app.configure(notification)
  app.configure(comms)

  /**********************************************************/
  // Configure each services

  // If precache is required, then do it
  if (options.requirePrecache) {
    logger.info('Precache required! Starting...')
    const eth = app.get('eth') as Eth
    const web3events = app.get('web3events') as Web3Events

    const toBePrecache = (Object.keys(services) as Array<keyof typeof services>)
      .filter(service => config.get<boolean>(`${service}.enabled`))
    await Promise.all(
      toBePrecache.map((service) => services[service].precache(eth, web3events).toPromise())
    )
  }

  const servicePromises: Promise<{ stop: () => void }>[] = []
  for (const service of Object.values(services)) {
    app.configure((app) => servicePromises.push(errorHandler(service.initialize, logger)(app)))
  }

  // Wait for services to initialize
  const servicesInstances = await Promise.all(servicePromises)

  // Log errors in hooks
  app.hooks({
    error (context) {
      logger.error(`Error in '${context.path}' service method '${context.method}'`, { stack: context.error.stack })
      delete context.error.stack
      delete context.error.hook
    }
  })

  // Configure a middleware for 404s and the error handler
  app.use(express.notFound())
  app.use(express.errorHandler({ logger }))

  // Subscribe for reorg event
  const reorgService = app.service(ServiceAddresses.REORG_EMITTER)
  reorgService.on(REORG_OUT_OF_RANGE_EVENT_NAME, () => {
    // wait 5 seconds to be sure that reorg event received by connected services
    setTimeout(() => options.appResetCallBack(), 5000)
  })

  return {
    app,
    backups: app.get('backups') as DbBackUpJob,
    stop: async (): Promise<void> => {
      const sequelize = app.get('sequelize') as Sequelize
      await stopRates()
      await sequelize.close()
      await commsStop(app)
      servicesInstances.forEach(service => service.stop())
    }
  }
}
