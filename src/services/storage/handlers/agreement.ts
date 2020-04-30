import { EventData } from 'web3-eth-contract'
import { hexToAscii, soliditySha3 } from 'web3-utils'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { EventError } from '../../../errors'

import Agreement from '../models/agreement.model'
import BillingPlan from '../models/price.model'
import { getBlockDate } from '../../../blockchain/utils'
import { Eth } from 'web3-eth'

const logger = loggingFactory('storage:handler:request')

function decodeDataReference (fileReference: string[]): string {
  return fileReference
    .map(hexToAscii)
    .join('')
    .trim()
    .replace(/\0/g, '') // Remove null-characters
}

const handlers = {
  async NewAgreement (event: EventData, eth: Eth): Promise<void> {
    const { provider: offerId, billingPeriod: period } = event.returnValues
    const id = soliditySha3(event.returnValues.agreementCreator, ...event.returnValues.dataReference)
    const dataReference = decodeDataReference(event.returnValues.dataReference)

    const plan = await BillingPlan.findOne({ where: { offerId, period } })

    if (!plan) {
      throw new EventError(`Price for period ${period} and offer ${offerId} not found when creating new request ${id}`, 'RequestMade')
    }

    // TODO: Agreement might be already existing
    const req = new Agreement({
      agreementReference: id,
      dataReference,
      consumer: event.returnValues.agreementCreator,
      offerId: offerId,
      size: event.returnValues.size,
      billingPeriod: event.returnValues.billingPeriod,
      billingPrice: plan.amount,
      availableFunds: event.returnValues.availableFunds,
      lastPayout: await getBlockDate(eth, event.blockNumber)
    })
    await req.save()
    logger.info(`Created new Agreement with ID ${id} for offer ${offerId}`)
  },

  async AgreementStopped (event: EventData): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementStopped')
    }

    agreement.isActive = false
    await agreement.save()
    logger.info(`Agreement ${id} was stopped.`)
  },

  async AgreementFundsDeposited (event: EventData): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementFundsDeposited')
    }

    agreement.availableFunds += parseInt(event.returnValues.amount)
    await agreement.save()
    logger.info(`Agreement ${id} was topped up with ${event.returnValues.amount}.`)
  },

  async AgreementFundsWithdrawn (event: EventData): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementFundsWithdrawn')
    }

    agreement.availableFunds -= parseInt(event.returnValues.amount)
    await agreement.save()
    logger.info(`${event.returnValues.amount} was withdrawn from funds of Agreement ${id}.`)
  },

  async AgreementFundsPayout (event: EventData, eth: Eth): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementFundsWithdrawn')
    }

    agreement.lastPayout = await getBlockDate(eth, event.blockNumber)
    agreement.availableFunds -= parseInt(event.returnValues.amount)
    await agreement.save()
    logger.info(`${event.returnValues.amount} was payed out from funds of Agreement ${id}.`)
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler = {
  events: ['NewAgreement', 'AgreementFundsDeposited', 'AgreementFundsWithdrawn', 'AgreementFundsPayout', 'AgreementStopped'],
  handler (event: EventData, eth: Eth): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event, eth)
  }
}
export default handler
