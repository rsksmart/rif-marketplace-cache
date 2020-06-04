import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import config from 'config'
import { Service } from 'feathers-sequelize'
import { getObject } from 'sequelize-store'
import Eth from 'web3-eth'
import { EventData } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import { ethFactory } from '../../blockchain'
import { getEventsEmitterForService, isServiceInitialized } from '../../blockchain/utils'
import { Application, CachedService, ServiceAddresses } from '../../definitions'
import { loggingFactory } from '../../logger'
import { errorHandler, waitForReadyApp } from '../../utils'
import StorageOffer from '../storage/models/offer.model'
import Agreement from './models/agreement.model'
import Offer from './models/offer.model'
import BillingPlan from './models/price.model'
import hooks from './storage.hooks'
import eventProcessor from './storage.processor'

export class OfferService extends Service {
}

const SERVICE_NAME = 'storage'

const logger = loggingFactory(SERVICE_NAME)

function precache (possibleEth?: Eth): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const eth = possibleEth || ethFactory()
    const eventsEmitter = getEventsEmitterForService(SERVICE_NAME, eth, storageManagerContract.abi as AbiItem[])

    const dataQueue: EventData[] = []
    const dataQueuePusher = (event: EventData): void => { dataQueue.push(event) }

    eventsEmitter.on('initFinished', async () => {
      eventsEmitter.off('newEvent', dataQueuePusher)

      // Needs to be sequentially processed
      const processor = eventProcessor(eth)
      try {
        for (const event of dataQueue) {
          await processor(event)
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

    await waitForReadyApp(app)

    // Initialize feather's service
    app.use(ServiceAddresses.STORAGE_OFFERS, new OfferService({ Model: StorageOffer }))
    const service = app.service(ServiceAddresses.STORAGE_OFFERS)
    service.hooks(hooks)

    // Initialize blockchain watcher
    const eth = app.get('eth') as Eth

    // We require services to be precached before running server
    if (!isServiceInitialized(SERVICE_NAME)) {
      logger.critical('Storage service is not initialized! Rune precache command.')
    }

    const eventsEmitter = getEventsEmitterForService(SERVICE_NAME, eth, storageManagerContract.abi as AbiItem[])
    eventsEmitter.on('newEvent', errorHandler(eventProcessor(eth), logger))
    eventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })
  },

  async purge (): Promise<void> {
    const priceCount = await BillingPlan.destroy({ where: {}, truncate: true, cascade: true })
    const agreementsCount = await Agreement.destroy({ where: {}, truncate: true, cascade: true })
    const offersCount = await Offer.destroy({ where: {}, truncate: true, cascade: true })
    logger.info(`Removed ${priceCount} billing plans entries, ${offersCount} offers and ${agreementsCount} agreements`)

    const store = getObject()
    delete store['storage.lastProcessedBlock']
  },

  precache
}

export default storage
