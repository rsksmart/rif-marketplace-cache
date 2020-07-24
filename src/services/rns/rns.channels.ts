import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../../definitions'

type RnsChannelName = 'domains' | 'sold' | 'offers'

function filterByOwner (app: Application, data: any, channelName: RnsChannelName) {
  return app.channel(channelName)
    .filter(connection => {
      const connectedAccount: string = connection.ownerAddress
      const dataAccount: string = data.ownerAddress

      return connectedAccount && dataAccount && connectedAccount.toLowerCase() === dataAccount.toLowerCase()
    })
}

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
    return filterByOwner(app, data, 'domains')
  })
  app.service(ServiceAddresses.RNS_SOLD).publish((data) => {
    return filterByOwner(app, data, 'sold')
  })
  app.service(ServiceAddresses.RNS_OFFERS).publish(() => app.channel('offers'))
}
