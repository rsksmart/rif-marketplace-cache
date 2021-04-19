import '@feathersjs/transport-commons'

import { Application, ServiceAddresses } from '../../definitions'

export default function (app: Application) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel('notifier_providers').join(connection)
    app.channel('notifier_stake').join(connection)
    app.channel('notifier_offers').join(connection)
  })
  app.service(ServiceAddresses.TRIGGERS_PROVIDERS).publish(() => app.channel('notifier_providers'))
  app.service(ServiceAddresses.TRIGGERS_OFFERS).publish(() => app.channel('notifier_offers'))
  app.service(ServiceAddresses.TRIGGERS_STAKES).publish(() => app.channel('notifier_stake'))
}
