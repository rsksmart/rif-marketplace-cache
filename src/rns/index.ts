import { Service } from 'feathers-sequelize'
import Eth from 'web3-eth'
import { AbiItem } from 'web3-utils'
import config from 'config'
import DomainOffer from './models/domain-offer.model'
import { Application } from '../types'
import { loggingFactory } from '../logger'
import { getEventsEmitterForService } from '../blockchain/utils'

import hooks from './rns.hooks'
//import eventProcessor from './rns.blockchain'
//import contractAbi from '@rsksmart/_.json'

const logger = loggingFactory('rns')

export class DomainOfferService extends Service {
}

const rns: RNSService = {
  initialize (app: Application): void {
    //if (!config.get<boolean>('rns.enabled')) {
      //logger.info('RNS service: disabled')
      //return
    //}
    logger.info('RNS service: enabled')
  
    // Initialize feather's service
    app.use('/domains/v0/offers', new DomainOfferService({ Model: DomainOffer }))
    const service = app.service('domains/v0/offers')
    service.hooks(hooks)
  
    // Initialize blockchain watcher
    /*const eth = app.get('eth') as Eth
    const eventsEmitter = getEventsEmitterForService('rns', eth, contractAbi.abi as AbiItem[])
    eventsEmitter.on('newEvent', eventProcessor)
    eventsEmitter.on('error', (e: Error) => {
      logger.error(`There was unknown error in Events Emitter! ${e}`)
    })*/
  }
}

export default rns
