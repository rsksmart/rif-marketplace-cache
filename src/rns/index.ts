import { Service } from 'feathers-sequelize'
import Eth from 'web3-eth'
import { AbiItem } from 'web3-utils'
import config from 'config'
import Domain from './models/domain.model'
import DomainOffer from './models/domain-offer.model'
import SoldDomain from './models/sold-domain.model'
import { Application } from '../types'
import { loggingFactory } from '../logger'
import { getEventsEmitterForService } from '../blockchain/utils'

import domainHooks from './hooks/domain.hooks'
import domainOfferHooks from './hooks/domain-offer.hooks'
import soldDomainHooks from './hooks/sold-domain.hooks'
import eventProcessor from './rns.blockchain'

import rnsContractAbi from '@rsksmart/rns-rskregistrar/RSKOwnerData.json'
import rnsReverseContractAbi from '@rsksmart/rns-reverse/NameResolverData.json'
import simplePlacementsContractAbi from './erc721spabi.json'

const logger = loggingFactory('rns')

export class DomainService extends Service {
}

export class DomainOfferService extends Service {
}

export class SoldDomainService extends Service {
}

const rns: RNSService = {
  initialize (app: Application): void {
    // if (!config.get<boolean>('rns.enabled')) {
    // logger.info('RNS service: disabled')
    // return
    // }
    logger.info('RNS service: enabled')

    // Initialize feather's service
    app.use('/rns/v0/:ownerAddress/domains', new DomainService({ Model: Domain }))
    app.use('/rns/v0/:ownerAddress/sold', new DomainService({ Model: SoldDomain }))
    app.use('/rns/v0/offers', new DomainOfferService({ Model: DomainOffer }))

    app.service('rns/v0/:ownerAddress/domains').hooks(domainHooks)
    app.service('rns/v0/:ownerAddress/sold').hooks(soldDomainHooks)
    app.service('rns/v0/offers').hooks(domainOfferHooks)

    // Initialize blockchain watcher
<<<<<<< HEAD
    /* const eth = app.get('eth') as Eth
    const eventsEmitter = getEventsEmitterForService('rns', eth, contractAbi.abi as AbiItem[])
    eventsEmitter.on('newEvent', eventProcessor)
    eventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    }) */
=======
    const eth = app.get('eth') as Eth
    const rnsEventsEmitter = getEventsEmitterForService('rns-owner', eth, rnsContractAbi.abi as AbiItem[])
    rnsEventsEmitter.on('newEvent', eventProcessor)
    rnsEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })

    const rnsReverseEventsEmitter = getEventsEmitterForService('rns-reverse', eth, rnsReverseContractAbi.abi as AbiItem[])
    rnsReverseEventsEmitter.on('newEvent', eventProcessor)
    rnsReverseEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })

    const rnsPlacementsEventsEmitter = getEventsEmitterForService('rns-placement', eth, simplePlacementsContractAbi as AbiItem[])
    rnsPlacementsEventsEmitter.on('newEvent', eventProcessor)
    rnsPlacementsEventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })

>>>>>>> chore: [WIP] added sold domain listing
  }
}

export default rns
