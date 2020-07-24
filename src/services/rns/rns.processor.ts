import abiDecoder, { DecodedData } from 'abi-decoder'
import config from 'config'
import { Eth } from 'web3-eth'
import { EventData } from 'web3-eth-contract'
import Utils from 'web3-utils'
import { RnsServices } from '.'
import { getBlockDate } from '../../blockchain/utils'
import { Logger } from '../../definitions'
import DomainOffer from './models/domain-offer.model'
import Domain from './models/domain.model'
import DomainExpiration from './models/expiration.model'
import DomainOwner from './models/owner.model'
import Transfer from './models/transfer.model'
import SoldDomain from './models/sold-domain.model'

async function transferHandler (logger: Logger, eventData: EventData, eth: Eth, services: RnsServices): Promise<void> {
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const ownerAddress = eventData.returnValues.to.toLowerCase()

  const fiftsAddr = config.get('rns.fifsAddrRegistrar.contractAddress')
  const registrar = config.get('rns.registrar.contractAddress')
  const tld = config.get('rns.tld')

  const transactionHash = eventData.transactionHash
  const from = eventData.returnValues.from.toLowerCase()

  const domainsService = services.domains

  if (from === '0x0000000000000000000000000000000000000000') {
    const transaction = await eth.getTransaction(transactionHash)
    const decodedData: DecodedData = abiDecoder.decodeMethod(transaction.input)

    if (decodedData) {
      const name = Utils.hexToAscii('0x' + decodedData.params[2].value.slice(218, decodedData.params[2].value.length))

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
  }

  if (ownerAddress === (fiftsAddr as string).toLowerCase()) {
    return
  }

  if (ownerAddress === (registrar as string).toLowerCase()) {
    return
  }

  const transferDomain = await Transfer.create({
    id: transactionHash,
    tokenId,
    sellerAddress: from,
    buyerAddress: ownerAddress
  })

  if (transferDomain) {
    logger.info(`Transfer event: Transfer ${tokenId} created`)
  }

  const domain = await Domain.findByPk(tokenId)

  if (domain) {
    await DomainOwner.upsert({ address: ownerAddress, tokenId })

    if (domainsService.emit) {
      domainsService.emit('patched', { tokenId, ownerAddress })
    }
    logger.info(`Transfer event: Updated DomainOwner ${ownerAddress} for tokenId ${tokenId}`)
  } else {
    await Domain.upsert({ tokenId })
    await DomainOwner.create({ tokenId, address: ownerAddress })

    if (domainsService.emit) {
      domainsService.emit('created', { tokenId, ownerAddress })
    }
    logger.info(`Transfer event: Created Domain ${tokenId} for owner ${ownerAddress}`)
  }
}

async function expirationChangedHandler (logger: Logger, eventData: EventData, _: Eth, services: RnsServices): Promise<void> {
  // event ExpirationChanged(uint256 tokenId, uint expirationTime);

  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  let normalizedTimestamp = eventData.returnValues.expirationTime as string

  // For the old RNS register where timestamps start with 10000
  if (normalizedTimestamp.startsWith('10000')) {
    normalizedTimestamp = eventData.returnValues.expirationTime.slice(5)
  }

  const expirationDate = parseInt(normalizedTimestamp) * 1000

  const currentExpiration = await DomainExpiration.findByPk(tokenId)
  const domainsService = services.domains

  if (currentExpiration) {
    await DomainExpiration.update({ expirationDate }, { where: { tokenId } })

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

async function nameChangedHandler (logger: Logger, eventData: EventData, _: Eth, services: RnsServices): Promise<void> {
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

async function tokenPlacedHandler (logger: Logger, eventData: EventData, eth: Eth, services: RnsServices): Promise<void> {
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
    await offersService.remove(currentOffer.offerId)
    logger.info(`TokenPlaced event: ${tokenId} previous placement removed`)
  } else {
    logger.info(`TokenPlaced event: ${tokenId} no previous placement`)
  }
  const { address } = owner

  await offersService.create({
    offerId: transactionHash,
    ownerAddress: address,
    tokenId: tokenId,
    paymentToken: paymentToken,
    price: cost,
    priceString: `${cost}`,
    creationDate: await getBlockDate(eth, eventData.blockNumber)
  })

  logger.info(`TokenPlaced event: ${tokenId} created`)
}

async function tokenUnplacedHandler (logger: Logger, eventData: EventData, eth: Eth, services: RnsServices): Promise<void> {
  // event TokenUnplaced(uint256 indexed tokenId);
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const storedOffer = await DomainOffer.findOne({ where: { tokenId } })

  if (storedOffer) {
    const offersService = services.offers
    await offersService.remove(storedOffer.offerId)
    logger.info(`TokenUnplaced event: ${tokenId} removed from offers`)
  } else {
    logger.info(`TokenUnplaced event: ${tokenId} not found in offers`)
  }
}

async function tokenSoldHandler (
  logger: Logger,
  eventData: EventData,
  eth: Eth,
  { sold: soldService, offers: offersService }: RnsServices
): Promise<void> {
  const {
    transactionHash,
    blockNumber
  } = eventData
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const domainOffer = await DomainOffer.findOne({ where: { tokenId } })

  if (domainOffer) {
    logger.info(`Found last offer for ${tokenId}`)
    const {
      ownerAddress,
      price,
      priceString,
      paymentToken
    } = domainOffer

    const soldDomain = await SoldDomain.create({
      id: transactionHash,
      tokenId,
      price,
      priceString,
      paymentToken,
      soldDate: await getBlockDate(eth, blockNumber)
    })

    if (soldDomain) {
      if (soldService.emit) {
        soldService.emit('created', { tokenId, ownerAddress })
      }

      await offersService.remove(domainOffer.offerId)

      if (offersService.emit) {
        offersService.emit('created', { tokenId, ownerAddress })
      }
      logger.info(`TokenSold event: Sold Domain ${tokenId} in transaction ${transactionHash}`)
    } else {
      logger.info(`TokenSold event: ${tokenId} not updated`)
    }
  }
}

const commands = {
  Transfer: transferHandler,
  ExpirationChanged: expirationChangedHandler,
  NameChanged: nameChangedHandler,
  TokenPlaced: tokenPlacedHandler,
  TokenUnplaced: tokenUnplacedHandler,
  TokenSold: tokenSoldHandler
}

function isValidEvent (value: string): value is keyof typeof commands {
  return value in commands
}

export default function rnsProcessorFactory (logger: Logger, eth: Eth, services: RnsServices) {
  return async function (eventData: EventData): Promise<void> {
    if (isValidEvent(eventData.event)) {
      logger.info(`Processing event ${eventData.event}`)
      await commands[eventData.event](logger, eventData, eth, services)
    } else {
      logger.error(`Unknown event ${eventData.event}`)
    }
  }
}
