import { Eth } from 'web3-eth'
import config from 'config'
import Utils from 'web3-utils'
import abiDecoder from 'abi-decoder'
import { BlockchainServiceOptions, Logger } from '../definitions'

import Domain from './models/domain.model'

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
  logger.info("Processing events Transfer from FIFSAddrRegistrar")
  const rskOwner = new eth.Contract(contractAbi, config.get<string>('rns.owner.contractAddress'))
  const startingBlock = config.get<BlockchainServiceOptions>('rns.owner')?.eventsEmitter?.startingBlock || 'genesis';
  const rskOwnerEvents = await rskOwner.getPastEvents('Transfer', {
    filter: { from: config.get<string>('rns.fifsAddrRegistrar.contractAddress') },
    fromBlock: startingBlock
  })
  for (const rskOwnerEvent of rskOwnerEvents) {
    const transaction = await eth.getTransaction(rskOwnerEvent.transactionHash)
    const decodedData = abiDecoder.decodeMethod(transaction.input)
    const name = Utils.hexToAscii('0x' + decodedData.params[2].value.slice(218, decodedData.params[2].value.length))
    const tokenId = Utils.sha3(name)
    const ownerAddress = rskOwnerEvent.returnValues.to.toLowerCase()
    const [domain, created] = await Domain.findCreateFind({ where: { tokenId }, defaults: { name, ownerAddress } })

    if (!created) {
      domain.ownerAddress = ownerAddress
      await domain.save()
    }
  }
}

export async function processAuctionRegistrar (eth: Eth, logger: Logger, contractAbi: Utils.AbiItem[]) {
  logger.info("Processing events HashRegistered")
  const startingBlock = config.get<BlockchainServiceOptions>('rns.registrar')?.eventsEmitter?.startingBlock || 'genesis';
  const auctionRegistrar = new eth.Contract(contractAbi, config.get<string>('rns.registrar.contractAddress'))
  const auctionRegistrarEvents = await auctionRegistrar.getPastEvents('HashRegistered', {
    filter: { from: '0x0000000000000000000000000000000000000000' },
    fromBlock: startingBlock
  })
  for (const event of auctionRegistrarEvents) {
    const tokenId = event.returnValues.hash
    const ownerAddress = event.returnValues.owner.toLowerCase()
    const expirationDate = parseInt(event.returnValues.registrationDate) * 1000
    const req = new Domain({ tokenId, ownerAddress, expirationDate })
    await req.save()
  }
}
