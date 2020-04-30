import { Service } from 'feathers-sequelize'
import Eth from 'web3-eth'
import { AbiItem } from 'web3-utils'
import config from 'config'

import { EventData } from 'web3-eth-contract'

import Domain from './models/domain.model'
import DomainOffer from './models/domain-offer.model'
import SoldDomain from './models/sold-domain.model'
import { Application } from '../definitions'
import { loggingFactory } from '../logger'
import { confFactory } from '../conf'
import { ethFactory } from '../blockchain'
import { getEventsEmitterForService, isServiceInitialized } from '../blockchain/utils'

import domainHooks from './hooks/domain.hooks'
import domainOfferHooks from './hooks/domain-offer.hooks'
import soldDomainHooks from './hooks/sold-domain.hooks'
import eventProcessor from './rns.blockchain'

import rnsContractAbi from '@rsksmart/rns-rskregistrar/RSKOwnerData.json'
import rnsReverseContractAbi from '@rsksmart/rns-reverse/NameResolverData.json'
import simplePlacementsContractAbi from '@rsksmart/rif-marketplace-nfts/ERC721SimplePlacementsABI.json'

const logger = loggingFactory('rns')

export class DomainService extends Service {
}

export class DomainOfferService extends Service {
}

export class SoldDomainService extends Service {
}

function precache(eth?: Eth): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    eth = eth || ethFactory()
    const eventsEmitter = getEventsEmitterForService('rns.owner', eth, rnsContractAbi.abi as AbiItem[])
    const dataQueue: EventData[] = []
    const dataQueuePusher = (event: EventData): void => { dataQueue.push(event) }
    eventsEmitter.on('initFinished', async () => {
      eventsEmitter.off('newEvent', dataQueuePusher)
      try {
        for (const event of dataQueue) {
          await eventProcessor(event)
        }
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    eventsEmitter.on('newEvent', eventProcessor)
    eventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })
  })
}

const rns: RNSService = {
  async initialize(app: Application): Promise<void> {
    if (config.has('rns.enabled') && !config.get<boolean>('rns.enabled')) {
      logger.info('RNS service: disabled')
      return
    }
    logger.info('RNS service: enabled')

    // Initialize feather's service
    app.use('/rns/v0/:ownerAddress/domains', new DomainService({ Model: Domain }))
    app.use('/rns/v0/:ownerAddress/sold', new DomainService({ Model: SoldDomain }))
    app.use('/rns/v0/:ownerAddress/offers', new DomainOfferService({ Model: DomainOffer }))
    app.use('/rns/v0/offers', new DomainOfferService({ Model: DomainOffer }))

    app.service('rns/v0/:ownerAddress/domains').hooks(domainHooks)
    app.service('rns/v0/:ownerAddress/sold').hooks(soldDomainHooks)
    app.service('rns/v0/:ownerAddress/offers').hooks(domainOfferHooks)
    app.service('rns/v0/offers').hooks(domainOfferHooks)

    // Initialize blockchain watcher
    const eth = app.get('eth') as Eth
    if (!isServiceInitialized('rns.owner')) {
      logger.info('Precaching rns.owner service')
      await precache(eth)
      logger.info('Precaching rns.owner finished service')
    }

    const rnsEventsEmitter = getEventsEmitterForService('rns.owner', eth, rnsContractAbi.abi as AbiItem[])
    rnsEventsEmitter.on('newEvent', eventProcessor)
    rnsEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })

    const rnsReverseEventsEmitter = getEventsEmitterForService('rns.reverse', eth, rnsReverseContractAbi.abi as AbiItem[])
    rnsReverseEventsEmitter.on('newEvent', eventProcessor)
    rnsReverseEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })

    const rnsPlacementsEventsEmitter = getEventsEmitterForService('rns.placement', eth, simplePlacementsContractAbi as AbiItem[])
    rnsPlacementsEventsEmitter.on('newEvent', eventProcessor)
    rnsPlacementsEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })
  },

  precache,

  async purge(): Promise<void> {
    const offersCount = await DomainOffer.destroy({ where: {}, truncate: true, cascade: true })
    const soldCount = await SoldDomain.destroy({ where: {}, truncate: true, cascade: true })
    const domainsCount = await Domain.destroy({ where: {}, truncate: true, cascade: true })
    logger.info(`Removed ${offersCount} offers entries, ${soldCount} sold domains and ${domainsCount} domains`)

    confFactory().delete('rns.owner')
    confFactory().delete('rns.reverse')
    confFactory().delete('rns.placement')
  }

}

export default rns
