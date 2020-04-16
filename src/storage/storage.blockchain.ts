import { EventData } from 'web3-eth-contract'

import offer from './handlers/storage-offer'
import request from './handlers/request'
import { Handler } from '../types'

const HANDLERS: Handler[] = [offer, request]

export default async function (event: EventData): Promise<void> {
  const promises = HANDLERS
    .filter(handler => handler.events.includes(event.event))
    .map(handler => handler.handler(event))
  await Promise.all(promises)
}
