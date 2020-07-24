import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../../definitions'

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel('offers').join(connection)
    // app.channel('domains').join(connection)
    app.channel('sold').join(connection)
  })

  app.service(ServiceAddresses.RNS_DOMAINS).publish((data, context) => {
    // Filter the channels to only authenticated
    return app.channel(`domains`)
      .filter(connection => {
        const connectedAccount: string = connection.ownerAddress
        const dataAccount: string = data.ownerAddress
        console.log('----------------------')
        console.log('rns.channels.ts -> domains publish -> connectedAccount:', connectedAccount)
        console.log('rns.channels.ts -> domains publish -> dataAccount:', dataAccount)
        console.log('----------------------')
        return connectedAccount && dataAccount && connectedAccount.toLowerCase() === dataAccount.toLowerCase()
      })
  })
  app.service(ServiceAddresses.RNS_OFFERS).publish(() => app.channel('offers'))
  // app.service(ServiceAddresses.RNS_DOMAINS).publish(() => app.channel('domains'))
  app.service(ServiceAddresses.RNS_SOLD).publish(() => app.channel('sold'))
}
