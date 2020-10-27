import { EventData } from 'web3-eth-contract'
import { Eth } from 'web3-eth'
import Libp2p from 'libp2p'

import offer from './handlers/offer'
import request from './handlers/agreement'
import stake from './handlers/stake'
import { Handler } from '../../definitions'
import { StorageServices } from './index'

const HANDLERS: Handler<StorageServices>[] = [offer, request, stake]

export default function (services: StorageServices, deps: { eth?: Eth, libp2p?: Libp2p }) {
  return async (event: EventData): Promise<void> => {
    const promises = HANDLERS
      .filter(handler => handler.events.includes(event.event))
      .map(handler => handler.process(event, services, deps))
    await Promise.all(promises)
  }
}
