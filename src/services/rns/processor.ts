import abiDecoder, { DecodedData } from 'abi-decoder'
import config from 'config'
import { Eth } from 'web3-eth'
import Utils from 'web3-utils'
import { EventLog } from 'web3-core'

import { RnsBaseService, RnsServices } from '.'
import { getBlockDate } from '../../blockchain/utils'
import { Logger } from '../../definitions'
import DomainOffer from './models/domain-offer.model'
import Domain from './models/domain.model'
import DomainExpiration from './models/expiration.model'
import DomainOwner from './models/owner.model'
import Transfer from './models/transfer.model'
import SoldDomain from './models/sold-domain.model'
import RLP = require('rlp')

type RLPDecoded = Array<Array<number[]>>

/**
 * Updates Domain Owner
 */
async function registerOwner (tokenId: string, buyerAddress: string, logger: Logger, domainsService: RnsBaseService) {
  const domain = await Domain.findByPk(tokenId)

  if (domain) {
    await DomainOwner.upsert({ address: buyerAddress, tokenId })

    if (domainsService.emit) {
      domainsService.emit('patched', { tokenId, buyerAddress })
    }
    logger.info(`Transfer event: Updated DomainOwner ${buyerAddress} for tokenId ${tokenId}`)
  } else {
    await Domain.upsert({ tokenId })
    await DomainOwner.create({ tokenId, address: buyerAddress })

    if (domainsService.emit) {
      domainsService.emit('created', { tokenId, buyerAddress })
    }
    logger.info(`Transfer event: Created Domain ${tokenId} for owner ${buyerAddress}`)
  }
}

/**
 * Creates the transfer record
 */
async function registerTransfer (
  txHash: string,
  tokenId: string,
  sellerAddress: string,
  buyerAddress: string,
  logger: Logger,
  domainsService: RnsBaseService): Promise<number> {
  const transferDomain = await Transfer.create({
    txHash,
    tokenId,
    sellerAddress,
    buyerAddress
  })

  if (transferDomain) {
    logger.info(`Transfer event: Transfer ${transferDomain.id} for ${tokenId} created`)
  }

  await registerOwner(tokenId, buyerAddress, logger, domainsService)

  // Return transfer Id
  return transferDomain.id
}

/**
 * Decode domain name
 * @param decodedData
 * @param tokenId
 * @param batchAddr
 */
function getDomainName (decodedData: DecodedData, tokenId: string, batchAddr: string): string | undefined {
  if (decodedData) {
    let name: string | undefined

    if (decodedData.params[0].value === batchAddr) {
      // Batch registration
      const rlpDecoded: RLPDecoded = RLP.decode(decodedData.params[2].value) as unknown as RLPDecoded
      const domainNames = rlpDecoded[1].map(
        (domainData: number[]) =>
          Utils.hexToAscii(
            Utils.bytesToHex(
              domainData.slice(88, domainData.length)
            )
          )
      )
      name = domainNames.find(
        (domain: string) =>
          Utils.numberToHex(Utils.sha3(domain) as string) === tokenId
      )
    } else {
      // Single registration
      const domainData: string = decodedData.params[2].value
      name = Utils.hexToAscii('0x' + domainData.slice(218, domainData.length))
    }

    return name
  }
}

async function transferHandler (logger: Logger, eventData: EventLog, eth: Eth, services: RnsServices): Promise<void> {
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const ownerAddress = eventData.returnValues.to.toLowerCase()
  const fifsAddr = config.get<string>('rns.fifsAddrRegistrar.contractAddress').toLowerCase()
  const registrarAddr = config.get<string>('rns.registrar.contractAddress').toLowerCase()
  const marketplaceAddr = config.get<string>('rns.placement.contractAddress').toLowerCase()
  const batchAddr = config.get<string>('rns.batchContractAddress').toLowerCase()
  const tld = config.get('rns.tld')

  const transactionHash = eventData.transactionHash
  const from = eventData.returnValues.from.toLowerCase()

  const domainsService = services.domains
  const offersService = services.offers

  if (from === '0x0000000000000000000000000000000000000000') {
    const transaction = await eth.getTransaction(transactionHash)
    const decodedData: DecodedData = abiDecoder.decodeMethod(transaction.input)

    const name: string | undefined = getDomainName(decodedData, tokenId, batchAddr)

    if (name) {
      try {
        await Domain.upsert({ tokenId, name: `${name}.${tld}` })
      } catch (e) {
        await Domain.upsert({ tokenId })
        logger.warn(`Domain name ${name}.${tld} for token ${tokenId} could not be stored.`)
      }

      if (domainsService.emit) {
        domainsService.emit('patched', { tokenId })
      }
    }
  }

  if (ownerAddress === fifsAddr) {
    return
  }

  if (ownerAddress === registrarAddr) {
    return
  }

  if (ownerAddress === marketplaceAddr || from === marketplaceAddr) {
    return // Marketplace transfers are handled in TokenSold
  }

  // Register Transfer
  await registerTransfer(transactionHash, tokenId, from, ownerAddress, logger, domainsService)

  // Handle existing offer
  const currentOffer = await DomainOffer.findOne({ where: { tokenId } })

  if (currentOffer) {
    currentOffer.ownerAddress = ownerAddress
    currentOffer.approved = false
    await currentOffer.save()

    if (offersService.emit) {
      offersService.emit('patched', { tokenId })
    }
  }
}

async function expirationChangedHandler (logger: Logger, eventData: EventLog, _: Eth, services: RnsServices): Promise<void> {
  // event ExpirationChanged(uint256 tokenId, uint expirationTime);

  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  let normalizedTimestamp = eventData.returnValues.expirationTime as string

  logger.info(`ExpirationDate: ${normalizedTimestamp}`)

  // For the old RNS register where timestamps start with 10000
  if (normalizedTimestamp.startsWith('10000')) {
    normalizedTimestamp = eventData.returnValues.expirationTime.slice(5)
  }

  const expirationDate = parseInt(normalizedTimestamp) * 1000

  const currentExpiration = await DomainExpiration.findByPk(tokenId)
  const domainsService = services.domains

  if (currentExpiration) {
    await DomainExpiration.update({ date: expirationDate }, { where: { tokenId } })

    if (domainsService.emit) {
      domainsService.emit('patched', { tokenId })
    }
    logger.info(`ExpirationChange event: DomainExpiration for token ${tokenId} updated`)
  } else {
    await Domain.upsert({ tokenId })
    await DomainExpiration.create({
      tokenId,
      date: expirationDate
    })
    logger.info(`ExpirationChange event: DomainExpiration for token ${tokenId} created`)
  }
}

async function approvalHandler (logger: Logger, eventData: EventLog, eth: Eth, services: RnsServices): Promise<void> {
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const approvedAddress = eventData.returnValues.approved.toLowerCase()
  const marketplace = config.get<string>('rns.placement.contractAddress').toLowerCase()
  const offersService = services.offers

  const currentOffer = await DomainOffer.findOne({ where: { tokenId } })

  if (!currentOffer) {
    return
  }

  currentOffer.approved = (approvedAddress === marketplace)
  await currentOffer.save()

  if (offersService.emit) {
    offersService.emit('patched', { tokenId })
  }

  logger.info(`Approval event: ${tokenId} approved for ${approvedAddress}`)
}

async function nameChangedHandler (logger: Logger, eventData: EventLog, _: Eth, services: RnsServices): Promise<void> {
  const name = eventData.returnValues.name
  const domainsService = services.domains

  const label = name.substring(0, name.indexOf('.'))
  const tokenId = Utils.numberToHex(Utils.sha3(label) as string)

  const domain = await Domain.findByPk(tokenId)

  if (domain) {
    await domainsService.update(tokenId, { name })
    logger.info(`NameChanged event: Updated Domain name ${name} -> ${tokenId}`)
  } else {
    await domainsService.create({ tokenId, name })
    logger.info(`NameChanged event: Domain with name ${name} created`)
  }
}

async function tokenPlacedHandler (logger: Logger, eventData: EventLog, eth: Eth, services: RnsServices): Promise<void> {
  // event TokenPlaced(uint256 indexed tokenId, address indexed paymentToken, uint256 cost);

  const transactionHash = eventData.transactionHash
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const paymentToken = eventData.returnValues.paymentToken
  const cost = eventData.returnValues.cost

  const owner = await DomainOwner.findByPk(tokenId)

  if (!owner) {
    throw new Error(`Domain owner with token ID ${tokenId} not found!`)
  }
  const offersService = services.offers
  const currentOffer = await DomainOffer.findOne({ where: { tokenId } })

  if (currentOffer) {
    await currentOffer.destroy()

    if (offersService.emit) {
      offersService.emit('removed', { tokenId })
    }

    logger.info(`TokenPlaced event: ${tokenId} previous placement removed`)
  } else {
    logger.info(`TokenPlaced event: ${tokenId} no previous placement`)
  }
  const { address } = owner

  await offersService.create({
    txHash: transactionHash,
    ownerAddress: address,
    tokenId: tokenId,
    paymentToken: paymentToken,
    price: cost,
    priceString: `${cost}`,
    approved: true,
    creationDate: await getBlockDate(eth, eventData.blockNumber)
  })

  logger.info(`TokenPlaced event: ${tokenId} created`)
}

async function tokenUnplacedHandler (logger: Logger, eventData: EventLog, eth: Eth, services: RnsServices): Promise<void> {
  // event TokenUnplaced(uint256 indexed tokenId);
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const storedOffer = await DomainOffer.findOne({ where: { tokenId } })

  if (storedOffer) {
    const offersService = services.offers

    await storedOffer.destroy()

    if (offersService.emit) {
      offersService.emit('removed', { tokenId })
    }

    logger.info(`TokenUnplaced event: ${tokenId} removed from offers`)
  } else {
    logger.info(`TokenUnplaced event: ${tokenId} not found in offers`)
  }
}

async function tokenSoldHandler (
  logger: Logger,
  eventData: EventLog,
  eth: Eth,
  { sold: soldService, offers: offersService, domains: domainsService }: RnsServices
): Promise<void> {
  const {
    transactionHash,
    blockNumber
  } = eventData

  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const newOwner = eventData.returnValues.newOwner.toLowerCase()
  const domainOffer = await DomainOffer.findOne({ where: { tokenId } })

  if (domainOffer) {
    logger.info(`Found last offer for ${tokenId}`)
    const {
      ownerAddress,
      price,
      priceString,
      paymentToken
    } = domainOffer

    // Register Transfer
    const transferId = await registerTransfer(transactionHash, tokenId, ownerAddress, newOwner, logger, domainsService)

    // Register Domain sold
    const soldDomain = await SoldDomain.create({
      txHash: transactionHash,
      tokenId,
      transferId,
      price,
      priceString,
      paymentToken,
      soldDate: await getBlockDate(eth, blockNumber)
    })

    if (soldDomain) {
      if (soldService.emit) {
        soldService.emit('created', { tokenId, ownerAddress })
      }

      await domainOffer.destroy()

      if (offersService.emit) {
        offersService.emit('removed', { tokenId })
      }
      logger.info(`TokenSold event: Sold Domain ${tokenId} in transaction ${transactionHash}`)
    } else {
      logger.info(`TokenSold event: ${tokenId} not updated`)
    }
  }
}

const commands = {
  Transfer: transferHandler,
  Approval: approvalHandler,
  ExpirationChanged: expirationChangedHandler,
  NameChanged: nameChangedHandler,
  TokenPlaced: tokenPlacedHandler,
  TokenUnplaced: tokenUnplacedHandler,
  TokenSold: tokenSoldHandler
}

function isValidEvent (value: string): value is keyof typeof commands {
  return value in commands
}

// TODO: Add correct types checks as in Storage service.
export default function rnsProcessorFactory (logger: Logger, eth: Eth, services: RnsServices) {
  return async function (eventData: EventLog): Promise<void> {
    if (isValidEvent(eventData.event)) {
      logger.info(`Processing event ${eventData.event}`)
      await commands[eventData.event](logger, eventData, eth, services)
    } else {
      logger.error(`Unknown event ${eventData.event}`)
    }
  }
}
