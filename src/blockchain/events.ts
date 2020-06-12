import { Contract, EventData } from 'web3-eth-contract'
import { BlockHeader, Eth } from 'web3-eth'
import { Subscription } from 'web3-core-subscriptions'
import { EventEmitter } from 'events'
import { NotImplemented } from '@feathersjs/errors'
import { Op } from 'sequelize'
import { Sema } from 'async-sema'
import { getObject as getStore } from 'sequelize-store'

import { loggingFactory } from '../logger'
import Event, { EventInterface } from './event.model'
import { Logger, NewBlockEmitterOptions } from '../definitions'
import { createTransactionLookupTable } from './utils'

// Constant number that defines default interval of all polling mechanisms.
const DEFAULT_POLLING_INTERVAL = 5000
const NEW_EVENT_EVENT_NAME = 'newEvent'
const INIT_FINISHED_EVENT_NAME = 'initFinished'
const NEW_BLOCK_EVENT_NAME = 'newBlock'
const LAST_FETCHED_BLOCK_NUMBER_KEY = 'lastFetchedBlockNumber'
const LAST_FETCHED_BLOCK_HASH_KEY = 'lastFetchedBlockHash'
const LAST_PROCESSED_BLOCK_NUMBER_KEY = 'lastProcessedBlockNumber'
const LAST_PROCESSED_BLOCK_HASH_KEY = 'lastProcessedBlockHash'

export interface BlockTrackerStore {
  [LAST_FETCHED_BLOCK_NUMBER_KEY]?: number
  [LAST_FETCHED_BLOCK_HASH_KEY]?: string
  [LAST_PROCESSED_BLOCK_NUMBER_KEY]?: number
  [LAST_PROCESSED_BLOCK_HASH_KEY]?: string
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
  blockTracker?: BlockTracker | { store?: BlockTrackerStore, keyPrefix?: string }

  // Defines the NewBlockEmitter or its configuration
  newBlockEmitter?: EventEmitter | NewBlockEmitterOptions

  // Defines what strategy should emitter use to get events
  strategy?: EventsEmitterStrategy
}

/**
 * Simple class for persistence of last processed block in order to not crawl the whole blockchain upon every restart
 * of the server.
 */
export class BlockTracker {
  private readonly store: BlockTrackerStore

  constructor (store: BlockTrackerStore) {
    this.store = store
  }

  setLastFetchedBlock (blockNumber: number, blockHash: string): void {
    this.store[LAST_FETCHED_BLOCK_HASH_KEY] = blockHash
    this.store[LAST_FETCHED_BLOCK_NUMBER_KEY] = blockNumber
  }

  getLastFetchedBlock (): [number?, string?] {
    return [this.store[LAST_FETCHED_BLOCK_NUMBER_KEY], this.store[LAST_FETCHED_BLOCK_HASH_KEY]]
  }

  setLastProcessedBlockIfHigher (blockNumber: number, blockHash: string): void {
    if ((this.store[LAST_PROCESSED_BLOCK_NUMBER_KEY] || -1) > blockNumber) {
      return
    }

    this.store[LAST_PROCESSED_BLOCK_HASH_KEY] = blockHash
    this.store[LAST_PROCESSED_BLOCK_NUMBER_KEY] = blockNumber
  }

  getLastProcessedBlock (): [number?, string?] {
    return [this.store[LAST_PROCESSED_BLOCK_NUMBER_KEY], this.store[LAST_PROCESSED_BLOCK_HASH_KEY]]
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
      const lastBlock = await this.eth.getBlock('latest')

      if (this.lastBlockNumber !== lastBlock.number) {
        this.lastBlockNumber = lastBlock.number
        this.logger.verbose(`New block with number ${lastBlock.number} with hash ${lastBlock.hash}`)
        this.emit(NEW_BLOCK_EVENT_NAME, lastBlock)
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
      const lastBlock = await this.eth.getBlock('latest')
      this.logger.verbose(`Current block with number ${lastBlock.number} with hash ${lastBlock.hash}`)
      this.emit(NEW_BLOCK_EVENT_NAME, lastBlock)

      this.subscription = this.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
        if (error) {
          this.logger.error(error)
          this.emit('error', error)
          return
        }

        this.logger.verbose(`New block with number ${lastBlock.number} with hash ${lastBlock.hash}`)
        this.emit(NEW_BLOCK_EVENT_NAME, blockHeader)
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
    super(logger, NEW_EVENT_EVENT_NAME)
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
        const confStore = options.blockTracker.store || getStore(options.blockTracker.keyPrefix ? options.blockTracker.keyPrefix : undefined)
        this.blockTracker = new BlockTracker(confStore)
      }
    } else {
      this.blockTracker = new BlockTracker(getStore())
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
    if (this.blockTracker.getLastFetchedBlock()[0] === undefined) {
      const from = this.startingBlock
      await this.processPastEvents(from, 'latest')
    }

    this.isInitialized = true
    this.emit(INIT_FINISHED_EVENT_NAME)
  }

  start (): void {
    if (!this.isInitialized) {
      this.init().catch(error => this.emit('error', error))
    }

    this.startEvents()

    if (this.confirmations > 0) {
      this.newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, this.confirmationRoutine.bind(this))
    }
  }

  stop (): void {
    this.stopEvents()

    if (this.confirmations > 0) {
      this.newBlockEmitter.off(NEW_BLOCK_EVENT_NAME, this.confirmationRoutine.bind(this))
    }
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
   * @param currentBlock
   */
  private async confirmationRoutine (currentBlock: BlockHeader): Promise<void> {
    try {
      const dbEvents = await Event.findAll({
        where: {
          blockNumber: { [Op.lte]: currentBlock.number - this.confirmations },
          event: this.events,
          emitted: false
        }
      })

      const ethEvents = dbEvents.map(event => JSON.parse(event.content)) as EventData[]
      ethEvents.forEach(this.confirmEvent.bind(this))
      this.logger.info(`Confirmed ${ethEvents.length} events.`)

      // Update DB that events were emitted
      await Event.update({ emitted: true }, { where: { id: dbEvents.map(e => e.id) } })
    } catch (e) {
      this.logger.error(`During confirmation error was raised: ${e}`)
      this.emit('error', e)
    }
  }

  private confirmEvent (data: EventData): void {
    this.blockTracker.setLastProcessedBlockIfHigher(data.blockNumber, data.blockHash)
    this.emitEvent(data)
  }

  protected emitEvent (data: EventData): void {
    this.logger.debug('Emitting event', [data])
    this.emit(NEW_EVENT_EVENT_NAME, data)
  }

  protected serializeEvent (data: EventData): EventInterface {
    this.logger.debug(`New ${data.event} event to be confirmed. Transaction ${data.transactionHash}.${data.logIndex}`)
    return {
      blockNumber: data.blockNumber,
      transactionHash: data.transactionHash,
      logIndex: data.logIndex,
      event: data.event,
      targetConfirmation: this.confirmations,
      content: JSON.stringify(data)
    }
  }

  /**
   * Adds the events to database for later on confirmation.
   *
   * Before adding the event it validates that there is no same Event **that was already not emitted/processed** present in the database.
   * It identifies "same Event" using transaction hash and log index.
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
    const transactionLookupTable = createTransactionLookupTable(sequelizeEvents)

    // Old events to be removed from DB
    const eventsForDeletion = existingEvents.filter(event => !event.emitted && transactionLookupTable[event.transactionHash].includes(event.logIndex))

    if (eventsForDeletion.length > 0) {
      this.logger.warn(`Found ${eventsForDeletion.length} re-emitted events! Removing old ones!`)
      await Promise.all(eventsForDeletion.map(event => {
        this.logger.warn(`Detected duplicate event of block ${event.blockNumber} and transaction ${event.transactionHash}`)
        return event.destroy()
      }))
    }

    const existingEmittedEvents = createTransactionLookupTable(existingEvents, true)
    const eventsThatDontHaveAlreadyEmittedCounterpart = sequelizeEvents.filter(
      event => !(
        existingEmittedEvents[event.transactionHash] &&
        existingEmittedEvents[event.transactionHash].includes(event.logIndex)
      )
    )
    await Event.bulkCreate(eventsThatDontHaveAlreadyEmittedCounterpart)
  }

  /**
   * Main method for processing events. It should be called after retrieving Events from blockchain.
   *
   * @param events
   * @param currentBlockNumber
   */
  protected async processEvents (events: EventData | EventData[], currentBlockNumber?: number): Promise<void> {
    currentBlockNumber = currentBlockNumber || await this.eth.getBlockNumber()

    if (!Array.isArray(events)) {
      events = [events]
    }

    events = events.filter(data => this.events.includes(data.event))

    if (events.length === 0) {
      this.logger.info('No events to be processed.')
      return
    }

    if (this.confirmations === 0) {
      events.forEach(this.emitEvent.bind(this))
      return
    }

    const thresholdBlock = currentBlockNumber - this.confirmations
    this.logger.verbose(`Threshold block ${thresholdBlock},`)

    const eventsToBeConfirmed = events
      .filter(event => event.blockNumber > thresholdBlock)
    this.logger.info(`${eventsToBeConfirmed.length} events to be confirmed.`)
    await this.processEventsToBeConfirmed(eventsToBeConfirmed)

    const eventsToBeEmitted = events
      .filter(event => event.blockNumber <= thresholdBlock)
    this.logger.info(`${eventsToBeEmitted.length} events to be emitted.`)

    eventsToBeEmitted.forEach(this.confirmEvent.bind(this))
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
      const currentBlock = await this.eth.getBlock('latest')

      if (to === 'latest') {
        to = currentBlock.number
      }

      this.logger.info(`=> Processing past events from ${from} to ${to}`)
      const startTime = process.hrtime()
      const events = (await this.contract.getPastEvents('allEvents', {
        fromBlock: from,
        toBlock: to
      }))

      await this.processEvents(events, currentBlock.number)
      this.blockTracker.setLastFetchedBlock(currentBlock.number, currentBlock.hash)

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

  async poll (currentBlock: BlockHeader): Promise<void> {
    await this.semaphore.acquire()
    this.logger.verbose(`Received new block number ${currentBlock}`)
    try {
      const [lastFetchedBlockNumber, lastFetchedBlockHash] = this.blockTracker.getLastFetchedBlock()

      // Nothing new, lets fast-forward
      if (lastFetchedBlockNumber === currentBlock.number) {
        this.logger.verbose('Nothing new to process')
        return
      }

      this.logger.info(`Checking new events between blocks ${lastFetchedBlockNumber}-${currentBlock}`)
      // TODO: Possible to filter-out the events with "topics" property directly from the node
      const events = await this.contract.getPastEvents('allEvents', {
        fromBlock: (lastFetchedBlockNumber as number) + 1, // +1 because both fromBlock and toBlock is "or equal"
        toBlock: currentBlock.number
      })
      this.logger.debug('Received events: ', events)

      await this.processEvents(events, currentBlock.number)
      this.blockTracker.setLastFetchedBlock(currentBlock.number, currentBlock.hash)
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
