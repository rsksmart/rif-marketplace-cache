import { EventData } from 'web3-eth-contract'

import offer from './handlers/offer'
import request from './handlers/agreement'
import { Handler } from '../../definitions'
import { Eth } from 'web3-eth'

const HANDLERS: Handler[] = [offer, request]

export default function (eth: Eth) {
  return async (event: EventData): Promise<void> => {
    const promises = HANDLERS
      .filter(handler => handler.events.includes(event.event))
      .map(handler => handler.handler(event, eth))
    await Promise.all(promises)
  }
}
