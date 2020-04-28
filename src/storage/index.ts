import { Service } from 'feathers-sequelize'
import Eth from 'web3-eth'
import { AbiItem } from 'web3-utils'
import config from 'config'
import { EventData } from 'web3-eth-contract'

import StorageOffer from './models/storage-offer.model'
import { Application, CachedService } from '../definitions'
import { loggingFactory } from '../logger'
import { getEventsEmitterForService, isServiceInitialized } from '../blockchain/utils'
import hooks from './storage.hooks'
import eventProcessor from './storage.blockchain'
import Price from './models/price.model'
import { confFactory } from '../conf'
import { ethFactory } from '../blockchain'
import { errorHandler } from '../utils'

import pinningContractAbi from '@rsksmart/rif-marketplace-storage-pinning/build/contracts/PinningManager.json'

export class StorageOfferService extends Service {
}

const SERVICE_NAME = 'storage'

const logger = loggingFactory(SERVICE_NAME)

function precache (eth?: Eth): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    eth = eth || ethFactory()
    const eventsEmitter = getEventsEmitterForService(SERVICE_NAME, eth, pinningContractAbi.abi as AbiItem[])

    const dataQueue: EventData[] = []
    const dataQueuePusher = (event: EventData): void => { dataQueue.push(event) }

    eventsEmitter.on('initFinished', async () => {
      eventsEmitter.off('newEvent', dataQueuePusher)

      // Needs to be sequentially processed
      try {
        for (const event of dataQueue) {
          await eventProcessor(event)
        }
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    eventsEmitter.on('newEvent', dataQueuePusher)
    eventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })
  })
}

const storage: CachedService = {
  async initialize (app: Application): Promise<void> {
    if (!config.get<boolean>('storage.enabled')) {
      logger.info('Storage service: disabled')
      return
    }
    logger.info('Storage service: enabled')

    // Initialize feather's service
    app.use('/storage/v0/offers', new StorageOfferService({ Model: StorageOffer }))
    const service = app.service('/storage/v0/offers')
    service.hooks(hooks)

    // Initialize blockchain watcher
    const eth = app.get('eth') as Eth

    if (!isServiceInitialized(SERVICE_NAME)) {
      logger.info('Precaching service')
      await precache(eth)
      logger.info('Precaching finished service')
    }

    const eventsEmitter = getEventsEmitterForService(SERVICE_NAME, eth, pinningContractAbi.abi as AbiItem[])
    eventsEmitter.on('newEvent', errorHandler(eventProcessor, logger))
    eventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })
  },

  async purge (): Promise<void> {
    const priceCount = await Price.destroy({ where: {}, truncate: true, cascade: true })
    const offersCount = await StorageOffer.destroy({ where: {}, truncate: true, cascade: true })
    logger.info(`Removed ${priceCount} price entries and ${offersCount} storage offers`)

    confFactory().delete(SERVICE_NAME)
  },

  precache
}

export default storage
