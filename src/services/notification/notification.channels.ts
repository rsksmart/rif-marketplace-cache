import '@feathersjs/transport-commons'
import { Application, ServiceAddresses } from '../../definitions'
import Agreement from '../storage/models/agreement.model'

const CHANNEL = 'notifications'

async function filterByOwner (app: Application, data: any) {
  const agreementReference: string = data.payload.agreementReference
  const agreement = await Agreement.findOne({ where: { agreementReference } })
  return app.channel(CHANNEL)
    .filter(connection => {
      const connectedAccount: string = connection.ownerAddress
      return Boolean(agreement && agreement.consumer === connectedAccount)
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
