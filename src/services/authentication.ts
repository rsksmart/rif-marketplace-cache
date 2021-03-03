import config from 'config'
import { ServiceAddons, Params } from '@feathersjs/feathers'
import { AuthenticationService, AuthenticationBaseStrategy, AuthenticationRequest } from '@feathersjs/authentication'

import { Application } from '../definitions'

declare module '../definitions' {
    interface ServiceTypes {
        'authentication': AuthenticationService & ServiceAddons<any>
    }
}

class AnonymousStrategy extends AuthenticationBaseStrategy {
  authenticate (authentication: AuthenticationRequest, params: Params) {
    const { connection } = params

    if (connection) {
      connection.ownerAddress = authentication.ownerAddress.toLowerCase()
      this.app?.channel(`user/${authentication.ownerAddress.toLowerCase()}`).join(connection)
    }

    return Promise.resolve({ anonymous: true })
  }
}

/**
 * This is not used for auth purpose. Instead we use this for filtering of data
 */
export default function (app: Application) {
  const authentication = new AuthenticationService(app as any)

  app.set('authentication', {
    secret: config.get<string>('auth.secret'),
    entity: null,
    authStrategies: ['anonymous']
  })
  authentication.register('anonymous', new AnonymousStrategy())
  app.use('/authentication', authentication)
}
