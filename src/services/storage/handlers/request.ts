import { EventData } from 'web3-eth-contract'
import { hexToAscii, soliditySha3 } from 'web3-utils'

import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import Request from '../models/request.model'
import { EventError } from '../../../errors'
import Price from '../models/price.model'

const logger = loggingFactory('storage:handler:request')

function decodeFileReference (fileReference: string[]): string {
  return fileReference
    .map(hexToAscii)
    .join('')
    .trim()
    .replace(/\0/g, '') // Remove null-characters
}

const handlers = {
  async RequestMade (event: EventData): Promise<void> {
    const { provider: offerId, period } = event.returnValues
    const id = soliditySha3(event.returnValues.requester, ...event.returnValues.fileReference)
    const fileReference = decodeFileReference(event.returnValues.fileReference)

    const price = await Price.findOne({ where: { offerId, period } })

    if (!price) {
      throw new EventError(`Price for period ${period} and offer ${offerId} not found when creating new request ${id}`, 'RequestMade')
    }

    const req = new Request({
      requestId: id,
      reference: fileReference,
      requester: event.returnValues.requester,
      offerId: offerId,
      size: event.returnValues.size,
      period: event.returnValues.period,
      price: price.amount,
      deposited: event.returnValues.deposited
    })
    await req.save()
    logger.info(`Created new Request with ID ${id} for offer ${offerId}`)
  },

  async RequestStopped (event: EventData): Promise<void> {
    const id = event.returnValues.requestReference
    const request = await Request.findByPk(id)

    if (!request) {
      throw new EventError(`Request with ID ${id} was not found!`, 'RequestStopped')
    }

    await request.destroy()
    logger.info(`Request ${id} was stopped.`)
  },

  async RequestTopUp (event: EventData): Promise<void> {
    const id = event.returnValues.requestReference
    const request = await Request.findByPk(id)

    if (!request) {
      throw new EventError(`Request with ID ${id} was not found!`, 'RequestTopUp')
    }

    request.deposited += event.returnValues.deposited
    await request.save()
    logger.info(`Request ${id} was topped up with ${event.returnValues.deposited}.`)
  },

  async EarningsWithdrawn (event: EventData): Promise<void> {
    const id = event.returnValues.requestReference
    const request = await Request.findByPk(id)

    if (!request) {
      throw new EventError(`Request with ID ${id} was not found!`, 'EarningsWithdrawn')
    }

    await request.destroy()
    logger.info(`Request ${id} expired and was removed.`)
  }
}

function isValidEvent (value: string): value is keyof typeof handlers {
  return value in handlers
}

const handler: Handler = {
  events: ['RequestMade', 'RequestStopped', 'RequestTopUp', 'EarningsWithdrawn'],
  handler (event: EventData): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    return handlers[event.event](event)
  }
}
export default handler
