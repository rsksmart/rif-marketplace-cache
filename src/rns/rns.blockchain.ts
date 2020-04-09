
import Domain from './models/domain.model'

import { EventData } from 'web3-eth-contract'
import { loggingFactory } from '../logger'

import Utils from 'web3-utils'

const logger = loggingFactory('rns:blockchain')

async function transferHandler (eventData: EventData): Promise<void> {

  if (eventData.returnValues.from !== "0x0000000000000000000000000000000000000000") {
    const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
    const ownerAddress = eventData.returnValues.to
    const [domain, created] = await Domain.upsert({ tokenId: tokenId, ownerAddress: ownerAddress}, { returning: true })

    if (created) {
      logger.info(`Transfer event, Domain ${tokenId} created`)
    } else {
      logger.info(`Transfer event, Domain ${tokenId} updated`)
    }
  }

}

async function expirationChangedHandler (eventData: EventData): Promise<void> {
  const tokenId = Utils.numberToHex(eventData.returnValues.tokenId)
  const expirationDate = new Date(eventData.returnValues.expirationTime * 1000)
  const [domain, created] = await Domain.upsert({ tokenId: tokenId, expirationDate: expirationDate }, { returning: true })

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

const commands = {
  Transfer: transferHandler,
  ExpirationChanged: expirationChangedHandler,
  NameChanged: nameChangedHandler
}

export default async function (eventData: EventData): Promise<void> {
  if (commands[eventData.event]) {
    await commands[eventData.event](eventData)
  } else {
    logger.error(`Unknown event ${eventData.event}`)
  }
}
