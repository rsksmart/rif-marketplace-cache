import simplePlacementsContractAbi from '@rsksmart/rif-marketplace-nfts/RNSSimplePlacementsV1Data.json'
import auctionRegistrarContractAbi from '@rsksmart/rns-auction-registrar/TokenRegistrarData.json'
import rnsReverseContractAbi from '@rsksmart/rns-reverse/NameResolverData.json'
import rnsContractAbi from '@rsksmart/rns-rskregistrar/RSKOwnerData.json'
import config from 'config'
import { Service } from 'feathers-sequelize'
import { getEndPromise } from 'sequelize-store'
import type Eth from 'web3-eth'
import type { EventLog } from 'web3-core'
import type { AbiItem } from 'web3-utils'
import { Web3Events, REORG_OUT_OF_RANGE_EVENT_NAME } from '@rsksmart/web3-events'

import {
  getEventsEmitterForService,
  isServiceInitialized, ProgressCb,
  purgeBlockTrackerData,
  reportProgress
} from '../../blockchain/utils'
import { ServiceAddresses } from '../../definitions'
import type { Application, CachedService } from '../../definitions'
import { loggingFactory } from '../../logger'
import { errorHandler, waitForReadyApp } from '../../utils'
import domainOfferHooks from './hooks/domain-offer.hooks'
import domainHooks from './hooks/domain.hooks'
import soldDomainHooks from './hooks/sold-domain.hooks'
import DomainOffer from './models/domain-offer.model'
import Domain from './models/domain.model'
import SoldDomain from './models/sold-domain.model'
import Transfer from './models/transfer.model'
import rnsChannels from './channels'
import { processAuctionRegistrar, processRskOwner } from './precache'
import eventProcessor from './processor'
import { Observable } from 'rxjs'
import { getEventParser } from '../../blockchain/event-parser'

const logger = loggingFactory('rns')
const precacheLogger = loggingFactory('rns:precache:processor')

export class RnsBaseService extends Service {
  emit?: Function
}

export interface RnsServices {
  domains: RnsBaseService & { emit?: Function }
  sold: RnsBaseService & { emit?: Function }
  offers: RnsBaseService & { emit?: Function }
}

const PLACEMENT = 'rns.placement'
const OWNER = 'rns.owner'
const REVERSE = 'rns.reverse'

async function fetchEventsForService (web3events: Web3Events, serviceName: string, abi: AbiItem[], dataPusher: (event: EventLog) => void, progressCb: ProgressCb, contractName: string): Promise<void> {
  const eventsEmitter = getEventsEmitterForService(serviceName, web3events, abi)
  const eventParser = getEventParser(abi)
  for await (const batch of eventsEmitter.fetch()) {
    for (const event of batch.events) {
      await dataPusher(eventParser(event))
    }
    progressCb(batch, contractName)
  }

  web3events.removeEventsEmitter(eventsEmitter)
}

function precache (eth: Eth, web3events: Web3Events): Observable<string> {
  return reportProgress(precacheLogger,
    async (progressCb): Promise<void> => {
      const eventsDataQueue: EventLog[] = []
      const dataQueuePusher = (event: EventLog): void => { eventsDataQueue.push(event) }

      await processAuctionRegistrar(eth, precacheLogger, auctionRegistrarContractAbi.abi as AbiItem[])
      await processRskOwner(eth, precacheLogger, rnsContractAbi.abi as AbiItem[])

      await fetchEventsForService(web3events, OWNER, rnsContractAbi.abi as AbiItem[], dataQueuePusher, progressCb, OWNER)
      await fetchEventsForService(web3events, REVERSE, rnsReverseContractAbi.abi as AbiItem[], dataQueuePusher, progressCb, REVERSE)
      await fetchEventsForService(web3events, PLACEMENT, simplePlacementsContractAbi.abi as AbiItem[], dataQueuePusher, progressCb, PLACEMENT)

      // We need to sort the events in order to have valid sequence of Events
      eventsDataQueue.sort((a, b): number => {
        // First by block number
        if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber

        // Then by transaction index
        if (a.transactionIndex !== b.transactionIndex) return a.transactionIndex - b.transactionIndex

        return a.logIndex - b.logIndex
      })

      const sequelizeServices = {
        domains: new RnsBaseService({ Model: Domain }),
        sold: new RnsBaseService({ Model: SoldDomain }),
        offers: new RnsBaseService({ Model: DomainOffer, multi: true })
      }

      for (const event of eventsDataQueue) {
        await eventProcessor(precacheLogger, eth, sequelizeServices)(event)
      }
    }
  )
}

const paginate = {
  default: 10,
  max: 25
}

const rns: CachedService = {
  // eslint-disable-next-line require-await
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>('rns.enabled')) {
      logger.info('RNS service: disabled')
      return { stop: () => undefined }
    }
    logger.info('RNS service: enabled')

    await waitForReadyApp(app)

    // We require services to be precached before running server
    if (!isServiceInitialized(OWNER)) {
      return logger.critical('RNS service is not initialized! Run precache command.')
    }

    // Initialize feather's service
    app.use(ServiceAddresses.RNS_DOMAINS, new RnsBaseService({ Model: Domain }))
    const domains = app.service(ServiceAddresses.RNS_DOMAINS)
    domains.hooks(domainHooks)

    app.use(ServiceAddresses.RNS_SOLD, new RnsBaseService({ Model: SoldDomain }))
    const sold = app.service(ServiceAddresses.RNS_SOLD)
    sold.hooks(soldDomainHooks)

    app.use(ServiceAddresses.RNS_OFFERS, new RnsBaseService({ Model: DomainOffer, paginate }))
    const offers = app.service(ServiceAddresses.RNS_OFFERS)
    offers.hooks(domainOfferHooks)

    app.configure(rnsChannels)

    // Initialize blockchain watchers
    const eth = app.get('eth') as Eth
    const web3events = app.get('web3events') as Web3Events
    const confirmationService = app.service(ServiceAddresses.CONFIRMATIONS)
    const reorgEmitterService = app.service(ServiceAddresses.REORG_EMITTER)
    const services = { domains, sold, offers }

    const rnsEventsEmitter = getEventsEmitterForService(OWNER, web3events, rnsContractAbi.abi as AbiItem[])
    const rnsEventParser = getEventParser(rnsContractAbi.abi as AbiItem[])
    rnsEventsEmitter.on('newEvent', errorHandler(eventProcessor(loggingFactory('rns.owner:processor'), eth, services, rnsEventParser), logger))
    rnsEventsEmitter.on('error', (e: object) => {
      logger.error(`There was unknown error in Events Emitter for rns.owner! ${e}`)
    })
    rnsEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    rnsEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    rnsEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, OWNER))

    const rnsReverseEventsEmitter = getEventsEmitterForService(REVERSE, web3events, rnsReverseContractAbi.abi as AbiItem[])
    const rnsReverseEventParser = getEventParser(rnsReverseContractAbi.abi as AbiItem[])
    rnsReverseEventsEmitter.on('newEvent', errorHandler(eventProcessor(loggingFactory('rns.reverse:processor'), eth, services, rnsReverseEventParser), logger))
    rnsReverseEventsEmitter.on('error', (e: object) => {
      logger.error(`There was unknown error in Events Emitter for rns.reverse! ${e}`)
    })
    rnsReverseEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    rnsReverseEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    rnsReverseEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, REVERSE))

    const rnsPlacementsEventsEmitter = getEventsEmitterForService(PLACEMENT, web3events, simplePlacementsContractAbi.abi as AbiItem[])
    const rnsPlacementsEventParser = getEventParser(simplePlacementsContractAbi.abi as AbiItem[])
    rnsPlacementsEventsEmitter.on('newEvent', errorHandler(eventProcessor(loggingFactory('rns.placement:processor'), eth, services, rnsPlacementsEventParser), logger))
    rnsPlacementsEventsEmitter.on('error', (e: object) => {
      logger.error(`There was unknown error in Events Emitter for rns.placement! ${e}`)
    })
    rnsPlacementsEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    rnsPlacementsEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    rnsPlacementsEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, PLACEMENT))

    return {
      stop: () => {
        rnsPlacementsEventsEmitter.stop()
        rnsReverseEventsEmitter.stop()
        rnsEventsEmitter.stop()
        confirmationService.removeAllListeners()
      }
    }
  },

  precache,

  async purge (): Promise<void> {
    const transferCount = await Transfer.destroy({ where: {}, truncate: true, cascade: true })
    const offersCount = await DomainOffer.destroy({ where: {}, truncate: true, cascade: true })
    const soldCount = await SoldDomain.destroy({ where: {}, truncate: true, cascade: true })
    const domainsCount = await Domain.destroy({ where: {}, truncate: true, cascade: true })
    logger.info(`Removed ${offersCount} offers entries, ${soldCount} sold domains, ${transferCount} transfers and ${domainsCount} domains`)

    purgeBlockTrackerData(OWNER)
    purgeBlockTrackerData(REVERSE)
    purgeBlockTrackerData(PLACEMENT)
    await getEndPromise()
  }

}

export default rns
