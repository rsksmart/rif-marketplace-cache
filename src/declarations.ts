import { Application as ExpressFeathers } from '@feathersjs/express'
import { StorageOfferService } from './services/storage-offer/storage-offer.service'
import { ServiceAddons } from '@feathersjs/feathers'
import { Eth } from 'web3-eth'

// A mapping of service names to types. Will be extended in service files.
interface ServiceTypes {
  'storage-offer': StorageOfferService & ServiceAddons<any>
}
// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;
