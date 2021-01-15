import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'

const CHANNEL = 'notifications'
const logger = loggingFactory('notification:channel')

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
    return data.accounts.map((acc: string) => app.channel(`user/${acc}`))
  })
}
