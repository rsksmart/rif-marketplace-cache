import { Application } from '../types'
import storageOffer from './storage-offer/storage-offer.service'
// Don't remove this comment. It's needed to format import lines nicely.

export default function (app: Application): void {
  app.configure(storageOffer)
}
