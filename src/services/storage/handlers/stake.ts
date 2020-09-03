import { EventData } from 'web3-eth-contract'
import { Eth } from 'web3-eth'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'
import StakeModel from '../models/stake.model'

const logger = loggingFactory('storage:handler:stake')

const handlers = {
  async Staked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    const { user: offerId, total } = event.returnValues

    // TODO Update specific stake based on currency
    const [, [stake]] = await StakeModel.update({ total }, { where: { offerId } })
    logger.info(`Update stake for offer = ${offerId}`)

    if (stakeService.emit) stakeService.emit('updated', stake.toJSON())
  },

  async Unstacked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    const { user: offerId, total } = event.returnValues

    // TODO Update specific stake based on currency
    const [, [stake]] = await StakeModel.update({ total }, { where: { offerId } })
    logger.info(`Update stake for offer = ${offerId}`)

    if (stakeService.emit) stakeService.emit('updated', stake.toJSON())
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler<StorageServices> = {
  events: ['Stacked', 'Unstacked'],
  process (event: EventData, services: StorageServices): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event, services)
  }
}
export default handler
