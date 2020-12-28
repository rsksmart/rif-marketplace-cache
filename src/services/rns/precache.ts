import abiDecoder from 'abi-decoder'
import config from 'config'
import { Eth } from 'web3-eth'
import Utils from 'web3-utils'
import { Logger } from '../../definitions'
import Domain from './models/domain.model'
import DomainOwner from './models/owner.model'

abiDecoder.addABI([
  {
    constant: false,
    inputs: [
      {
        name: '_to',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      },
      {
        name: '_data',
        type: 'bytes'
      }
    ],
    name: 'transferAndCall',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  }
])

export async function processRskOwner (eth: Eth, logger: Logger, contractAbi: Utils.AbiItem[]) {
  if (!config.has('rns.fifsAddrRegistrar.contractAddress')) {
    logger.warn('RNS FIFS Registrar address is not defined, skipping Auction Registrar precaching!')
    return
  }
  const tld = config.get('rns.tld')

  logger.info('Processing events Transfer from FIFSAddrRegistrar')
  const rskOwner = new eth.Contract(contractAbi, config.get<string>('rns.owner.contractAddress'))
  const startingBlock = config.get<string | number>('rns.owner.eventsEmitter.startingBlock')
  const rskOwnerEvents = await rskOwner.getPastEvents('Transfer', {
    filter: { from: config.get<string>('rns.fifsAddrRegistrar.contractAddress') },
    fromBlock: startingBlock
  })
  for (const rskOwnerEvent of rskOwnerEvents) {
    const transaction = await eth.getTransaction(rskOwnerEvent.transactionHash)
    const decodedData = abiDecoder.decodeMethod(transaction.input)
    const name = Utils.hexToAscii('0x' + decodedData.params[2].value.slice(218, decodedData.params[2].value.length))
    const tokenId = Utils.numberToHex(Utils.sha3(name) as string)
    const ownerAddress = rskOwnerEvent.returnValues.to.toLowerCase()
    try {
      await Domain.upsert({ tokenId, name: `${name}.${tld}` })
    } catch (e) {
      await Domain.upsert({ tokenId })
      logger.warn(`Domain name ${name}.${tld} for token ${tokenId} could not be stored.`)
    }
    await DomainOwner.upsert({ tokenId, address: ownerAddress })
  }
}

export async function processAuctionRegistrar (eth: Eth, logger: Logger, contractAbi: Utils.AbiItem[]) {
  if (!config.has('rns.registrar.contractAddress')) {
    logger.warn('RNS Registrar address is not defined, skipping Auction Registrar precaching!')
    return
  }

  logger.info('Processing events HashRegistered')
  const startingBlock = config.get<string | number>('rns.registrar.startingBlock')
  const auctionRegistrar = new eth.Contract(contractAbi, config.get<string>('rns.registrar.contractAddress'))
  const auctionRegistrarEvents = await auctionRegistrar.getPastEvents('HashRegistered', {
    filter: { from: '0x0000000000000000000000000000000000000000' },
    fromBlock: startingBlock
  })
  for (const event of auctionRegistrarEvents) {
    const tokenId = Utils.numberToHex(event.returnValues.hash)
    const ownerAddress = event.returnValues.owner.toLowerCase()
    const expirationDate = parseInt(event.returnValues.registrationDate) * 1000
    await Domain.upsert({ tokenId, expirationDate })
    await DomainOwner.upsert({ tokenId, address: ownerAddress })
  }
}
