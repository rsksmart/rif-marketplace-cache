import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../../definitions'

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel('offers').join(connection)
    app.channel('domains').join(connection)
    app.channel('sold').join(connection)
  })
  app.service(ServiceAddresses.RNS_OFFERS).publish(() => app.channel('offers'))
  app.service(ServiceAddresses.RNS_DOMAINS).publish(() => app.channel('domains'))
  app.service(ServiceAddresses.RNS_SOLD).publish(() => app.channel('sold'))
}
