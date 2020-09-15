import { appFactory } from './app'
import config from 'config'
import { loggingFactory } from './logger'

(async function (): Promise<void> {
  const logger = loggingFactory()
  const { app } = await appFactory({ appResetCallBack: () => { throw new Error('Reset callback not implemented') } })
  // Start server
  const port = config.get('port')
  const server = app.listen(port)

  server.on('listening', () =>
    logger.info(`Server started on port ${port}`)
  )

  process.on('unhandledRejection', err =>
    logger.error(`Unhandled Rejection at: ${err}`)
  )
})()
