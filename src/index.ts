import { loggingFactory } from './logger'
import { appFactory } from './app'
import config from 'config'

const logger = loggingFactory()
const app = appFactory()
const port = config.get('port')
const server = app.listen(port)

process.on('unhandledRejection', err =>
  logger.error(`Unhandled Rejection at: ${err}`)
)

server.on('listening', () =>
  logger.info('Feathers application started on port %d', port)
)
