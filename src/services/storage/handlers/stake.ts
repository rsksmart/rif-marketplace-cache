import { EventData } from 'web3-eth-contract'
import BigNumber from 'bignumber.js'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'
import StakeModel from '../models/stake.model'
import { Eth } from 'web3-eth'
import { AbiItem } from 'web3-utils'

const logger = loggingFactory('storage:handler:stake')

// TODO replace with some import
const ERC20Abi = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [
      {
        name: '',
        type: 'string'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: '',
        type: 'uint8'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        name: '',
        type: 'string'
      }
    ],
    payable: false,
    type: 'function'
  }
]

// Native token address
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function getTokenName (token: string, eth: Eth, tokenAbi = ERC20Abi): string {
  if (token === ZERO_ADDRESS) return 'RBTC'

  const contract = new eth.Contract(tokenAbi as AbiItem[], token)
  return contract.methods.symbol()
}

async function findOrCreateStake (account: string, token: string, eth: Eth): Promise<StakeModel> {
  const stake = await StakeModel.findOne({ where: { account, token } })

  if (stake) {
    return stake
  }
  const tokenName = await getTokenName(token, eth)
  return StakeModel.create({ account, token, tokenName, total: 0 })
}

const handlers = {
  async Staked (event: EventData, { stakeService }: StorageServices, eth: Eth): Promise<void> {
    const { user: account, total, token, amount } = event.returnValues

    const stake = await findOrCreateStake(account, token, eth)

    stake.total = new BigNumber(stake.total).plus(amount)
    await stake.save()
    logger.info(`Account ${account} stake amount ${amount}, final balance ${total}`)

    if (stakeService.emit) {
      stakeService.emit('updated', stake.toJSON())
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
    logger.info(`Account ${account} stake amount ${amount}, final balance ${total}`)

    if (stakeService.emit) {
      stakeService.emit('updated', stake.toJSON())
    }
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler<StorageServices> = {
  events: ['Staked', 'Unstaked'],
  process (event: EventData, services: StorageServices, eth: Eth): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event, services, eth)
  }
}

export default handler
