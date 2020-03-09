import { Contract, EventData } from 'web3-eth-contract'
import { BlockHeader, Eth } from 'web3-eth'
import { Subscription } from 'web3-core-subscriptions'
import confFactory from '../conf'
import config from 'config'
import { EventEmitter } from 'events'
import { NotImplemented } from '@feathersjs/errors'
import { Op } from 'sequelize'
import { Logger } from 'winston'

import { factory } from '../logger'
import Event, { EventInterface } from '../models/event.model'
import { Store } from '../types'

const DEFAULT_POLLING_INTERVAL = 5000
const DATA_EVENT_NAME = 'newEvent'
const NEW_BLOCK_EVENT_NAME = 'newBlock'
const CONF_LAST_PROCESSED_BLOCK_KEY = 'blockchain.lastProcessedBlock'

export interface PollingOptions {
  polling?: boolean
  pollingInterval?: number
}

export enum EventsEmitterStrategy {
  POLLING= 1,
  LISTENING,
}

export interface EventsEmitterOptions {
  confirmations?: number
  blockTracker?: BlockTracker | { store?: Store }
  newBlockEmitter?: EventEmitter | PollingOptions
  strategy?: EventsEmitterStrategy
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
    this.lastProcessedBlock = this.store.get(CONF_LAST_PROCESSED_BLOCK_KEY)
  }

  setLastProcessedBlock (block: number): void {
    this.lastProcessedBlock = block
    this.store.set(CONF_LAST_PROCESSED_BLOCK_KEY, block)
  }

  getLastProcessedBlock (): number | undefined {
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

    this.on('newListener', (event) => {
      if (event === this.triggerEventName && this.listenerCount(this.triggerEventName) === 0) {
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
      this.logger.info(`New block ${currentLastBlockNumber}`)
      this.emit(NEW_BLOCK_EVENT_NAME, currentLastBlockNumber)
    }
  }

  start (): void {
    // Fetch last block right away
    this.fetchLastBlockNumber().catch(this.logger.error)
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

  async start (): Promise<void> {
    // Emit block number right away
    const currentLastBlockNumber = await this.eth.getBlockNumber()
    this.logger.info(`Current block ${currentLastBlockNumber}`)
    this.emit(NEW_BLOCK_EVENT_NAME, currentLastBlockNumber)

    this.subscription = this.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
      if (error) {
        this.logger.error(error)
        return
      }

      this.logger.info(`New block ${blockHeader.number}`)
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
export abstract class BaseEventsEmitter extends AutoStartStopEventEmitter {
  protected readonly blockTracker: BlockTracker
  protected readonly newBlockEmitter: EventEmitter
  protected readonly events: string[]
  protected readonly contract: Contract
  protected readonly eth: Eth
  private readonly confirmations: number
  private isInitialized = false

  protected constructor (eth: Eth, contract: Contract, events: string[], logger: Logger, options?: EventsEmitterOptions) {
    super(logger, DATA_EVENT_NAME)
    this.eth = eth
    this.contract = contract
    this.events = events
    this.confirmations = options?.confirmations || 0

    if (options?.blockTracker) {
      if (options.blockTracker instanceof BlockTracker) {
        this.blockTracker = options.blockTracker
      } else {
        const confStore = options.blockTracker.store || confFactory()
        this.blockTracker = new BlockTracker(confStore)
      }
    } else {
      this.blockTracker = new BlockTracker(confFactory())
    }

    if (options?.newBlockEmitter) {
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

  /**
   * Serves for initialization of the EventsEmitter.
   * Specifically when this caching service is first launched this it will process past events.
   */
  async init (): Promise<void> {
    if (this.blockTracker.getLastProcessedBlock() === undefined) {
      const from = config.get<number>('blockchain.startingBlock')
      await this.processPastEvents(from, 'latest').catch(e => this.logger.error(e))
    }

    this.isInitialized = true
  }

  async start (): Promise<void> {
    if (!this.isInitialized) {
      await this.init()
    }

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
  private async confirmEvents (currentBlockNumber: number): Promise<void[]> {
    const events = await Event.findAll({ where: { blockNumber: { [Op.lte]: currentBlockNumber - this.confirmations } } })
    this.logger.info(`Confirmed ${events.length} events.`)

    events
      .map(event => JSON.parse(event.content))
      .forEach(event => this.emit(DATA_EVENT_NAME, event))

    return Promise.all(events.map(event => event.destroy()))
  }

  protected emitEvent (data: EventData): void {
    this.emit(DATA_EVENT_NAME, data)
  }

  protected serializeEvent (data: EventData): EventInterface {
    this.logger.debug(`New ${data.event} event to be confirmed. Transaction ${data.transactionHash}.${data.logIndex}`)
    return {
      blockNumber: data.blockNumber,
      transactionHash: data.transactionHash,
      logIndex: data.logIndex,
      content: JSON.stringify(data)
    }
  }

  /**
   *
   * @param events
   */
  private async processEventsToBeConfirmed (events: EventData[]): Promise<void> {
    const sequelizeEvents = events.map(this.serializeEvent.bind(this))

    const transactionHash = sequelizeEvents.map(value => value.transactionHash)
    const existingEvents = await Event.findAll({
      where: {
        transactionHash: { [Op.in]: transactionHash }
      }
    })

    if (existingEvents.length === 0) {
      await Event.bulkCreate(sequelizeEvents)
      return // No (potential) conflicts ==> only add events
    }

    // Optimization lookup table for identification of good transactionHash&logIndex tuple
    const transactionLookupTable = sequelizeEvents.reduce<Record<string, number[]>>((previousValue, currentValue) => {
      if (!previousValue[currentValue.transactionHash]) {
        previousValue[currentValue.transactionHash] = [currentValue.logIndex]
      } else {
        previousValue[currentValue.transactionHash].push(currentValue.logIndex)
      }

      return previousValue
    }, {})

    // Remove old events from DB
    const eventsForDeletion = existingEvents.filter(event => transactionLookupTable[event.transactionHash].includes(event.logIndex))
    this.logger.warn(`Found ${eventsForDeletion.length} re-emitted events! Removing old ones!`)
    await Promise.all(eventsForDeletion.map(event => event.destroy()))

    await Event.bulkCreate(sequelizeEvents)
  }

  protected async processEvents (events: EventData | EventData[], currentBlock?: number): Promise<void> {
    currentBlock = currentBlock || await this.eth.getBlockNumber()

    if (!Array.isArray(events)) {
      events = [events]
    }

    events = events.filter(data => this.events.includes(data.event))

    if (events.length === 0) {
      this.logger.info('No events to be processed.')
      return
    } else {
      this.logger.info(`New events! Processing ${events.length} events.`)
    }

    if (this.confirmations === 0) {
      events.forEach(this.emitEvent.bind(this))
      return
    }

    const thresholdBlock = currentBlock - this.confirmations
    this.logger.info(`Threshold block ${thresholdBlock},`)

    const eventsToBeConfirmed = events
      .filter(event => event.blockNumber > thresholdBlock)
    this.logger.info(`${eventsToBeConfirmed.length} events to be confirmed.`)
    await this.processEventsToBeConfirmed(eventsToBeConfirmed)

    const eventsToBeEmitted = events
      .filter(event => event.blockNumber <= thresholdBlock)
    this.logger.info(`${eventsToBeEmitted.length} events to be emitted.`)

    eventsToBeEmitted.forEach(this.emitEvent.bind(this))
  }

  /**
   * Retrieves past events filtered out based on event's names passed to constructor.
   *
   * @param from
   * @param to
   */
  async processPastEvents (from: number | string, to: number | string): Promise<void> {
    const currentBlock = await this.eth.getBlockNumber()

    if (to === 'latest') {
      to = currentBlock
    }

    this.logger.info(`=> Processing past events from ${from} to ${to}`)
    const startTime = process.hrtime()
    const events = (await this.contract.getPastEvents('allEvents', {
      fromBlock: from,
      toBlock: to
    }))

    await this.processEvents(events, currentBlock)
    this.blockTracker.setLastProcessedBlock(currentBlock)

    const [secondsLapsed] = process.hrtime(startTime)
    this.logger.info(`=> Finished processing past events in ${secondsLapsed}s`)
  }
}

/**
 * EventsEmitter implementation that uses polling for fetching new events from the blockchain.
 *
 * Polling is triggered using the NewBlockEmitter and is therefore up to the user
 * to chose what new-block strategy will employ.
 * He has choice from using listening or polling versions of the emitter.
 *
 * @see PollingNewBlockEmitter
 * @see ListeningNewBlockEmitter
 */
export class PollingEventsEmitter extends BaseEventsEmitter {
  constructor (eth: Eth, contract: Contract, events: string[], options?: EventsEmitterOptions) {
    const logger = factory('blockchain:events:polling')
    super(eth, contract, events, logger, options)
  }

  async poll (currentBlock: number): Promise<void> {
    this.logger.info(`Received new block number ${currentBlock}`)
    try {
      const lastProcessedBlock = this.blockTracker.getLastProcessedBlock()

      // Nothing new, lets fast-forward
      if (lastProcessedBlock === currentBlock) {
        this.logger.info('Nothing new to process')
        return
      }

      this.logger.info(`Checking new events between blocks ${lastProcessedBlock}-${currentBlock}`)
      // TODO: Possible to filter-out the events with "topics" property directly from the node
      const events = await this.contract.getPastEvents('allEvents', {
        fromBlock: lastProcessedBlock,
        toBlock: currentBlock
      })

      await this.processEvents(events, currentBlock)
      this.blockTracker.setLastProcessedBlock(currentBlock)
    } catch (e) {
      this.logger.error('Error in the processing loop:\n' + JSON.stringify(e, undefined, 2))
    }
  }

  startEvents (): void {
    this.newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, this.poll.bind(this))
  }

  stopEvents (): void {
    this.newBlockEmitter.off(NEW_BLOCK_EVENT_NAME, this.poll.bind(this))
  }
}

/**
 * EventsEmitter implementation that uses blockchain listening for fetching new events.
 * TODO: Yep, finish this :'-)
 */
export class ListeningEventsEmitter extends BaseEventsEmitter {
  constructor (eth: Eth, contract: Contract, events: string[], options: EventsEmitterOptions) {
    const logger = factory('blockchain:events:listening')
    super(eth, contract, events, logger, options)
  }

  startEvents (): void {
    throw new NotImplemented('')
  }

  stopEvents (): void {
    throw new NotImplemented('')
  }
}

export default function eventsEmitterFactory (eth: Eth, contract: Contract, events: string[], options?: EventsEmitterOptions): BaseEventsEmitter {
  if (!options?.strategy || options?.strategy === EventsEmitterStrategy.POLLING) {
    return new PollingEventsEmitter(eth, contract, events, options)
  }

  throw new NotImplemented('Listening for new events is not supported atm.')
}
