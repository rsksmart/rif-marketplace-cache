import { Application as ExpressFeathers } from '@feathersjs/express'
import { StorageOfferService } from './storage'
import { ServiceAddons } from '@feathersjs/feathers'

// A mapping of service names to types. Will be extended in service files.
interface ServiceTypes {
  'storage/v0/offers': StorageOfferService & ServiceAddons<any>
}
// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;

export interface Store {
  get (key: string): any
  set (key: string, value: any): void
}
