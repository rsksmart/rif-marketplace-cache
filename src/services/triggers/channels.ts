import '@feathersjs/transport-commons'

import { Application, ServiceAddresses } from '../../definitions'

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel('triggers_providers').join(connection)
    app.channel('triggers_stake').join(connection)
  })
  app.service(ServiceAddresses.TRIGGERS_PROVIDERS).publish(() => app.channel('triggers_providers'))
  app.service(ServiceAddresses.TRIGGERS_STAKES).publish(() => app.channel('triggers_stake'))
}
