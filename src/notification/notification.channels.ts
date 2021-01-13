import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'

const CHANNEL = 'notifications'
const logger = loggingFactory('notification:channel')

function filterByOwner (app: Application, data: any) {
  const accounts: string[] = data.accounts
  return app.channel(CHANNEL)
    .filter(connection => {
      const connectedAccount: string = connection.ownerAddress.toLowerCase()
      return Boolean(accounts && accounts.includes(connectedAccount))
    })
}

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    logger.debug('New connection: ', connection)
    app.channel(CHANNEL).join(connection)
  })
  app.service(ServiceAddresses.NOTIFICATION).publish((data) => {
    return filterByOwner(app, data)
  })
}
