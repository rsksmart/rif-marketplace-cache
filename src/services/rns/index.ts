import simplePlacementsContractAbi from '@rsksmart/rif-marketplace-nfts/RNSSimplePlacementsV1Data.json'
import auctionRegistrarContractAbi from '@rsksmart/rns-auction-registrar/TokenRegistrarData.json'
import rnsReverseContractAbi from '@rsksmart/rns-reverse/NameResolverData.json'
import rnsContractAbi from '@rsksmart/rns-rskregistrar/RSKOwnerData.json'
import config from 'config'
import { Service } from 'feathers-sequelize'
import { getObject } from 'sequelize-store'
import type Eth from 'web3-eth'
import type { EventData } from 'web3-eth-contract'
import type { AbiItem } from 'web3-utils'
import { ethFactory } from '../../blockchain'
import { getEventsEmitterForService, isServiceInitialized } from '../../blockchain/utils'
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
import rnsChannels from './rns.channels'
import { processAuctionRegistrar, processRskOwner } from './rns.precache'
import eventProcessor from './rns.processor'

const logger = loggingFactory('rns')

export class RnsBaseService extends Service {
  emit?: Function
}
export interface RnsServices {
  domains: RnsBaseService & { emit?: Function }
  sold: RnsBaseService & { emit?: Function }
  offers: RnsBaseService & { emit?: Function }
}

function fetchEventsForService (eth: Eth, serviceName: string, abi: AbiItem[], dataPusher: (event: EventData) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const eventsEmitter = getEventsEmitterForService(serviceName, eth, abi)
    eventsEmitter.on('initFinished', () => {
      eventsEmitter.off('newEvent', dataPusher)
      resolve()
    })
    eventsEmitter.on('newEvent', dataPusher)
    eventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
      reject(e)
    })
  })
}

async function precache (eth?: Eth): Promise<void> {
  eth = eth || ethFactory()
  const precacheLogger = loggingFactory('rns:precache:processor')
  const eventsDataQueue: EventData[] = []
  const dataQueuePusher = (event: EventData): void => { eventsDataQueue.push(event) }

  await processAuctionRegistrar(eth, precacheLogger, auctionRegistrarContractAbi.abi as AbiItem[])
  await processRskOwner(eth, precacheLogger, rnsContractAbi.abi as AbiItem[])

  await fetchEventsForService(eth, 'rns.owner', rnsContractAbi.abi as AbiItem[], dataQueuePusher)
  await fetchEventsForService(eth, 'rns.reverse', rnsReverseContractAbi.abi as AbiItem[], dataQueuePusher)
  await fetchEventsForService(eth, 'rns.placement', simplePlacementsContractAbi.abi as AbiItem[], dataQueuePusher)

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

const rns: CachedService = {
  // eslint-disable-next-line require-await
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>('rns.enabled')) {
      logger.info('RNS service: disabled')
      return { stop: () => undefined }
    }
    logger.info('RNS service: enabled')

    await waitForReadyApp(app)

    // Initialize feather's service
    app.use(ServiceAddresses.RNS_DOMAINS, new RnsBaseService({ Model: Domain }))
    app.use(ServiceAddresses.RNS_SOLD, new RnsBaseService({ Model: SoldDomain }))
    app.use(ServiceAddresses.RNS_OFFERS, new RnsBaseService({ Model: DomainOffer }))

    const domains = app.service(ServiceAddresses.RNS_DOMAINS)
    const sold = app.service(ServiceAddresses.RNS_SOLD)
    const offers = app.service(ServiceAddresses.RNS_OFFERS)

    domains.hooks(domainHooks)
    sold.hooks(soldDomainHooks)
    offers.hooks(domainOfferHooks)

    app.configure(rnsChannels)

    // We require services to be precached before running server
    if (!isServiceInitialized('rns.owner')) {
      return logger.critical('RNS service is not initialized! Run precache command.')
    }

    // Initialize blockchain watchers
    const eth = app.get('eth') as Eth
    const confirmationService = app.service(ServiceAddresses.CONFIRMATIONS)
    const services = { domains, sold, offers }
    const rnsEventsEmitter = getEventsEmitterForService('rns.owner', eth, rnsContractAbi.abi as AbiItem[])
    rnsEventsEmitter.on('newEvent', errorHandler(eventProcessor(loggingFactory('rns.owner:processor'), eth, services), logger))
    rnsEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter for rns.owner! ${e}`)
    })
    rnsEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    rnsEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))

    const rnsReverseEventsEmitter = getEventsEmitterForService('rns.reverse', eth, rnsReverseContractAbi.abi as AbiItem[])
    rnsReverseEventsEmitter.on('newEvent', errorHandler(eventProcessor(loggingFactory('rns.reverse:processor'), eth, services), logger))
    rnsReverseEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter for rns.reverse! ${e}`)
    })
    rnsReverseEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    rnsReverseEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))

    const rnsPlacementsEventsEmitter = getEventsEmitterForService('rns.placement', eth, simplePlacementsContractAbi.abi as AbiItem[])
    rnsPlacementsEventsEmitter.on('newEvent', errorHandler(eventProcessor(loggingFactory('rns.placement:processor'), eth, services), logger))
    rnsPlacementsEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter for rns.placement! ${e}`)
    })
    rnsPlacementsEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    rnsPlacementsEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))

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

    const store = getObject()
    delete store['rns.placement.lastFetchedBlockNumber']
    delete store['rns.placement.lastFetchedBlockHash']
    delete store['rns.reverse.lastFetchedBlockNumber']
    delete store['rns.reverse.lastFetchedBlockHash']
    delete store['rns.owner.lastFetchedBlockNumber']
    delete store['rns.owner.lastFetchedBlockHash']
  }

}

export default rns
