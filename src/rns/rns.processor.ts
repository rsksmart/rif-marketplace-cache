import Domain from './models/domain.model'
import SoldDomain from './models/sold-domain.model'
import Transfer from './models/transfer.model'
import DomainOffer from './models/domain-offer.model'

import { EventData } from 'web3-eth-contract'

import Utils from 'web3-utils'
import { Eth } from 'web3-eth'
import { getBlockDate } from '../blockchain/utils'
import { Logger } from '../definitions'

async function transferHandler (logger: Logger, eventData: EventData): Promise<void> {
  // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)

  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const ownerAddress = eventData.returnValues.to.toLowerCase()

  const [domain, created] = await Domain.findCreateFind({ where: { tokenId }, defaults: { ownerAddress } })

  if (eventData.returnValues.from !== '0x0000000000000000000000000000000000000000') {
    // if not exist then create (1 insert), Domain.findCreateFind
    // else create a SoldDomain and update with the new owner the registry (1 insert + update)
    if (created) {
      logger.info(`Transfer event: Domain ${tokenId} created`)
    } else {
      logger.info(`Transfer event: Domain ${tokenId} updated`)
      const transactionHash = eventData.transactionHash
      const from = eventData.returnValues.from.toLowerCase()

      const transferDomain = await Transfer.create({
        id: transactionHash,
        tokenId,
        sellerAddress: from,
        newOwnerAddress: ownerAddress
      })

      if (transferDomain) {
        logger.info(`Transfer event: Transfer ${tokenId} created`)
      }
      const [affectedRows] = await Domain.update({ ownerAddress }, { where: { tokenId } })

      if (affectedRows) {
        logger.info(`Transfer event: Updated Domain ${domain.name} -> ${tokenId}`)
      } else {
        logger.info(`Transfer event: no Domain ${domain.name} updated`)
      }
    }
  } else {
    if (domain.ownerAddress == null) {
      domain.ownerAddress = ownerAddress
      await domain.save()
      logger.info(`Transfer event: ${tokenId} ownership updated`)
    }
  }
}

async function expirationChangedHandler (logger: Logger, eventData: EventData): Promise<void> {
  // event ExpirationChanged(uint256 tokenId, uint expirationTime);

  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  let normalizedTimestamp = eventData.returnValues.expirationTime as string

  // For the old RNS register where timestamps start with 10000
  if (normalizedTimestamp.startsWith('10000')) {
    normalizedTimestamp = eventData.returnValues.expirationTime.slice(5)
  }
  const expirationDate = parseInt(normalizedTimestamp) * 1000
  await Domain.upsert({ tokenId, expirationDate })

  logger.info(`ExpirationChange event: Domain ${tokenId} updated`)
}

async function nameChangedHandler (logger: Logger, eventData: EventData): Promise<void> {
  const name = eventData.returnValues.name

  const label = name.substring(0, name.indexOf('.'))
  const tokenId = Utils.sha3(label)

  const [affectedRows] = await Domain.update({ name: name }, { where: { tokenId: tokenId } })

  if (affectedRows) {
    logger.info(`NameChanged event: Updated Domain ${name} -> ${tokenId}`)
  } else {
    logger.info(`NameChanged event: no Domain ${name} updated`)
  }
}

async function tokenPlacedHandler (logger: Logger, eventData: EventData, eth: Eth): Promise<void> {
  // event TokenPlaced(uint256 indexed tokenId, address indexed paymentToken, uint256 cost);

  const transactionHash = eventData.transactionHash
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const paymentToken = eventData.returnValues.paymentToken
  const cost = eventData.returnValues.cost

  const domain = await Domain.findByPk(tokenId)

  if (!domain) {
    throw new Error(`Domain with token ID ${tokenId} not found!`)
  }

  const [affectedRows] = await DomainOffer.update({
    status: 'CANCELED'
  }, { where: { tokenId: tokenId, status: 'ACTIVE' } })

  if (affectedRows) {
    logger.info(`TokenPlaced event: ${tokenId} previous placement cancelled`)
  } else {
    logger.info(`TokenPlaced event: ${tokenId} no previous placement`)
  }

  const domainOffer = new DomainOffer({
    offerId: transactionHash,
    sellerAddress: domain.ownerAddress,
    tokenId: tokenId,
    paymentToken: paymentToken,
    price: cost,
    creationDate: await getBlockDate(eth, eventData.blockNumber),
    status: 'ACTIVE'
  })
  await domainOffer.save()

  logger.info(`TokenPlaced event: ${tokenId} created`)
}

async function tokenUnplacedHandler (logger: Logger, eventData: EventData): Promise<void> {
  // event TokenUnplaced(uint256 indexed tokenId);

  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)

  const [affectedRows] = await DomainOffer.update({
    status: 'CANCELED'
  }, { where: { tokenId: tokenId, status: 'ACTIVE' } })

  if (affectedRows) {
    logger.info(`TokenUnplaced event: ${tokenId} updated`)
  } else {
    logger.info(`TokenUnplaced event: ${tokenId} not updated`)
  }
}

async function tokenSoldHandler (logger: Logger, eventData: EventData, eth: Eth): Promise<void> {
  // event TokenSold(uint256 indexed tokenId);

  const transactionHash = eventData.transactionHash
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)

  const lastOffer = await DomainOffer.findOne({ where: { tokenId: tokenId, status: 'ACTIVE' } })

  if (lastOffer) {
    logger.info(`Found last offer for ${tokenId}`)
    lastOffer.status = 'SOLD'
    lastOffer.save()

    const soldDomain = await SoldDomain.create({
      id: transactionHash,
      tokenId: tokenId,
      price: lastOffer.price,
      paymentToken: lastOffer.paymentToken,
      soldDate: await getBlockDate(eth, eventData.blockNumber)
    })

    if (soldDomain) {
      logger.info(`TokenSold event: ${tokenId}`)
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

export default function rnsProcessorFactory (logger: Logger, eth: Eth) {
  return async function (eventData: EventData): Promise<void> {
    if (isValidEvent(eventData.event)) {
      logger.info(`Processing event ${eventData.event}`)
      await commands[eventData.event](logger, eventData, eth)
    } else {
      logger.error(`Unknown event ${eventData.event}`)
    }
  }
}
