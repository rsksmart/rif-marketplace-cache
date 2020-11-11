import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import stakingContract from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'
import config from 'config'
import { getEndPromise } from 'sequelize-store'
import Eth from 'web3-eth'
import type { AbiItem } from 'web3-utils'
import { Web3Events, REORG_OUT_OF_RANGE_EVENT_NAME, EventsEmitter } from '@rsksmart/web3-events'
import { Observable } from 'rxjs'

import {
  getEventsEmitterForService,
  isServiceInitialized,
  ProgressCb,
  purgeBlockTrackerData,
  reportProgress
} from '../../blockchain/utils'
import {
  Application,
  CachedService,
  Logger,
  ServiceAddresses,
  StakeEvents, StorageEvents,
  StorageAgreementEvents
} from '../../definitions'
import { loggingFactory } from '../../logger'
import { errorHandler, waitForReadyApp } from '../../utils'
import Agreement from './models/agreement.model'
import Offer from './models/offer.model'
import BillingPlan from './models/billing-plan.model'
import StakeModel from './models/stake.model'
import offerHooks from './hooks/offers.hooks'
import agreementHooks from './hooks/agreements.hooks'
import stakeHooks from './hooks/stakes.hook'
import avgBillingPlanHook from './hooks/avg-billing-plan.hook'
import eventProcessor from './processor'
import storageChannels from './channels'
import { AgreementService, OfferService, StakeService, AvgBillingPriceService } from './services'
import { subscribeForOffers } from '../../communication'

export interface StorageServices {
  agreementService: AgreementService
  offerService: OfferService
  stakeService: StakeService
}

const STORAGE_MANAGER = 'storage.storageManager'
const STAKING = 'storage.staking'

const storageLogger = loggingFactory('storage')
const storageManagerLogger = loggingFactory(STORAGE_MANAGER)
const stakingLogger = loggingFactory(STAKING)

async function precacheContract (eventsEmitter: EventsEmitter<StorageEvents>, services: StorageServices, eth: Eth, logger: Logger, progressCb: ProgressCb, contractName: string): Promise<void> {
  const processor = eventProcessor(services, { eth })
  for await (const batch of eventsEmitter.fetch()) {
    for (const event of batch.events) {
      await processor(event)
    }
    progressCb(batch, contractName)
  }
}

function precache (eth: Eth, web3events: Web3Events): Observable<string> {
  return reportProgress(storageLogger,
    async (progressCb): Promise<void> => {
      const storageEventsEmitter = getEventsEmitterForService<StorageAgreementEvents>(STORAGE_MANAGER, web3events, storageManagerContract.abi as AbiItem[])
      const stakingEventsEmitter = getEventsEmitterForService<StakeEvents>(STAKING, web3events, stakingContract.abi as AbiItem[])

      const services: StorageServices = {
        stakeService: new StakeService({ Model: StakeModel }),
        offerService: new OfferService({ Model: Offer }),
        agreementService: new AgreementService({ Model: Agreement })
      }

      // TODO: Can be processed in parallel
      // Precache Storage Manager
      await precacheContract(storageEventsEmitter, services, eth, storageManagerLogger, progressCb, 'StorageManager')

      // Precache Staking
      await precacheContract(stakingEventsEmitter, services, eth, stakingLogger, progressCb, 'Staking')

      web3events.removeEventsEmitter(storageEventsEmitter)
      web3events.removeEventsEmitter(stakingEventsEmitter)
    }
  )
}

const storage: CachedService = {
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>('storage.enabled')) {
      storageLogger.info('Storage service: disabled')
      return { stop: () => undefined }
    }
    storageLogger.info('Storage service: enabled')

    await waitForReadyApp(app)

    // We require services to be precached before running server
    if (!isServiceInitialized(STORAGE_MANAGER) || !isServiceInitialized(STAKING)) {
      return storageLogger.critical('Storage service is not initialized! Run precache command.')
    }

    // Initialize Offer service
    app.use(ServiceAddresses.STORAGE_OFFERS, new OfferService({ Model: Offer }))
    const offerService = app.service(ServiceAddresses.STORAGE_OFFERS)
    offerService.hooks(offerHooks)

    // Init AVG Billing plan service
    app.use(ServiceAddresses.AVG_BILLING_PRICE, new AvgBillingPriceService({ Model: BillingPlan }))
    const avgBillingPlanService = app.service(ServiceAddresses.AVG_BILLING_PRICE)
    avgBillingPlanService.hooks(avgBillingPlanHook)

    // Initialize Agreement service
    app.use(ServiceAddresses.STORAGE_AGREEMENTS, new AgreementService({ Model: Agreement }))
    const agreementService = app.service(ServiceAddresses.STORAGE_AGREEMENTS)
    agreementService.hooks(agreementHooks)

    // Initialize Staking service
    app.use(ServiceAddresses.STORAGE_STAKES, new StakeService({ Model: StakeModel }))
    const stakeService = app.service(ServiceAddresses.STORAGE_STAKES)
    stakeService.hooks(stakeHooks)

    app.configure(storageChannels)

    const eth = app.get('eth') as Eth
    const web3events = app.get('web3events') as Web3Events
    const libp2p = app.get('libp2p')
    const confirmationService = app.service(ServiceAddresses.CONFIRMATIONS)
    const reorgEmitterService = app.service(ServiceAddresses.REORG_EMITTER)
    const services = { offerService, agreementService, stakeService }

    // Subscribe for offers rooms
    await subscribeForOffers(libp2p)

    // Storage Manager watcher
    const storageManagerEventsEmitter = getEventsEmitterForService(STORAGE_MANAGER, web3events, storageManagerContract.abi as AbiItem[])
    storageManagerEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, { eth, libp2p }), storageManagerLogger))
    storageManagerEventsEmitter.on('error', (e: object) => {
      storageManagerLogger.error(`There was unknown error in Events Emitter for ${STORAGE_MANAGER}! ${e}`)
    })
    storageManagerEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    storageManagerEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    storageManagerEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'storage'))

    // Staking watcher
    const stakingEventsEmitter = getEventsEmitterForService(STAKING, web3events, stakingContract.abi as AbiItem[])
    stakingEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, { eth }), stakingLogger))
    stakingEventsEmitter.on('error', (e: object) => {
      stakingLogger.error(`There was unknown error in Events Emitter for ${STAKING}! ${e}`)
    })
    stakingEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    stakingEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    stakingEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'staking'))

    return {
      stop: () => {
        confirmationService.removeAllListeners()
        stakingEventsEmitter.stop()
        storageManagerEventsEmitter.stop()
      }
    }
  },

  async purge (): Promise<void> {
    const priceCount = await BillingPlan.destroy({ where: {}, truncate: true, cascade: true })
    const agreementsCount = await Agreement.destroy({ where: {}, truncate: true, cascade: true })
    const offersCount = await Offer.destroy({ where: {}, truncate: true, cascade: true })
    const stakeCount = await StakeModel.destroy({ where: {}, truncate: true, cascade: true })
    storageLogger.info(`Removed ${priceCount} billing plans entries, ${stakeCount} stakes, ${offersCount} offers and ${agreementsCount} agreements`)

    purgeBlockTrackerData(STORAGE_MANAGER)
    purgeBlockTrackerData(STAKING)

    await getEndPromise()
  },

  precache
}

export default storage
