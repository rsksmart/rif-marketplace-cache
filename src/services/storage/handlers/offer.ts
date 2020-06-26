import Offer from '../models/offer.model'
import BillingPlan from '../models/price.model'
import { EventData } from 'web3-eth-contract'
import { loggingFactory } from '../../../logger'
import { Handler } from '../../../definitions'
import { StorageServices } from '../index'
import { decodeByteArray } from '../../../utils'

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
        logger.info(`Updating capacity ${offer.totalCapacity} (ID: ${offer.address})`)
        break
      case 'MessageEmitted': {
        const msg = event.returnValues.message

        if (!msg || msg.length === 0) {
          break
        }

        const [firstMsg, ...restMsg] = msg[0].replace('0x', '')
        const flag = firstMsg.substring(0, 2)

        if (flag === '01') { // PeerId definition
          offer.peerId = decodeByteArray([firstMsg.substring(2), ...restMsg])
          logger.info(`PeerId ${offer.peerId} defined (ID: ${offer.address})`)
        } else {
          logger.error(`Unknown message flag ${flag}!`)
        }
        break
      }
      case 'BillingPlanSet':
        await updatePrices(offer, event.returnValues.period, event.returnValues.price)
        break
      default:
        logger.error(`Unknown event ${event.event}`)
    }

    await offer.save()

    // @TODO if we receive an unknown message then update actually doesn't happens, because offer don't changed
    // Should we emit `update` event then
    if (offerService.emit) offerService.emit(created ? 'created' : 'updated', offer.toJSON())
  }
}

export default handler
