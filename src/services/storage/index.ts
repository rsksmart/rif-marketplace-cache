import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import config from 'config'
import { Service } from 'feathers-sequelize'
import { getObject } from 'sequelize-store'
import Eth from 'web3-eth'
import { EventData } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'

import { ethFactory } from '../../blockchain'
import { getEventsEmitterForService, isServiceInitialized } from '../../blockchain/utils'
import { REORG_OUT_OF_RANGE_EVENT_NAME } from '../../blockchain/events'
import { Application, CachedService, ServiceAddresses } from '../../definitions'
import { loggingFactory } from '../../logger'
import { errorHandler, waitForReadyApp } from '../../utils'
import Agreement from './models/agreement.model'
import Offer from './models/offer.model'
import BillingPlan from './models/billing-plan.model'
import offerHooks from './hooks/offers.hooks'
import agreementHooks from './hooks/agreements.hooks'
import eventProcessor from './storage.processor'
import storageChannels from './storage.channels'

export class OfferService extends Service {
  emit?: Function
}

export class AgreementService extends Service {
  emit?: Function
}

export interface StorageServices {
  agreementService: AgreementService
  offerService: OfferService
}

const SERVICE_NAME = 'storage'

const logger = loggingFactory(SERVICE_NAME)

function precache (possibleEth?: Eth): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const eth = possibleEth || ethFactory()
    const eventsEmitter = getEventsEmitterForService(`${SERVICE_NAME}.storageManager`, eth, storageManagerContract.abi as AbiItem[])
    // const eventsEmitter = getEventsEmitterForService(`${SERVICE_NAME}.stake`, eth, storageManagerContract.abi as AbiItem[])

    const dataQueue: EventData[] = []
    const dataQueuePusher = (event: EventData): void => { dataQueue.push(event) }

    const services: StorageServices = {
      // stakeService: new StakeService({ Model: Stake }),
      offerService: new OfferService({ Model: Offer }),
      agreementService: new AgreementService({ Model: Agreement })
    }

    eventsEmitter.on('initFinished', async () => {
      eventsEmitter.off('newEvent', dataQueuePusher)

      // Needs to be sequentially processed
      const processor = eventProcessor(services, eth)
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
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>('storage.enabled')) {
      logger.info('Storage service: disabled')
      return { stop: () => undefined }
    }
    logger.info('Storage service: enabled')

    await waitForReadyApp(app)

    // Initialize Offer service
    app.use(ServiceAddresses.STORAGE_OFFERS, new OfferService({ Model: Offer }))
    const offerService = app.service(ServiceAddresses.STORAGE_OFFERS)
    offerService.hooks(offerHooks)

    // Initialize Agreement service
    app.use(ServiceAddresses.STORAGE_AGREEMENTS, new AgreementService({ Model: Agreement }))
    const agreementService = app.service(ServiceAddresses.STORAGE_AGREEMENTS)
    agreementService.hooks(agreementHooks)

    // Initialize Staking service
    // app.use(ServiceAddresses.STORAGE_STAKES, new StakingService({ Model: Staking }))
    // const stakingService = app.service(ServiceAddresses.STORAGE_STAKES)
    // stakingService.hooks(stakingHooks)

    const services = { offerService, agreementService } // stakingService

    app.configure(storageChannels)

    const reorgEmitterService = app.service(ServiceAddresses.REORG_EMITTER)

    // We require services to be precached before running server
    if (!isServiceInitialized(`${SERVICE_NAME}.storageManager`)) {
      return logger.critical('Storage service is not initialized! Run precache command.')
    }

    const eth = app.get('eth') as Eth
    const confirmationService = app.service(ServiceAddresses.CONFIRMATIONS)

    // Storage Manager watcher
    const storageManagerEventsEmitter = getEventsEmitterForService(`${SERVICE_NAME}.storageManager`, eth, storageManagerContract.abi as AbiItem[])
    storageManagerEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, eth), logger))
    storageManagerEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })
    storageManagerEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    storageManagerEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))

    // // Staking watcher
    // const stakingEventsEmitter = getEventsEmitterForService(`${SERVICE_NAME}.staking`, eth, stakingContract.abi as AbiItem[])
    // stakingEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, eth), logger))
    // stakingEventsEmitter.on('error', (e: Error) => {
    //   logger.error(`There was unknown error in Events Emitter! ${e}`)
    // })
    // stakingEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    // stakingEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    eventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'storage'))

    return {
      stop: () => {
        confirmationService.removeAllListeners()
        eventsEmitter.stop()
      }
    }
  },

  async purge (): Promise<void> {
    const priceCount = await BillingPlan.destroy({ where: {}, truncate: true, cascade: true })
    const agreementsCount = await Agreement.destroy({ where: {}, truncate: true, cascade: true })
    const offersCount = await Offer.destroy({ where: {}, truncate: true, cascade: true })
    // const stakeCount = await Stake.destroy({ where: {}, truncate: true, cascade: true })
    logger.info(`Removed ${priceCount} billing plans entries, ${offersCount} offers and ${agreementsCount} agreements`)

    const store = getObject()
    delete store['storage.lastFetchedBlockNumber']
    delete store['storage.lastFetchedBlockHash']
  },

  precache
}

export default storage
