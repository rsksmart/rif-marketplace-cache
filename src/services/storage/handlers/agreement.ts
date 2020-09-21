import { EventData } from 'web3-eth-contract'
import { soliditySha3 } from 'web3-utils'
import { Eth } from 'web3-eth'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { EventError } from '../../../errors'
import { decodeByteArray, wrapEvent } from '../../../utils'
import { getBlockDate } from '../../../blockchain/utils'

import Agreement from '../models/agreement.model'
import BillingPlan from '../models/billing-plan.model'
import { StorageServices } from '../index'

const logger = loggingFactory('storage:handler:request')

const handlers = {
  async NewAgreement (event: EventData, { agreementService }: StorageServices, eth: Eth): Promise<void> {
    const { provider: offerId, billingPeriod: period, token } = event.returnValues
    const id = soliditySha3(event.returnValues.agreementCreator, ...event.returnValues.dataReference)
    const dataReference = decodeByteArray(event.returnValues.dataReference)

    const plan = await BillingPlan.findOne({ where: { offerId, period, token } })

    if (!plan) {
      throw new EventError(`Price for period ${period} and offer ${offerId} not found when creating new request ${id}`, 'RequestMade')
    }

    const data = {
      agreementReference: id,
      dataReference,
      consumer: event.returnValues.agreementCreator,
      offerId: offerId,
      size: event.returnValues.size,
      billingPeriod: event.returnValues.billingPeriod,
      billingPrice: plan.price,
      availableFunds: event.returnValues.availableFunds,
      lastPayout: await getBlockDate(eth, event.blockNumber)
    }
    await Agreement.upsert(data) // Agreement might already exist

    if (agreementService.emit) agreementService.emit('created', wrapEvent('NewAgreement', data))
    logger.info(`Created new Agreement with ID ${id} for offer ${offerId}`)
  },

  async AgreementStopped (event: EventData, { agreementService }: StorageServices): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementStopped')
    }

    agreement.isActive = false
    await agreement.save()

    if (agreementService.emit) agreementService.emit('updated', wrapEvent('AgreementStopped', agreement.toJSON()))
    logger.info(`Agreement ${id} was stopped.`)
  },

  async AgreementFundsDeposited (event: EventData, { agreementService }: StorageServices): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementFundsDeposited')
    }

    agreement.availableFunds = agreement.availableFunds.plus(event.returnValues.amount)
    await agreement.save()

    if (agreementService.emit) agreementService.emit('updated', wrapEvent('AgreementFundsDeposited', agreement.toJSON()))
    logger.info(`Agreement ${id} was topped up with ${event.returnValues.amount}.`)
  },

  async AgreementFundsWithdrawn (event: EventData, { agreementService }: StorageServices): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementFundsWithdrawn')
    }

    agreement.availableFunds = agreement.availableFunds.minus(event.returnValues.amount)
    await agreement.save()

    if (agreementService.emit) agreementService.emit('updated', wrapEvent('AgreementFundsWithdrawn', agreement.toJSON()))
    logger.info(`${event.returnValues.amount} was withdrawn from funds of Agreement ${id}.`)
  },

  async AgreementFundsPayout (event: EventData, { agreementService }: StorageServices, eth: Eth): Promise<void> {
    const id = event.returnValues.agreementReference
    const agreement = await Agreement.findByPk(id)

    if (!agreement) {
      throw new EventError(`Agreement with ID ${id} was not found!`, 'AgreementFundsWithdrawn')
    }

    agreement.lastPayout = await getBlockDate(eth, event.blockNumber)
    agreement.availableFunds = agreement.availableFunds.minus(event.returnValues.amount)
    await agreement.save()

    if (agreementService.emit) agreementService.emit('updated', wrapEvent('AgreementFundsPayout', agreement.toJSON()))
    logger.info(`${event.returnValues.amount} was payed out from funds of Agreement ${id}.`)
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler<StorageServices> = {
  events: ['NewAgreement', 'AgreementFundsDeposited', 'AgreementFundsWithdrawn', 'AgreementFundsPayout', 'AgreementStopped'],
  process (event: EventData, services: StorageServices, eth: Eth): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event, services, eth)
  }
}
export default handler
