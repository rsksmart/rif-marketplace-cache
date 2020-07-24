import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../../definitions'

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel('offers').join(connection)
    app.channel('sold').join(connection)
  })

  app.service(ServiceAddresses.RNS_DOMAINS).publish((data) => {
    return app.channel('domains')
      .filter(connection => {
        const connectedAccount: string = connection.ownerAddress
        const dataAccount: string = data.ownerAddress

        return connectedAccount && dataAccount && connectedAccount.toLowerCase() === dataAccount.toLowerCase()
      })
  })
  app.service(ServiceAddresses.RNS_SOLD).publish((data) => {
    return app.channel('domains')
      .filter(connection => {
        const connectedAccount: string = connection.ownerAddress
        const dataAccount: string = data.ownerAddress
        return connectedAccount && dataAccount && connectedAccount.toLowerCase() === dataAccount.toLowerCase()
      })
  })
  app.service(ServiceAddresses.RNS_OFFERS).publish(() => app.channel('offers'))
}
