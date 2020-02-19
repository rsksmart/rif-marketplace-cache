import { Application } from '../declarations'
import Eth from 'web3-eth'
import { EventData } from 'web3-eth-contract'
import StorageOffer from '../models/storage-offer.model'
import Price from '../models/price.model'
import { factory } from '../logger'
import eventsEmitterFactory, { EventsEmitterOptions, PollingOptions } from './events'
import { getPinningContract } from './utils'
import config from 'config'
import { Sequelize } from 'sequelize-typescript'

const logger = factory('blockchain')
const VALID_EVENTS = ['CapacitySet', 'MaximumDurationSet', 'PriceSet']

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

function processEventClosure (sequalize: Sequelize): (event: EventData) => Promise<void> {
  return async function (event: EventData): Promise<void> {
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
}

export default async function (app: Application): Promise<void> {
  const sequelizeSync = app.get('sequelizeSync') as Promise<void>
  await sequelizeSync

  const provider = Eth.givenProvider || config.get('blockchain.provider')
  const eth = new Eth(provider)
  const contract = getPinningContract(eth, config.get('blockchain.pinningContractAddress'))
  const sequelize = app.get('sequelizeClient') as Sequelize

  const eventsEmitterOptions = config.get<EventsEmitterOptions>('blockchain.eventsEmitter')
  const newBlockEmitterOptions = config.get<PollingOptions>('blockchain.newBlockEmitter')
  const options = Object.assign({}, eventsEmitterOptions, { newBlockEmitter: newBlockEmitterOptions })

  const eventsEmitter = eventsEmitterFactory(eth, contract, VALID_EVENTS, options)
  eventsEmitter.on('newEvent', processEventClosure(sequelize))
}
