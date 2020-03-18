import StorageOffer from './models/storage-offer.model'
import Price from './models/price.model'
import { EventData } from 'web3-eth-contract'
import { loggingFactory } from '../logger'

const logger = loggingFactory('storage:blockchain')

function updatePrices (offer: StorageOffer, period: number, price: number): Promise<Price> {
  const priceEntity = offer.prices && offer.prices.find(value => value.period === period)
  logger.info(`Updating period ${period} to price ${price} (ID: ${offer.address}`)

  if (priceEntity) {
    priceEntity.amount = price
    return priceEntity.save()
  } else {
    const newPriceEntity = new Price({ period, amount: price, offerId: offer.address })
    return newPriceEntity.save()
  }
}

export default async function (event: EventData): Promise<void> {
  const storer = event.returnValues.storer

  // TODO: Ignored until https://github.com/sequelize/sequelize/pull/11924
  // @ts-ignore
  const [offer, created] = await StorageOffer.findOrCreate({ where: { address: storer }, include: [Price] })

  if (created) {
    logger.info(`Created new StorageOffer for ${storer}`)
  }

  switch (event.event) {
    case 'CapacitySet':
      offer.capacity = event.returnValues.capacity
      logger.info(`Updating capacity ${offer.capacity} (ID: ${offer.address}`)
      break
    case 'MaximumDurationSet':
      offer.maximumDuration = event.returnValues.maximumDuration
      logger.info(`Updating maximum duration ${offer.maximumDuration} (ID: ${offer.address}`)
      break
    case 'PriceSet':
      await updatePrices(offer, event.returnValues.period, event.returnValues.price)
      break
    default:
      logger.error(`Unknown event ${event.event}`)
  }

  await offer.save()
}
