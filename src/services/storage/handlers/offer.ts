import BigNumber from 'bignumber.js'

import Offer from '../models/offer.model'
import BillingPlan from '../models/billing-plan.model'
import { EventData } from 'web3-eth-contract'
import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { OfferService, StorageServices } from '../index'
import { decodeByteArray, wrapEvent } from '../../../utils'
import { EventError } from '../../../errors'

const logger = loggingFactory('storage:handler:offer')

function updatePrices (offer: Offer, period: BigNumber, price: BigNumber): Promise<BillingPlan> {
  const {
    plans,
    provider
  } = offer

  const billingPlan = plans && plans.find(value => new BigNumber(value.period).eq(period))
  logger.info(`Updating period ${period} to price ${price} (ID: ${provider})`)

  if (billingPlan) {
    billingPlan.price = price
    return billingPlan.save()
  } else {
    const newBillingPlanEntity = new BillingPlan({ period, price, offerId: provider })
    return newBillingPlanEntity.save()
  }
}

export function weightedCumulativeAverage (newValue: number, currentCt: number, currentAvg): number {
  if (!currentAvg) return newValue

  const values = [currentAvg, newValue]
  const newValueWeight = 1 / (currentCt + 1)
  const curAvgWeight = 1 - newValueWeight
  const weights = [curAvgWeight, newValueWeight]

  return values.reduce((avg, x, i) => avg + x * weights[i], 0)
}

const handlers: { [key: string]: Function } = {
  async TotalCapacitySet (event: EventData, offer: Offer, offerService: OfferService): Promise<void> {
    offer.totalCapacity = event.returnValues.capacity
    await offer.save()

    if (offerService.emit) {
      offerService.emit('updated', wrapEvent('TotalCapacitySet', offer.toJSON()))
    }
    logger.info(`Updating capacity ${offer.totalCapacity} (ID: ${offer.provider})`)
  },
  async MessageEmitted (event: EventData, offer: Offer, offerService: OfferService): Promise<void> {
    const msg = event.returnValues.message

    if (!msg || msg.length === 0) {
      return
    }

    const [firstMsg, ...restMsg] = msg
    const flag = firstMsg.substring(2, 4)

    if (flag === '01') { // PeerId definition
      offer.peerId = decodeByteArray([`0x${firstMsg.substring(4)}`, ...restMsg])

      await offer.save()

      if (offerService.emit) {
        offerService.emit('updated', wrapEvent('MessageEmitted', offer.toJSON()))
      }
      logger.info(`PeerId ${offer.peerId} defined (ID: ${offer.provider})`)
    } else {
      throw new EventError(`Unknown message flag ${flag}!`, event.event)
    }
  },
  async BillingPlanSet ({ returnValues: { period, price } }: EventData, offer: Offer, offerService: OfferService): Promise<void> {
    const plan = await updatePrices(offer, period, price)

    const { plans, averagePrice } = offer
    const planPrice = Math.round(plan.price.toNumber())

    const newAvgPrice = plans && weightedCumulativeAverage(planPrice, plans.length, averagePrice)
    offer.averagePrice = newAvgPrice || planPrice
    offer.save()

    if (offerService.emit) {
      const freshOffer = await Offer.findByPk(offer.provider) as Offer
      offerService.emit('updated', wrapEvent('BillingPlanSet', freshOffer.toJSON()))
    }
  }
}

const handler: Handler<StorageServices> = {
  events: ['TotalCapacitySet', 'MessageEmitted', 'BillingPlanSet'],
  async process (event: EventData, { offerService }: StorageServices): Promise<void> {
    const provider = event.returnValues.provider

    // TODO: Ignored until https://github.com/sequelize/sequelize/pull/11924
    // @ts-ignore
    const [offer, created] = await Offer.findOrCreate({ where: { provider }, include: [BillingPlan] })

    if (created) {
      logger.info(`Created new StorageOffer for ${provider}`)
    }

    if (offerService.emit && created) {
      offerService.emit('created', offer.toJSON())
    }

    if (!handlers[event.event]) {
      logger.error(`Unknown event ${event.event}`)
    }

    await handlers[event.event](event, offer, offerService)
  }
}

export default handler
