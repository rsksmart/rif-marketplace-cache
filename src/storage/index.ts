import { Service } from 'feathers-sequelize'
import Eth from 'web3-eth'
import { AbiItem } from 'web3-utils'
import config from 'config'
import { EventData } from 'web3-eth-contract'

import StorageOffer from './models/storage-offer.model'
import { Application, CachedService } from '../types'
import { loggingFactory } from '../logger'
import { getEventsEmitterForService } from '../blockchain/utils'
import hooks from './storage.hooks'
import eventProcessor from './storage.blockchain'
import Price from './models/price.model'
import confFactory from '../conf'
import { ethFactory } from '../blockchain'

import pinningContractAbi from '@rsksmart/rif-marketplace-storage-pinning/build/contracts/PinningManager.json'

const logger = loggingFactory('storage')

export class StorageOfferService extends Service {
}

const storage: CachedService = {
  initialize (app: Application): void {
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
  },

  async purge (): Promise<void> {
    const priceCount = await Price.destroy({ where: {}, truncate: true, cascade: true })
    const offersCount = await StorageOffer.destroy({ where: {}, truncate: true, cascade: true })
    logger.info(`Removed ${priceCount} price entries and ${offersCount} storage offers`)

    confFactory().delete('storage')
  },

  precache (): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const eth = ethFactory()
      const eventsEmitter = getEventsEmitterForService('storage', eth, pinningContractAbi.abi as AbiItem[])

      const dataQueue: EventData[] = []
      const dataQueuePusher = (event: EventData) => { dataQueue.push(event) }

      eventsEmitter.on('initFinished', () => {
        eventsEmitter.off('newEvent', dataQueuePusher)

        Promise.all(dataQueue.map(eventProcessor)).then(() => resolve()).catch(err => reject(err))
      })
      eventsEmitter.on('newEvent', dataQueuePusher)
      eventsEmitter.on('error', (e: Error) => {
        logger.error(`There was unknown error in Events Emitter! ${e}`)
      })
    })
  }
}

export default storage
