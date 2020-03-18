import { Contract, EventData } from 'web3-eth-contract'
import { BlockHeader, Eth } from 'web3-eth'
import { Subscription } from 'web3-core-subscriptions'
import { EventEmitter } from 'events'
import { NotImplemented } from '@feathersjs/errors'
import { Op } from 'sequelize'
import { Sema } from 'async-sema'

import { asyncFilter, scopeStore } from '../utils'
import confFactory from '../conf'
import { loggingFactory, Logger } from '../logger'
import Event, { EventInterface } from './event.model'
import { Store } from '../types'

// Constant number that defines default interval of all polling mechanisms.
const DEFAULT_POLLING_INTERVAL = 5000
const DATA_EVENT_NAME = 'newEvent'
const NEW_BLOCK_EVENT_NAME = 'newBlock'
const PROCESSED_BLOCK_KEY = 'lastProcessedBlock'

export interface PollingOptions {
  polling?: boolean
  pollingInterval?: number
}

export enum EventsEmitterStrategy {
  POLLING = 1,
  LISTENING,
}

export interface EventsEmitterOptions {
  // Defines how many blocks will be an event awaited before declared as confirmed
  confirmations?: number

  // Specifies full name to use in logging output
  loggerName?: string

  // Specifies base name of the logging name
  loggerBaseName?: string

  // Specifies the starting block to process events (especially the past ones) on blockchain
  startingBlock?: number | string

  // Defines BlockTracker or its configuration
  blockTracker?: BlockTracker | { store?: Store, keyPrefix?: string }

  // Defines the NewBlockEmitter or its configuration
  newBlockEmitter?: EventEmitter | PollingOptions

  // Defines what strategy should emitter use to get events
  strategy?: EventsEmitterStrategy
}

/**
 * Simple class for persistence of last processed block in order to not crawl the whole blockchain upon every restart
 * of the server.
 */
export class BlockTracker {
  private store: Store
  private lastProcessedBlock: number

  constructor (store: Store) {
    this.store = store
    this.lastProcessedBlock = this.store.get(PROCESSED_BLOCK_KEY)
  }

  setLastProcessedBlock (block: number): void {
    this.lastProcessedBlock = block
    this.store.set(PROCESSED_BLOCK_KEY, block)
  }

  getLastProcessedBlock (): number | undefined {
    return this.lastProcessedBlock
  }
}

/**
 * Abstract EventEmitter that automatically start (what ever task defined in abstract start() method) when first listener is
 * attached and similarly stops (what ever task defined in abstract stop() method) when last listener is removed.
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
    super(loggingFactory('blockchain:block-emitter:polling'), NEW_BLOCK_EVENT_NAME)
    this.eth = eth
    this.pollingInterval = pollingInterval
  }

  private async fetchLastBlockNumber (): Promise<void> {
    try {
      const currentLastBlockNumber = await this.eth.getBlockNumber()

      if (this.lastBlockNumber !== currentLastBlockNumber) {
        this.lastBlockNumber = currentLastBlockNumber
        this.logger.info(`New block ${currentLastBlockNumber}`)
        this.emit(NEW_BLOCK_EVENT_NAME, currentLastBlockNumber)
      }
    } catch (e) {
      this.logger.error(`While fetching latest block error happend: ${e}`)
      this.emit('error', e)
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
    super(loggingFactory('blockchain:block-emitter:listening'), NEW_BLOCK_EVENT_NAME)
    this.eth = eth
  }

  async start (): Promise<void> {
    try {
      // Emit block number right away
      const currentLastBlockNumber = await this.eth.getBlockNumber()
      this.logger.info(`Current block ${currentLastBlockNumber}`)
      this.emit(NEW_BLOCK_EVENT_NAME, currentLastBlockNumber)

      this.subscription = this.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
        if (error) {
          this.logger.error(error)
          this.emit('error', error)
          return
        }

        this.logger.info(`New block ${blockHeader.number}`)
        this.emit(NEW_BLOCK_EVENT_NAME, blockHeader.number)
      })
    } catch (e) {
      this.logger.error(e)
      this.emit('error', e)
    }
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
  protected readonly startingBlock: string | number
  protected readonly events: string[]
  protected readonly contract: Contract
  protected readonly eth: Eth
  protected readonly semaphore: Sema
  private readonly confirmations: number
  private isInitialized = false

  protected constructor (eth: Eth, contract: Contract, events: string[], logger: Logger, options?: EventsEmitterOptions) {
    super(logger, DATA_EVENT_NAME)
    this.eth = eth
    this.contract = contract
    this.events = events
    this.startingBlock = options?.startingBlock || 'genesis'
    this.confirmations = options?.confirmations || 0
    this.semaphore = new Sema(1) // Allow only one caller

    if (options?.blockTracker) {
      if (options.blockTracker instanceof BlockTracker) {
        this.blockTracker = options.blockTracker
      } else {
        let confStore = options.blockTracker.store || confFactory()

        if (options.blockTracker.keyPrefix) {
          confStore = scopeStore(confStore, options.blockTracker.keyPrefix)
        }

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

    this.newBlockEmitter.on('error', (e) => this.emit('error', e))
  }

  /**
   * Serves for initialization of the EventsEmitter.
   * Specifically when this caching service is first launched this it will process past events.
   */
  async init (): Promise<void> {
    if (this.blockTracker.getLastProcessedBlock() === undefined) {
      const from = this.startingBlock
      await this.processPastEvents(from, 'latest').catch(e => this.logger.error(e))
    }

    this.isInitialized = true
  }

  start (): void {
    if (!this.isInitialized) {
      this.init().catch(error => this.emit('error', error))
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
   * Before emitting it validates that the Event is still valid on blockchain using the transaction's receipt.
   *
   * @param currentBlockNumber
   */
  private async confirmEvents (currentBlockNumber: number): Promise<void> {
    try {
      const dbEvents = await Event.findAll({ where: { blockNumber: { [Op.lte]: currentBlockNumber - this.confirmations } } })

      const ethEvents = dbEvents.map(event => JSON.parse(event.content)) as EventData[]
      const validEthEvents = await asyncFilter(ethEvents, this.eventHasValidReceipt.bind(this))
      validEthEvents.forEach(event => this.emit(DATA_EVENT_NAME, event))
      this.logger.info(`Confirmed ${validEthEvents.length} events.`)

      if (dbEvents.length !== validEthEvents.length) {
        this.logger.warn(`${dbEvents.length - validEthEvents.length} events dropped because
      no valid reciept.`)
      }

      // We will remove all events even the invalid ones
      await Promise.all(dbEvents.map(event => event.destroy()))
    } catch (e) {
      this.logger.error(`During confirmation error was raised: ${e}`)
      this.emit('error', e)
    }
  }

  private async eventHasValidReceipt (event: EventData): Promise<boolean> {
    const reciept = await this.eth.getTransactionReceipt(event.transactionHash)
    return reciept.status && reciept.blockNumber === event.blockNumber
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
   * Adds the events to database for later on confirmation.
   *
   * Before adding the event it validates that there is no same Event already present in the database. It
   * identifies "same Event" using transaction hash and log index.
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

  /**
   * Main method for processing events. It should be called after retrieving Events from blockchain.
   *
   * @param events
   * @param currentBlock
   */
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
    await this.semaphore.acquire()
    try {
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
    } finally {
      this.semaphore.release()
    }
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
    const loggerName = options?.loggerName || (options?.loggerBaseName ? `${options.loggerBaseName}:events:polling` : 'blockchain:events:polling')
    const logger = loggingFactory(loggerName)
    super(eth, contract, events, logger, options)
  }

  async poll (currentBlock: number): Promise<void> {
    await this.semaphore.acquire()
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
    } finally {
      this.semaphore.release()
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
    const logger = loggingFactory('blockchain:events:listening')
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
