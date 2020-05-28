import '@feathersjs/transport-commons';
import { Application } from '../definitions';

export default function (app: Application) {
    if (typeof app.channel !== 'function') {
        // If no real-time functionality has been configured just return
        return;
    }
    app.on('connection', (connection: any) => {
        app.channel('offers').join(connection)
        app.channel('domains').join(connection)
        app.channel('sold').join(connection)
    })
    app.service('/rns/v0/offers').publish(() => app.channel(`offers`));
    app.service('/rns/v0/:ownerAddress/sold').publish(() => app.channel(`sold`));
    app.service('/rns/v0/:ownerAddress/domains').publish(() => app.channel(`domains`));
};
