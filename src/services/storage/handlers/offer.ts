import Offer from '../models/offer.model'
import BillingPlan from '../models/price.model'
import { EventData } from 'web3-eth-contract'
import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'
import { decodeByteArray, wrapEvent } from '../../../utils'
import { EventError } from '../../../errors'

const logger = loggingFactory('storage:handler:offer')

function updatePrices (offer: Offer, period: number, price: number): Promise<BillingPlan> {
  const priceEntity = offer.plans && offer.plans.find(value => value.period === period)
  logger.info(`Updating period ${period} to price ${price} (ID: ${offer.address})`)

  if (priceEntity) {
    priceEntity.amount = price
    return priceEntity.save()
  } else {
    const newPriceEntity = new BillingPlan({ period, amount: price, offerId: offer.address })
    return newPriceEntity.save()
  }
}

const handler: Handler<StorageServices> = {
  events: ['TotalCapacitySet', 'MessageEmitted', 'BillingPlanSet'],
  async process (event: EventData, { offerService }: StorageServices): Promise<void> {
    const provider = event.returnValues.provider

    // TODO: Ignored until https://github.com/sequelize/sequelize/pull/11924
    // @ts-ignore
    const [offer, created] = await Offer.findOrCreate({ where: { address: provider }, include: [BillingPlan] })

    if (created) {
      logger.info(`Created new StorageOffer for ${provider}`)
    }

    switch (event.event) {
      case 'TotalCapacitySet':
        offer.totalCapacity = event.returnValues.capacity

        if (offerService.emit) offerService.emit('update', wrapEvent('TotalCapacitySet', offer.toJSON()))
        logger.info(`Updating capacity ${offer.totalCapacity} (ID: ${offer.address})`)
        break
      case 'MessageEmitted': {
        const msg = event.returnValues.message

        if (!msg || msg.length === 0) {
          break
        }

        const [firstMsg, ...restMsg] = msg
        const flag = firstMsg.substring(2, 4)

        if (flag === '01') { // PeerId definition
          offer.peerId = decodeByteArray([`0x${firstMsg.substring(4)}`, ...restMsg])

          if (offerService.emit) offerService.emit('update', wrapEvent('MessageEmitted', offer.toJSON()))
          logger.info(`PeerId ${offer.peerId} defined (ID: ${offer.address})`)
        } else {
          throw new EventError(`Unknown message flag ${flag}!`, event.event)
        }
        break
      }
      case 'BillingPlanSet':
        await updatePrices(offer, event.returnValues.period, event.returnValues.price)
        break
      default:
        logger.error(`Unknown event ${event.event}`)
        break
    }

    await offer.save()

    if (offerService.emit && created) offerService.emit('created', offer.toJSON())
  }
}

export default handler
