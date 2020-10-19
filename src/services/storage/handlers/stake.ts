import { EventData } from 'web3-eth-contract'
import BigNumber from 'bignumber.js'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'
import StakeModel from '../models/stake.model'
import { getTokenSymbol } from '../utils'

const logger = loggingFactory('storage:handler:stake')

/**
 * Find or create stake
 * @param account
 * @param token
 * @returns {Promise<StakeModel>} stake
 */
async function findOrCreateStake (account: string, token: string): Promise<StakeModel> {
  const stake = await StakeModel.findOne({ where: { account, token } })

  if (stake) {
    return stake
  }
  const symbol = getTokenSymbol(token).toLowerCase()
  return StakeModel.create({ account, token, symbol, total: 0 })
}

const handlers = {
  async Staked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    const { user: account, total, token, amount } = event.returnValues

    const stake = await findOrCreateStake(account, token)

    stake.total = new BigNumber(stake.total).plus(amount)
    await stake.save()
    logger.info(`Account ${account}, token ${token} stake amount ${amount}, final balance ${total}`)

    if (stakeService.emit) {
      stakeService.emit('updated', await stakeService.get(stake.account))
    }
  },

  async Unstaked (event: EventData, { stakeService }: StorageServices): Promise<void> {
    const { user: account, total, token, amount } = event.returnValues

    const stake = await StakeModel.findOne({ where: { token, account } })

    if (!stake) {
      throw new Error(`Stake for account ${account}, token ${token} not exist`)
    }

    stake.total = new BigNumber(stake.total).minus(amount)
    await stake.save()
    logger.info(`Account ${account}, token ${token} un-stake amount ${amount}, final balance ${total}`)

    if (stakeService.emit) {
      stakeService.emit('updated', await stakeService.get(stake.account))
    }
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler<StorageServices> = {
  events: ['Staked', 'Unstaked'],
  process (event: EventData, services: StorageServices): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event, services)
  }
}

export default handler
