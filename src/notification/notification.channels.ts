import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'

const CHANNEL = 'notifications'
const logger = loggingFactory('notification:channel')

function filterByOwner (app: Application, data: any) {
  const accounts: string[] = data.accounts
  logger.info('IN filter')
  return app.channel(CHANNEL)
    .filter(connection => {
      const connectedAccount: string = connection.ownerAddress.toLowerCase()
      logger.info(`accounts: ${accounts}, connected account: ${connectedAccount}`)
      return Boolean(accounts && accounts.includes(connectedAccount))
    })
}

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    logger.info('New connection: ', connection)
    app.channel(CHANNEL).join(connection)
  })
  app.service(ServiceAddresses.NOTIFICATION).publish((data) => {
    logger.info('In publish', data)
    return filterByOwner(app, data)
  })
}
