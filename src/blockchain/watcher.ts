import Eth from 'web3-eth'
import { EventData } from 'web3-eth-contract'

import { Application } from '../declarations'
import { getPinningContract } from './utils'
import { PinningManager } from '@rsksmart/rif-martketplace-storage-pinning/types/web3-v1-contracts/PinningManager'
import { factory } from '../logger'
import StorageOffer from '../models/storage-offer.model'
import Price from '../models/price.model'
// Don't remove this comment. It's needed to format import lines nicely.

const logger = factory('watcher')
const DEFAULT_POLLING_INTERVAL = 5000
const VALID_EVENTS = ['CapacitySet', 'MaximumDurationSet', 'PriceSet']

function updatePrices (offer: StorageOffer, period: number, price: number): Promise<Price> {
  const priceEntity = offer.prices && offer.prices.find(value => value.period === period)
  logger.info(`Updating offer ID ${offer.address} period ${period} to price ${price}`)

  if (priceEntity) {
    priceEntity.amount = price
    return priceEntity.save()
  } else {
    const newPriceEntity = new Price({ period, price, offerId: offer.address })
    return newPriceEntity.save()
  }
}

export interface PinningWatcherOptions {
  lastProcessedBlock?: number
  pollingInterval?: number
}

export class PinningWatcher {
  pollingInterval: number
  lastProcessedBlock?: number
  contract: PinningManager
  intervalId?: NodeJS.Timeout
  eth: Eth

  constructor (app: Application, { lastProcessedBlock, pollingInterval }: PinningWatcherOptions = {}) {
    this.eth = app.get('eth') as Eth

    const pinningContractAddr = app.get('blockchain').pinningContractAddress
    this.contract = getPinningContract(this.eth, pinningContractAddr)

    this.pollingInterval = pollingInterval || app.get('blockchain.pollingInterval') || DEFAULT_POLLING_INTERVAL
    this.lastProcessedBlock = lastProcessedBlock
  }

  async process (): Promise<void> {
    try {
      const latestBlockNum = await this.eth.getBlockNumber()
      const lastProcessedBlock = this.getLastProcessedBlock()

      // Nothing new, lets fast-forward
      if (lastProcessedBlock === latestBlockNum) {
        return
      }

      logger.info(`Checking new events between blocks ${lastProcessedBlock}-${latestBlockNum}`)
      const events = await this.fetchEvents(lastProcessedBlock, latestBlockNum)
      for (const event of events) {
        await this.newEvent(event)
      }
      this.setLastProcessedBlock(latestBlockNum)
    } catch (e) {
      logger.error('Error in the processing loop:\n' + JSON.stringify(e, undefined, 2))
    }
  }

  start (): void {
    logger.info('Starting polling for PinningContract events')
    this.intervalId = setInterval(this.process.bind(this), this.pollingInterval)
  }

  private async newEvent (event: EventData): Promise<void> {
    // Not a "set" event, ignore it
    if (!VALID_EVENTS.includes(event.event)) {
      return
    }
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
        logger.info(`Updating offer ID ${offer.address} with capacity ${offer.capacity}`)
        break
      case 'MaximumDurationSet':
        offer.maximumDuration = event.returnValues.maximumDuration
        logger.info(`Updating offer ID ${offer.address} with maximum duration ${offer.maximumDuration}`)
        break
      case 'PriceSet':
        await updatePrices(offer, event.returnValues.period, event.returnValues.price)
        break
      default:
        logger.error(`Unknown event ${event.event}`)
    }

    await offer.save()
  }

  private fetchEvents (fromBlock: string | number, toBlock: number): Promise<EventData[]> {
    return this.contract.getPastEvents('allEvents', { fromBlock, toBlock })
  }

  // TODO: Add persistence of lastProcessedBlock
  private setLastProcessedBlock (block: number): void {
    this.lastProcessedBlock = block
  }

  private getLastProcessedBlock (): string | number {
    if (!this.lastProcessedBlock) {
      return 'genesis'
    }

    return this.lastProcessedBlock
  }
}

export default function (app: Application): void {
  new PinningWatcher(app).start()
}
