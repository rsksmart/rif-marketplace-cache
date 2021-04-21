import type { Eth } from 'web3-eth'

import provider from './handlers/provider'
import stake from './handlers/stake'
import { Handler, NotifierEvents } from '../../definitions'
import { NotifierServices } from './index'
import { EventTransformer } from '../../blockchain/event-transformer'

// @ts-ignore: Incompatibility between contract events and web3 events
const HANDLERS: Handler<NotifierEvents, NotifierServices>[] = [provider, stake]

export default function (services: NotifierServices, deps: { eth?: Eth, eventParser?: EventTransformer }) {
  return async (event: NotifierEvents): Promise<void> => {
    const promises = HANDLERS
      .filter(handler => handler.events.includes(event.event))
      .map(handler => handler.process(deps.eventParser ? deps.eventParser(event) : event, services, deps))
    await Promise.all(promises)
  }
}
