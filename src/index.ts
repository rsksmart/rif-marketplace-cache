import logger from './logger'
import app from './app'
import config from 'config'

const port = config.get('port')
const server = app.listen(port)

process.on('unhandledRejection', (reason, p) =>
  logger.error(`Unhandled Rejection at: ${p}\n${reason}`)
)

server.on('listening', () =>
  logger.info('Feathers application started on http://%s:%d', config.get('host'), port)
)
