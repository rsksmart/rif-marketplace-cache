import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import stakingContract from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'
import config from 'config'
import { Service } from 'feathers-sequelize'
import { QueryTypes } from 'sequelize'
import { getObject } from 'sequelize-store'
import Eth from 'web3-eth'
import { EventData } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import { EventEmitter } from 'events'

import { ethFactory } from '../../blockchain'
import { getEventsEmitterForService, isServiceInitialized } from '../../blockchain/utils'
import { REORG_OUT_OF_RANGE_EVENT_NAME } from '../../blockchain/events'
import { Application, CachedService, Logger, ServiceAddresses } from '../../definitions'
import { loggingFactory } from '../../logger'
import { errorHandler, waitForReadyApp } from '../../utils'
import Agreement from './models/agreement.model'
import Rate from '../rates/rates.model'
import Offer from './models/offer.model'
import BillingPlan from './models/billing-plan.model'
import offerHooks from './hooks/offers.hooks'
import agreementHooks from './hooks/agreements.hooks'
import stakeHooks from './hooks/stakes.hook'
import eventProcessor from './storage.processor'
import storageChannels from './storage.channels'
import { sleep } from '../../../test/utils'
import StakeModel from './models/stake.model'

type MinMax = 1 | -1

export class OfferService extends Service {
  emit?: Function
}

export class AgreementService extends Service {
  emit?: Function
}

export class StakeService extends Service {
  emit?: Function
}

export class AvgBillingPriceService extends Service {
  emit?: Function

  async get (minMax: MinMax): Promise<number | string> {
    if (!config.get('storage.tokens')) {
      throw new Error('"storage.tokens" not exist in config')
    }
    const sequelize = this.Model.sequelize

    const supportedTokens = Object.entries(config.get('storage.tokens'))
    const rates = await Rate.findAll()
    const toDollars = `case ${supportedTokens.reduce(
      (acc, [tokenAddress, symbol]) => {
        const rate: number = rates.find(r => r.token === symbol)?.usd || 0
        return `${acc} \n
        when token = ${sequelize.escape(tokenAddress)}
        then cast(price as real) * ${sequelize.escape(rate)}`
      },
      ''
    )} else 0 end`

    const getAvgMinMaxBillingPrice = (minMax: MinMax): string => `
        SELECT ROUND(
          (SUM(${toDollars}) / COUNT(*) * 1024 / period * (3600 * 24)), 0) as avgPrice
        FROM "storage_billing-plan"
        GROUP BY offerId
        ORDER BY avgPrice ${minMax === -1 ? 'DESC' : 'ASC'}
        LIMIT 1
     `
    const [{ avgPrice }] = await sequelize.query(getAvgMinMaxBillingPrice(minMax), { type: QueryTypes.SELECT, raw: true })
    return avgPrice
  }
}

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

function precacheContract (eventEmitter: EventEmitter, services: StorageServices, eth: Eth, logger: Logger): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const dataQueue: EventData[] = []
    const dataQueuePusher = (event: EventData): void => { dataQueue.push(event) }

    eventEmitter.on('initFinished', async () => {
      eventEmitter.off('newEvent', dataQueuePusher)

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
    eventEmitter.on('newEvent', dataQueuePusher)
    eventEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })
  })
}

async function precache (possibleEth?: Eth): Promise<void> {
  const eth = possibleEth || ethFactory()
  const storageEventsEmitter = getEventsEmitterForService(STORAGE_MANAGER, eth, storageManagerContract.abi as AbiItem[])
  const stakingEventsEmitter = getEventsEmitterForService(STAKING, eth, stakingContract.abi as AbiItem[])

  const services: StorageServices = {
    stakeService: new StakeService({ Model: StakeModel }),
    offerService: new OfferService({ Model: Offer }),
    agreementService: new AgreementService({ Model: Agreement })
  }

  // Precache Storage Manager
  await precacheContract(storageEventsEmitter, services, eth, storageManagerLogger)

  // Precache Staking
  await precacheContract(stakingEventsEmitter, services, eth, stakingLogger)
}

const storage: CachedService = {
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>('storage.enabled')) {
      storageLogger.info('Storage service: disabled')
      return { stop: () => undefined }
    }
    storageLogger.info('Storage service: enabled')

    await waitForReadyApp(app)

    // Initialize Offer service
    app.use(ServiceAddresses.STORAGE_OFFERS, new OfferService({ Model: Offer }))
    const offerService = app.service(ServiceAddresses.STORAGE_OFFERS)
    offerService.hooks(offerHooks)
    app.use(ServiceAddresses.AVG_BILLING_PRICE, new AvgBillingPriceService({ Model: BillingPlan }))

    // Initialize Agreement service
    app.use(ServiceAddresses.STORAGE_AGREEMENTS, new AgreementService({ Model: Agreement }))
    const agreementService = app.service(ServiceAddresses.STORAGE_AGREEMENTS)
    agreementService.hooks(agreementHooks)

    // Initialize Staking service
    app.use(ServiceAddresses.STORAGE_STAKES, new StakeService({ Model: StakeModel }))
    const stakeService = app.service(ServiceAddresses.STORAGE_STAKES)
    stakeService.hooks(stakeHooks)

    const services = { offerService, agreementService, stakeService } // stakingService

    app.configure(storageChannels)

    const reorgEmitterService = app.service(ServiceAddresses.REORG_EMITTER)

    // We require services to be precached before running server
    if (!isServiceInitialized(STORAGE_MANAGER) || !isServiceInitialized(STAKING)) {
      return storageLogger.critical('Storage service is not initialized! Run precache command.')
    }

    const eth = app.get('eth') as Eth
    const confirmationService = app.service(ServiceAddresses.CONFIRMATIONS)

    // Storage Manager watcher
    const storageManagerEventsEmitter = getEventsEmitterForService(STORAGE_MANAGER, eth, storageManagerContract.abi as AbiItem[])
    storageManagerEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, eth), storageManagerLogger))
    storageManagerEventsEmitter.on('error', (e: Error) => {
      storageManagerLogger.error(`There was unknown error in Events Emitter! ${e}`)
    })
    storageManagerEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    storageManagerEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    storageManagerEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'storage'))

    // Staking watcher
    const stakingEventsEmitter = getEventsEmitterForService(STAKING, eth, stakingContract.abi as AbiItem[])
    stakingEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, eth), stakingLogger))
    stakingEventsEmitter.on('error', (e: Error) => {
      stakingLogger.error(`There was unknown error in Events Emitter! ${e}`)
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

    const store = getObject()
    delete store[`${STORAGE_MANAGER}.lastFetchedBlockNumber`]
    delete store[`${STAKING}.lastFetchedBlockNumber`]
    delete store[`${STORAGE_MANAGER}.lastFetchedBlockHash`]
    delete store[`${STAKING}.lastFetchedBlockHash`]

    await sleep(1000)
  },

  precache
}

export default storage
