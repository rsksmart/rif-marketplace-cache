import { soliditySha3 } from 'web3-utils'
import { Eth } from 'web3-eth'

import { loggingFactory } from '../../../logger'
import { Handler, StorageAgreementEvents } from '../../../definitions'
import { EventError } from '../../../errors'
import { decodeByteArray, wrapEvent } from '../../../utils'
import { getBlockDate } from '../../../blockchain/utils'

import Agreement from '../models/agreement.model'
import BillingPlan from '../models/billing-plan.model'
import { StorageServices } from '../index'
import {
  AgreementFundsDeposited, AgreementFundsPayout, AgreementFundsWithdrawn,
  AgreementStopped,
  NewAgreement
} from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/StorageManager'

const logger = loggingFactory('storage:handler:request')

const handlers = {
  async NewAgreement (event: NewAgreement, { agreementService }: StorageServices, eth: Eth): Promise<void> {
    const { provider: offerId, billingPeriod: period, token: tokenAddress } = event.returnValues
    const id = soliditySha3(event.returnValues.agreementCreator, ...event.returnValues.dataReference, tokenAddress)
    const dataReference = decodeByteArray(event.returnValues.dataReference)

    const plan = await BillingPlan.findOne({ where: { offerId, period, tokenAddress } })

    if (!plan) {
      throw new EventError(`Price for period ${period}, token ${tokenAddress} and offer ${offerId} not found when creating new request ${id}`, 'RequestMade')
    }

    const data = {
      agreementReference: id,
      dataReference,
      consumer: event.returnValues.agreementCreator,
      offerId: offerId,
      size: event.returnValues.size,
      billingPeriod: event.returnValues.billingPeriod,
      billingPrice: plan.price,
      tokenAddress,
      availableFunds: event.returnValues.availableFunds,
      lastPayout: await getBlockDate(eth, event.blockNumber)
    }
    await Agreement.upsert(data) // Agreement might already exist

    if (agreementService.emit) agreementService.emit('created', wrapEvent('NewAgreement', data))
    logger.info(`Created new Agreement with ID ${id} for offer ${offerId}`)
  },

  async AgreementStopped (event: AgreementStopped, { agreementService }: StorageServices): Promise<void> {
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

  async AgreementFundsDeposited (event: AgreementFundsDeposited, { agreementService }: StorageServices): Promise<void> {
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

  async AgreementFundsWithdrawn (event: AgreementFundsWithdrawn, { agreementService }: StorageServices): Promise<void> {
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

  async AgreementFundsPayout (event: AgreementFundsPayout, { agreementService }: StorageServices, eth: Eth): Promise<void> {
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

const handler: Handler<StorageAgreementEvents, StorageServices> = {
  events: ['NewAgreement', 'AgreementFundsDeposited', 'AgreementFundsWithdrawn', 'AgreementFundsPayout', 'AgreementStopped'],
  process (event: StorageAgreementEvents, services: StorageServices, { eth }): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    // @ts-ignore: we had strict types for each handler(A & B) and one type for all of event StorageAgreementEvents(A | B)
    return handlers[event.event](event, services, eth as Eth)
  }
}
export default handler
