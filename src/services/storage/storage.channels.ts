import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../../definitions'

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel('storage_agreements').join(connection)
    app.channel('storage_offers').join(connection)
  })
  app.service(ServiceAddresses.STORAGE_OFFERS).publish(() => app.channel('storage_offers'))
  app.service(ServiceAddresses.STORAGE_AGREEMENTS).publish(() => app.channel('storage_agreements'))
}
