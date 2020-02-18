import compress from 'compression'
import helmet from 'helmet'
import cors from 'cors'

import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'

import { Application } from './declarations'
import logger from './logger'
import middleware from './middleware'
import services from './services'
import appHooks from './app.hooks'
import sequelize from './sequelize'
import blockchain from './blockchain/'
import conf from './conf'
// Don't remove this comment. It's needed to format import lines nicely.

const app: Application = express(feathers())

// Enable security, CORS, compression, favicon and body parsing
app.use(helmet())
app.use(cors())
app.use(compress())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Set up Plugins and providers
app.configure(express.rest())
app.configure(socketio())

app.configure(sequelize)
app.configure(conf)

// Configure other middleware (see `middleware/index.js`)
app.configure(middleware)
// Set up our services (see `services/index.js`)
app.configure(services)

// Configure a middleware for 404s and the error handler
app.use(express.notFound())
app.use(express.errorHandler({ logger } as any))

app.hooks(appHooks)

// Blockchain watcher
app.configure(blockchain)

export default app
