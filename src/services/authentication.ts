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
    const channels: [] = authentication.channels
    params.connection.ownerAddress = authentication.ownerAddress
    channels.forEach(channel => {
            this.app?.channel(channel).join(params.connection)
    })

    return Promise.resolve({ anonymous: true })
  }
}

export default function (app: Application) {
  const authentication = new AuthenticationService(app as any)

  app.set('authentication', {
    secret: '8a58b86565c23c9ea90',
    entity: null,
    authStrategies: ['anonymous']
  })
  authentication.register('anonymous', new AnonymousStrategy())
  app.use('/authentication', authentication)
}
