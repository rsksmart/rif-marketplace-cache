import { ServiceAddons, Params } from '@feathersjs/feathers';
import { AuthenticationService, JWTStrategy, AuthenticationResult } from '@feathersjs/authentication';
import { Application } from '../definitions';

declare module '../definitions' {
    interface ServiceTypes {
        'authentication': AuthenticationService & ServiceAddons<any>;
    }
}

class MyJWT extends JWTStrategy {
    async authenticate(authentication: AuthenticationResult, params: Params) {
        console.log('MyJWT -> authenticate------------------------------')
        console.log(authentication)
        console.log('------------------------------')
        console.log(params)
        console.log('------------------------------')
        return super.authenticate(authentication, params)
    }
}

class MyAuthService extends AuthenticationService {
    async getPayload(authResult, params) {

        console.log('MyAuthService -> getPayload------------------------------')
        console.log(authResult)
        console.log('------------------------------')
        console.log(params)
        console.log('------------------------------')
        // Call original `getPayload` first
        const payload = await super.getPayload(authResult, params);
        const { user } = authResult;

        if (user && user.permissions) {
            payload.permissions = user.permissions;
        }

        return payload;
    }
}

export default function (app: Application) {
    const authentication = new MyAuthService(app as any) //FIXME: remove `as any`

    app.set('authentication', {
        "secret": "8a58b86565c23c9ea90",
        "entity": null,
        "authStrategies": ["jwt"],
        "jwtOptions": {
            "header": { "typ": "access" },
            "audience": "https://yourdomain.com",
            "issuer": "feathers",
            "algorithm": "HS256",
            "expiresIn": "1d"
        }
    })

    authentication.register('jwt', new MyJWT());

    app.use('/authentication', authentication);
}