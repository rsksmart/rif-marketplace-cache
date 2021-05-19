import BigNumber from 'bignumber.js'
import Libp2p from 'libp2p'

import Offer from '../models/offer.model'
import BillingPlan from '../models/billing-plan.model'
import { EventLog } from 'web3-core'
import { loggingFactory } from '../../../logger'
import { Handler, StorageOfferEvents, SupportedServices } from '../../../definitions'
import { StorageServices } from '../index'
import { decodeByteArray, wrapEvent } from '../../../utils'
import { EventError } from '../../../errors'
import { getTokenSymbol } from '../../utils'
import { OfferService } from '../services'
import { subscribeForOffer } from '../../../communication'

const logger = loggingFactory('storage:handler:offer')

async function updatePrices (offer: Offer, period: number, price: number, tokenAddress: string): Promise<void> {
  const {
    plans,
    provider
  } = offer

  const billingPlan = plans && plans.find(value => new BigNumber(value.period).eq(period) && tokenAddress === value.tokenAddress)
  logger.info(`Updating period ${period} to price ${price} (ID: ${provider}, TOKEN: ${tokenAddress})`)

  // Remove plans with 0 price
  if (new BigNumber(price).eq(0)) {
    await BillingPlan.destroy({ where: { period, tokenAddress } })
    return
  }

  if (billingPlan) {
    billingPlan.price = new BigNumber(price)
    await billingPlan.save()
  } else {
    const tokenSymbol = getTokenSymbol(tokenAddress, SupportedServices.STORAGE).toLowerCase()
    const newBillingPlanEntity = new BillingPlan({
      period,
      price,
      offerId: provider,
      tokenAddress,
      rateId: tokenSymbol
    })
    await newBillingPlanEntity.save()
  }
}

const handlers: { [key: string]: (...args: any[]) => any } = {
  async TotalCapacitySet (event: EventLog, offer: Offer, offerService: OfferService): Promise<void> {
    offer.totalCapacity = event.returnValues.capacity
    await offer.save()

    if (offerService.emit) {
      offerService.emit('updated', wrapEvent('TotalCapacitySet', offer.toJSON()))
    }
    logger.info(`Updating capacity ${offer.totalCapacity} (ID: ${offer.provider})`)
  },
  async MessageEmitted (
    event: EventLog,
    offer: Offer,
    offerService: OfferService,
    { libp2p }: { libp2p?: Libp2p }
  ): Promise<void> {
    const msg = event.returnValues.message

    if (!msg || msg.length === 0) {
      return
    }

    const [firstMsg, ...restMsg] = msg
    const flag = firstMsg.substring(2, 4)

    if (flag === '01') { // PeerId definition
      const newPeerId = decodeByteArray([`0x${firstMsg.substring(4)}`, ...restMsg])

      if (offer.peerId === newPeerId) {
        return
      }

      offer.peerId = newPeerId
      await offer.save()

      if (offerService.emit) {
        offerService.emit('updated', wrapEvent('MessageEmitted', offer.toJSON()))

        // Join to libp2p room for that offer
        if (libp2p) {
          subscribeForOffer(libp2p, offer)
        }
      }
      logger.info(`PeerId ${offer.peerId} defined (ID: ${offer.provider})`)
    } else {
      throw new EventError(`Unknown message flag ${flag}!`, event.event)
    }
  },
  async BillingPlanSet ({ returnValues: { period, price, token } }: EventLog, offer: Offer, offerService: OfferService): Promise<void> {
    await updatePrices(offer, period, price, token)

    if (offerService.emit) {
      const freshOffer = await Offer.findByPk(offer.provider) as Offer

      if (freshOffer) {
        offerService.emit('updated', wrapEvent('BillingPlanSet', freshOffer.toJSON()))
      }
    }
  }
}

const handler: Handler<StorageOfferEvents, StorageServices> = {
  events: ['TotalCapacitySet', 'MessageEmitted', 'BillingPlanSet'],
  async process (event: StorageOfferEvents, { offerService }: StorageServices, { libp2p }): Promise<void> {
    const provider = event.returnValues.provider

    // @ts-ignore: TODO: Ignored until https://github.com/sequelize/sequelize/pull/11924
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

    await handlers[event.event](event, offer, offerService, { libp2p })
  }
}

export default handler
