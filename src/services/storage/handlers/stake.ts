import { EventData } from 'web3-eth-contract'
import { Eth } from 'web3-eth'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'

const logger = loggingFactory('storage:handler:stake')

const handlers = {
  async Staked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    return Promise.reject('Not implemented')
  },

  async Unstacked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    return Promise.reject('Not implemented')
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler<StorageServices> = {
  events: ['Stacked', 'Unstacked'],
  process (event: EventData, services: StorageServices, eth: Eth): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event, services)
  }
}
export default handler
