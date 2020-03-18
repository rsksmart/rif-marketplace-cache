import { Service } from 'feathers-sequelize'
import Eth from 'web3-eth'
import { AbiItem } from 'web3-utils'
import config from 'config'
import StorageOffer from './models/storage-offer.model'
import { Application } from '../types'
import { loggingFactory } from '../logger'
import { getEventsEmitterForService } from '../blockchain/utils'

import hooks from './storage.hooks'
import eventProcessor from './storage.blockchain'
import pinningContractAbi from '@rsksmart/rif-martketplace-storage-pinning/build/contracts/PinningManager.json'

const logger = loggingFactory('storage')

export class StorageOfferService extends Service {
}

export default function (app: Application): void {
  if (!config.get<boolean>('storage.enabled')) {
    logger.info('Storage service: disabled')
    return
  }
  logger.info('Storage service: enabled')

  // Initialize feather's service
  app.use('/storage/v0/offers', new StorageOfferService({ Model: StorageOffer }))
  const service = app.service('storage/v0/offers')
  service.hooks(hooks)

  // Initialize blockchain watcher
  const eth = app.get('eth') as Eth
  const eventsEmitter = getEventsEmitterForService('storage', eth, pinningContractAbi.abi as AbiItem[])
  eventsEmitter.on('newEvent', eventProcessor)
  eventsEmitter.on('error', (e: Error) => {
    logger.error(`There was unknown error in Events Emitter! ${e}`)
  })
}
