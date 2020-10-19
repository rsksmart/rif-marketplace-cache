import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../../definitions'

const CHANNEL = 'notifications'

function filterByOwner (app: Application, data: any) {
  const account: string = data.account
  return app.channel(CHANNEL)
    .filter(connection => {
      const connectedAccount: string = connection.ownerAddress
      return Boolean(account && account === connectedAccount)
    })
}

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel(CHANNEL).join(connection)
  })
  app.service(ServiceAddresses.NOTIFICATION).publish((data) => {
    return filterByOwner(app, data)
  })
}
