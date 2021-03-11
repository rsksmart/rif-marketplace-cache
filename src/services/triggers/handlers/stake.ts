import BigNumber from 'bignumber.js'
import { Staked, Unstaked } from '@rsksmart/rif-marketplace-notifications/types/web3-v1-contracts/Staking'

import { loggingFactory } from '../../../logger'
import { Handler, StakeEvents } from '../../../definitions'
import { TriggersServices } from '../index'
import TriggersStakeModel from '../models/triggersStake.model'
import { getTokenSymbol } from '../../utils'

const logger = loggingFactory('triggers:handler:stake')

/**
 * Find or create stake
 * @param account
 * @param token
 * @returns {Promise<TriggersStakeModel>} stake
 */
async function findOrCreateStake (account: string, token: string): Promise<TriggersStakeModel> {
  const stake = await TriggersStakeModel.findOne({ where: { account, token } })

  if (stake) {
    return stake
  }
  const symbol = getTokenSymbol(token).toLowerCase()
  return TriggersStakeModel.create({ account, token, symbol, total: 0 })
}

const handlers = {
  async Staked (event: Staked, { stakeService }: TriggersServices): Promise<void> {
    const { user: account, total, token, amount } = event.returnValues

    const stake = await findOrCreateStake(account, token)

    stake.total = new BigNumber(stake.total).plus(amount)
    await stake.save()
    logger.info(`Account ${account}, token ${token} stake amount ${amount}, final balance ${total}`)

    if (stakeService.emit) {
      stakeService.emit('updated', await stakeService.get(stake.account))
    }
  },

  async Unstaked (event: Unstaked, { stakeService }: TriggersServices): Promise<void> {
    const { user: account, total, token, amount } = event.returnValues

    const stake = await TriggersStakeModel.findOne({ where: { token, account } })

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

const handler: Handler<StakeEvents, TriggersServices> = {
  events: ['Staked', 'Unstaked'],
  process (event: StakeEvents, services: TriggersServices): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event, services)
  }
}

export default handler
