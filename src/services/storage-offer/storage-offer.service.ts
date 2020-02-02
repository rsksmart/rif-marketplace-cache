// Initializes the `StorageOffer` service on path `/storage-offer`
import StorageOffer from '../../models/storage-offer.model'
import hooks from './storage-offer.hooks'
import { Service, SequelizeServiceOptions } from 'feathers-sequelize'
import { Application } from '../../declarations'

export class StorageOfferService extends Service {
  constructor (options: Partial<SequelizeServiceOptions>, app: Application) {
    super(options)
  }
}

export default function (app: Application) {
  const options = {
    Model: StorageOffer
    // Can't be used atm because of https://github.com/sequelize/sequelize/issues/11894
    // paginate: app.get('paginate')
  }

  // Initialize our service with any options it requires
  app.use('/storage-offer', new StorageOfferService(options, app))

  // Get our initialized service so that we can register hooks
  const service = app.service('storage-offer')

  service.hooks(hooks)
}
