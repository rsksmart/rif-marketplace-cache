import { Application as ExpressFeathers } from '@feathersjs/express'
import { StorageOffer } from './services/storage-offer/storage-offer.service'
import { ServiceAddons } from '@feathersjs/feathers'

// A mapping of service names to types. Will be extended in service files.
interface ServiceTypes {
  'storage-offer': StorageOffer & ServiceAddons<any>
}
// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;
