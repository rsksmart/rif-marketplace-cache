import Domain from './models/domain.model'
import SoldDomain from './models/sold-domain.model'
import DomainOffer from './models/domain-offer.model'

import { EventData } from 'web3-eth-contract'
import { loggingFactory } from '../logger'

import Utils from 'web3-utils'

const logger = loggingFactory('rns:blockchain')

async function transferHandler (eventData: EventData): Promise<void> {
  // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)

  if (eventData.returnValues.from !== '0x0000000000000000000000000000000000000000') {
    const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
    const ownerAddress = eventData.returnValues.to.toLowerCase()
    const [domain, created] = await Domain.findCreateFind({ where: { tokenId }, defaults: { ownerAddress } })
    // if not exist then create (1 insert), Domain.findCreateFind
    // else create a SoldDomain and update with the new owner the registry (1 insert + update)
    if (created) {
      logger.info(`Transfer event, Domain ${tokenId} created`)
    } else {
      logger.info(`Transfer event, Domain ${tokenId} updated`)
      const transactionHash = eventData.transactionHash
      const from = eventData.returnValues.from.toLowerCase()
      const soldDomain = await SoldDomain.create({
        id: transactionHash,
        tokenId: tokenId,
        sellerAddress: from,
        newOwnerAddress: ownerAddress
      })

      if (soldDomain) {
        logger.info(`Transfer event, SoldDomain ${tokenId} created`)
      }
      const [affectedRows, realAffectedRows] = await Domain.update({ ownerAddress }, { where: { tokenId } })
      if (affectedRows) {
        logger.info(`Transfer event, Updated Domain ${domain} -> ${tokenId}`)
      } else {
        logger.info(`Transfer event, no Domain ${domain} updated`)
      }
    }
  }
}

async function expirationChangedHandler (eventData: EventData): Promise<void> {
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const expirationDate = BigInt(eventData.returnValues.expirationTime * 1000)
  const [domain, created] = await Domain.upsert({ tokenId, expirationDate }, { returning: true })

  if (created) {
    logger.info(`ExpirationChange event, Domain ${tokenId} created`)
  } else {
    logger.info(`ExpirationChange event, Domain ${tokenId} updated`)
  }
}

async function nameChangedHandler (eventData: EventData): Promise<void> {
  const name = eventData.returnValues.name

  const label = name.substring(0, name.indexOf('.'))
  const tokenId = Utils.sha3(label)

  const [affectedRows, realAffectedRows] = await Domain.update({ name: name }, { where: { tokenId: tokenId } })

  if (affectedRows) {
    logger.info(`NameChanged event, Updated Domain ${name} -> ${tokenId}`)
  } else {
    logger.info(`NameChanged event, no Domain ${name} updated`)
  }
}

async function updatePlacementHandler (eventData: EventData): Promise<void> {
  // UpdatePlacement(tokenId, paymentToken, cost)
  const transactionHash = eventData.transactionHash
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const paymentToken = eventData.returnValues.paymentToken
  const cost = eventData.returnValues.cost

  if (cost === '0') {
    // Canceled or sold
    logger.info(`Canceled or sold: ${tokenId}`)
    const lastOffer = await DomainOffer.findOne({ where: { tokenId: tokenId, status: 'COMPLETED' } })

    if (lastOffer) {
      logger.info(`Found last offer for ${tokenId}`)
      lastOffer.status = 'CANCELED'
      lastOffer.save()

      const [affectedRows, realAffectedRows] = await SoldDomain.update({
        price: lastOffer.price,
        paymentToken: lastOffer.paymentToken,
        soldDate: BigInt(Date.now())
      }, { where: { id: transactionHash } })

      if (affectedRows) {
        logger.info(`UpdatePlacement event, Sold Domain ${tokenId}`)
      } else {
        logger.info(`UpdatePlacement event, no Domain ${tokenId} updated`)
      }
    }
  } else {
    const price = cost

    const domain = await Domain.findByPk(tokenId)

    const domainOffer = await DomainOffer.create({
      offerId: transactionHash,
      sellerAddress: domain.ownerAddress,
      tokenId: tokenId,
      paymentToken: paymentToken,
      price: price,
      creationDate: BigInt(Date.now()), // TODO: get from block timestamp
      status: 'COMPLETED'
    })

    if (domainOffer) {
      logger.info(`UpdatePlacement event, Domain ${tokenId} created`)
    }
  }

  logger.info(`UpdatePlacement: ${tokenId}, ${paymentToken}, ${cost}`)
}

const commands = {
  Transfer: transferHandler,
  ExpirationChanged: expirationChangedHandler,
  NameChanged: nameChangedHandler,
  UpdatePlacement: updatePlacementHandler
}

export default async function (eventData: EventData): Promise<void> {
  if (commands[eventData.event]) {
    await commands[eventData.event](eventData)
  } else {
    logger.error(`Unknown event ${eventData.event}`)
  }
}
