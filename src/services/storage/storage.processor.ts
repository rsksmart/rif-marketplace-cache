import { EventData } from 'web3-eth-contract'

import offer from './handlers/offer'
import request from './handlers/agreement'
import stake from './handlers/stake'
import { Handler } from '../../definitions'
import { Eth } from 'web3-eth'
import { StorageServices } from './index'

// TODO optimize processing by selecting specific handlers instead of using all of them
const HANDLERS: Handler<StorageServices>[] = [offer, request, stake]

export default function (services: StorageServices, eth: Eth) {
  return async (event: EventData): Promise<void> => {
    const promises = HANDLERS
      .filter(handler => handler.events.includes(event.event))
      .map(handler => handler.process(event, services, eth))
    await Promise.all(promises)
  }
}
