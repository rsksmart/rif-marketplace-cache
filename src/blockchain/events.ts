import { Contract, EventData } from 'web3-eth-contract'
import { BlockHeader, Eth } from 'web3-eth'
import { Subscription } from 'web3-core-subscriptions'
import Conf from 'conf'
import config from 'config'
import { EventEmitter } from 'events'
import { NotImplemented } from '@feathersjs/errors'
import { Op } from 'sequelize'
import { Logger } from 'winston'

import { factory } from '../logger'
import Event from '../models/event.model'
import { Store } from '../types'

const DEFAULT_POLLING_INTERVAL = 5000
const DATA_EVENT_NAME = 'newEvent'
const NEW_BLOCK_EVENT_NAME = 'newBlock'
const CONF_LAST_PROCESSED_BLOCK_KEY = 'blockchain.lastProcessedBlock'

export interface PollingOptions {
  polling?: boolean
  pollingInterval?: number
}

export interface EventsEmitterOptions extends PollingOptions {
  confirmations?: number
  blockTracker?: BlockTracker | { store?: Store }
  newBlockEmitter?: EventEmitter | PollingOptions
}

/**
 * Simple class for persistence of last processed block in order to now crawl the whole blockchain upon every restart
 * of the service.
 */
export class BlockTracker {
  store: Store
  lastProcessedBlock: number

  constructor (store: Store) {
    this.store = store
    this.lastProcessedBlock = this.store.get(CONF_LAST_PROCESSED_BLOCK_KEY) || config.get<number>('blockchain.startingBlock')
  }

  setLastProcessedBlock (block: number): void {
    this.lastProcessedBlock = block
    this.store.set(CONF_LAST_PROCESSED_BLOCK_KEY, block)
  }

  getLastProcessedBlock (): string | number {
    return this.lastProcessedBlock
  }
}

/**
 * Abstract EventEmitter that automatically start (what ever task defined in abstract start() method) when first listener is
 * attached and simillarly stops (what ever task defined in abstract stop() method) when last listener is removed.
 */
abstract class AutoStartStopEventEmitter extends EventEmitter {
  /**
   * Name of event that triggers the start/stop actions. Eq. waits there is listeners for this specific event.
   */
  private readonly triggerEventName: string
  protected logger: Logger

  protected constructor (logger: Logger, triggerEventName: string) {
    super()
    this.logger = logger
    this.triggerEventName = triggerEventName

    this.on('newListener', () => {
      if (this.listenerCount(this.triggerEventName) === 1) {
        this.logger.info('Listener attached, starting processing events.')
        this.start()
      }
    })

    this.on('removeListener', () => {
      if (this.listenerCount(this.triggerEventName) === 0) {
        this.logger.info('Listener removing, stopping processing events.')
        this.stop()
      }
    })
  }

  abstract start (): void

  abstract stop (): void
}

/**
 * EventEmitter that emits event upon new block on the blockchain.
 * Uses polling strategy.
 */
export class PollingNewBlockEmitter extends AutoStartStopEventEmitter {
  private readonly eth: Eth
  private readonly pollingInterval: number
  private intervalId?: NodeJS.Timeout
  private lastBlockNumber = 0

  constructor (eth: Eth, pollingInterval: number = DEFAULT_POLLING_INTERVAL) {
    super(factory('blockchain:block-emitter:polling'), NEW_BLOCK_EVENT_NAME)
    this.eth = eth
    this.pollingInterval = pollingInterval
  }

  private async fetchLastBlockNumber (): Promise<void> {
    const currentLastBlockNumber = await this.eth.getBlockNumber()

    if (this.lastBlockNumber !== currentLastBlockNumber) {
      this.lastBlockNumber = currentLastBlockNumber
      this.emit(NEW_BLOCK_EVENT_NAME, currentLastBlockNumber)
    }
  }

  start (): void {
    this.intervalId = setInterval(this.fetchLastBlockNumber.bind(this), this.pollingInterval)
  }

  stop (): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}

/**
 * EventEmitter that emits event upon new block on the blockchain.
 * Uses listening strategy for 'newBlockHeaders' event.
 */
export class ListeningNewBlockEmitter extends AutoStartStopEventEmitter {
  private readonly eth: Eth
  private subscription?: Subscription<BlockHeader>

  constructor (eth: Eth) {
    super(factory('blockchain:block-emitter:listening'), NEW_BLOCK_EVENT_NAME)
    this.eth = eth
  }

  start (): void {
    this.subscription = this.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
      if (error) {
        this.logger.error(error)
      }

      this.emit(NEW_BLOCK_EVENT_NAME, blockHeader.number)
    })
  }

  stop (): void {
    this.subscription?.unsubscribe(error => { this.logger.error(error) })
  }
}

/**
 * Base class for EventsEmitter.
 * It supports block's confirmation, where new events are stored to DB and only after configured number of new
 * blocks are emitted to consumers for further processing.
 */
abstract class BaseEventsEmitter extends AutoStartStopEventEmitter {
  protected readonly blockTracker: BlockTracker
  protected readonly newBlockEmitter: EventEmitter
  protected readonly events: string[]
  protected readonly contract: Contract
  protected readonly eth: Eth
  private readonly confirmations: number

  protected constructor (eth: Eth, contract: Contract, events: string[], logger: Logger, options: EventsEmitterOptions) {
    super(logger, DATA_EVENT_NAME)
    this.eth = eth
    this.contract = contract
    this.events = events
    this.confirmations = options.confirmations || 0

    if (options.blockTracker) {
      if (options.blockTracker instanceof BlockTracker) {
        this.blockTracker = options.blockTracker
      } else {
        const confStore = options.blockTracker.store || new Conf()
        this.blockTracker = new BlockTracker(confStore)
      }
    } else {
      this.blockTracker = new BlockTracker(new Conf())
    }

    if (options.newBlockEmitter) {
      if (options.newBlockEmitter instanceof EventEmitter) {
        this.newBlockEmitter = options.newBlockEmitter
      } else {
        if (options.newBlockEmitter.polling) {
          this.newBlockEmitter = new PollingNewBlockEmitter(this.eth, options.newBlockEmitter.pollingInterval)
        } else {
          this.newBlockEmitter = new ListeningNewBlockEmitter(this.eth)
        }
      }
    } else {
      this.newBlockEmitter = new ListeningNewBlockEmitter(this.eth)
    }
  }

  start (): void {
    this.startEvents()
    this.newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, this.confirmEvents.bind(this))
  }

  stop (): void {
    this.stopEvents()
    this.newBlockEmitter.off(NEW_BLOCK_EVENT_NAME, this.confirmEvents.bind(this))
  }

  /**
   * Start fetching new events. Depends on specified strategy
   */
  abstract startEvents (): void

  /**
   * Stop fetching new events. Depends on specified strategy.
   */
  abstract stopEvents (): void

  /**
   * Retrieves confirmed events and emits them.
   *
   * @param currentBlockNumber
   */
  private async confirmEvents (currentBlockNumber: number): Promise<void> {
    const events = await Event.findAll({ where: { blockNumber: { [Op.gte]: currentBlockNumber - this.confirmations } } })
    this.logger.info(`Confirmed ${events.length} events.`)

    events
      .map(event => JSON.parse(event.content))
      .forEach(event => this.emit(DATA_EVENT_NAME, event))
  }

  /**
   * Will either emit the event (if no confirmations are set) or save the event to database, for awaiting confirmation.
   *
   * @param data
   */
  protected async newEvent (data: EventData): Promise<void> {
    if (!this.events.includes(data.event)) {
      return
    }

    if (!this.confirmations) {
      this.emit(DATA_EVENT_NAME, data)
      return
    }

    this.logger.debug(`New event ${data.event}. Waiting for confirmation.`)
    const event = new Event({ blockNumber: data.blockNumber, content: JSON.stringify(data) })
    await event.save()
  }

  /**
   * Retrieves past events filtered out based on events passed to constructor.
   *
   * @param from
   * @param to
   */
  async fetchPreviousEvents (from?: number | string, to?: number | string): Promise<EventData[]> {
    from = from || config.get<number>('blockchain.startingBlock')
    to = to || 'latest'

    return (await this.contract.getPastEvents('allEvents', {
      fromBlock: from,
      toBlock: to
    })).filter(data => this.events.includes(data.event))
  }
}

/**
 * EventsEmitter implementation that uses polling for fetching new events.
 */
export class PollingEventsEmitter extends BaseEventsEmitter {
  intervalId: NodeJS.Timeout | undefined
  private readonly pollingInterval: number

  constructor (eth: Eth, contract: Contract, events: string[], options: EventsEmitterOptions) {
    const logger = factory('block:events:polling')
    super(eth, contract, events, logger, options)
    this.pollingInterval = options.pollingInterval || DEFAULT_POLLING_INTERVAL
  }

  async poll (): Promise<void> {
    try {
      const latestBlockNum = await this.eth.getBlockNumber()
      const lastProcessedBlock = this.blockTracker.getLastProcessedBlock()

      // Nothing new, lets fast-forward
      if (lastProcessedBlock === latestBlockNum) {
        return
      }

      this.logger.info(`Checking new events between blocks ${lastProcessedBlock}-${latestBlockNum}`)
      // TODO: Possible to filter-out the events with "topics" property directly from the node
      const events = await this.contract.getPastEvents('allEvents', {
        fromBlock: lastProcessedBlock,
        toBlock: latestBlockNum
      })
      for (const event of events) {
        await this.newEvent(event)
      }
      this.blockTracker.setLastProcessedBlock(latestBlockNum)
    } catch (e) {
      this.logger.error('Error in the processing loop:\n' + JSON.stringify(e, undefined, 2))
    }
  }

  startEvents (): void {
    this.intervalId = setInterval(this.poll.bind(this), this.pollingInterval)
  }

  stopEvents (): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }
}

// TODO: Should analyze previous events, not only listen for new ones
/**
 * EventsEmitter implementation that uses blockchain listening for fetching new events.
 */
export class ListeningEventsEmitter extends BaseEventsEmitter {
  constructor (eth: Eth, contract: Contract, events: string[], options: EventsEmitterOptions) {
    const logger = factory('block:events:listening')
    super(eth, contract, events, logger, options)
  }

  startEvents (): void {
    throw new NotImplemented('')
  }

  stopEvents (): void {
    throw new NotImplemented('')
  }
}

export default function eventsRepoFactory (eth: Eth, contract: Contract, events: string[], options: EventsEmitterOptions): BaseEventsEmitter {
  if (options.polling === true) {
    return new PollingEventsEmitter(eth, contract, events, options)
  }

  throw new NotImplemented('Listening for new events is not supported atm.')
}
