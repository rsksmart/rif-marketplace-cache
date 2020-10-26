import { EventData } from 'web3-eth-contract'

import offer from './handlers/offer'
import request from './handlers/agreement'
import stake from './handlers/stake'
import { Handler } from '../../definitions'
import { Eth } from 'web3-eth'
import { StorageServices } from './index'

const HANDLERS: Handler<StorageServices>[] = [offer, request, stake]

export default function (services: StorageServices, deps: { eth?: Eth }) {
  return async (event: EventData): Promise<void> => {
    const promises = HANDLERS
      .filter(handler => handler.events.includes(event.event))
      .map(handler => handler.process(event, services, deps))
    await Promise.all(promises)
  }
}
