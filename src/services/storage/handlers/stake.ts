import { EventData } from 'web3-eth-contract'
import BigNumber from 'bignumber.js'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'
import StakeModel from '../models/stake.model'
import { Eth } from 'web3-eth'
import { AbiItem } from 'web3-utils'

const logger = loggingFactory('storage:handler:stake')

/**
 * Supported tokens
  */
type SupportedTokens = 'rbtc' | 'rif'

/**
 * TODO replace with some import
 */
const ERC20Abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Approval',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Transfer',
    type: 'event'
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'transfer',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      }
    ],
    name: 'allowance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'approve',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'transferFrom',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as AbiItem[]

/**
 * Native token address
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/**
 * Make a call to ERC20 token SC and return token symbol
 * Return `rbtc` for ZERO_ADDRESS
 * @param token
 * @param eth
 * @param tokenAbi
 * @returns {SupportedTokens} token symbol
 */
async function getTokenSymbol (token: string, eth: Eth, tokenAbi: AbiItem[] = ERC20Abi): Promise<SupportedTokens> {
  if (token === ZERO_ADDRESS) {
    return Promise.resolve('rbtc')
  }

  const contract = new eth.Contract(tokenAbi, token)
  return (await contract.methods.symbol().call({ from: eth.accounts.create() })).toLowerCase()
}

/**
 * Find or create stake
 * @param account
 * @param token
 * @param eth
 * @returns {Promise<StakeModel>} stake
 */
async function findOrCreateStake (account: string, token: string, eth: Eth): Promise<StakeModel> {
  const stake = await StakeModel.findOne({ where: { account, token } })

  if (stake) {
    return stake
  }
  const symbol = await getTokenSymbol(token, eth)
  return StakeModel.create({ account, token, symbol, total: 0 })
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
