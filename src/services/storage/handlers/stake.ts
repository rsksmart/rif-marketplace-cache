import { EventData } from 'web3-eth-contract'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'
import StakeModel from '../models/stake.model'

const logger = loggingFactory('storage:handler:stake')

const handlers = {
  async Staked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    const { user: account, total, token, amount } = event.returnValues

    const stake = await StakeModel.findOne({ where: { token, account } })

    stake!.total = total
    await stake!.save()
    logger.info(`Account ${account} stake amount ${amount}, final balance ${total}`)

    if (stakeService.emit) {
      stakeService.emit('updated', stake!.toJSON())
    }
  },

  async Unstaked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    const { user: account, total, token, amount } = event.returnValues

    const stake = await StakeModel.findOne({ where: { token, account } })

    stake!.total = total
    await stake!.save()
    logger.info(`Account ${account} stake amount ${amount}, final balance ${total}`)

    if (stakeService.emit) {
      stakeService.emit('updated', stake!.toJSON())
    }
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler<StorageServices> = {
  events: ['Staked', 'Unstaked'],
  async process (event: EventData, services: StorageServices): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }
    const { user: account, token } = event.returnValues
    const stake = await StakeModel.findOne({ where: { account, token } })

    // Create stake row if not exist
    if (!stake) {
      const stakeFromDb = await StakeModel.create({ account, token, total: '0' })
      logger.debug('Stake created: ', stakeFromDb.toJSON())

      if (services.stakeService.emit) {
        services.stakeService.emit('created', stakeFromDb.toJSON())
      }
    }

    return handlers[event.event](event, services)
  }
}

export default handler
