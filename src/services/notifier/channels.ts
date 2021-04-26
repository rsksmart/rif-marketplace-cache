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
    app.channel('notifier_subscriptions').join(connection)
  })
  app.service(ServiceAddresses.NOTIFIER_PROVIDERS).publish(() => app.channel('notifier_providers'))
  app.service(ServiceAddresses.NOTIFIER_OFFERS).publish(() => app.channel('notifier_offers'))
  app.service(ServiceAddresses.NOTIFIER_STAKES).publish(() => app.channel('notifier_stake'))
  app.service(ServiceAddresses.NOTIFIER_SUBSCRIPTIONS).publish(() => app.channel('notifier_subscriptions'))
}
