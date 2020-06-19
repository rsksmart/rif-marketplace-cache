import { Contract, EventData } from 'web3-eth-contract'
import { BlockHeader, Eth } from 'web3-eth'
import { EventEmitter } from 'events'
import { NotImplemented } from '@feathersjs/errors'
import { Sema } from 'async-sema'
import { getObject as getStore } from 'sequelize-store'

import { loggingFactory } from '../logger'
import Event, { EventInterface } from './event.model'
import { Logger, NewBlockEmitterOptions } from '../definitions'
import { errorHandler } from '../utils'
import { Confirmator } from './confirmator'
import {
  AutoStartStopEventEmitter,
  ListeningNewBlockEmitter,
  NEW_BLOCK_EVENT_NAME,
  PollingNewBlockEmitter
} from './new-block-emitters'
import { BlockTracker, BlockTrackerStore } from './block-tracker'

export const NEW_EVENT_EVENT_NAME = 'newEvent'
export const INIT_FINISHED_EVENT_NAME = 'initFinished'
export const REORG_EVENT_NAME = 'reorg'
export const REORG_OUT_OF_RANGE_EVENT_NAME = 'reorgOutOfRange'

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

  // Instance of Confirmator that handles confirmations
  confirmator?: Confirmator
}

/**
 * Base class for EventsEmitter.
 * It supports block's confirmation, where new events are stored to DB and only after configured number of new
 * blocks are emitted to consumers for further processing.
 */
export abstract class BaseEventsEmitter extends AutoStartStopEventEmitter {
  public readonly blockTracker: BlockTracker
  protected readonly newBlockEmitter: EventEmitter
  protected readonly startingBlock: string | number
  protected readonly events: string[]
  protected readonly contract: Contract
  protected readonly eth: Eth
  protected readonly semaphore: Sema
  protected readonly confirmations: number
  private readonly confirmator?: Confirmator
  private isInitialized = false
  private confirmationRoutine?: (...args: any[]) => void

  protected constructor (eth: Eth, contract: Contract, events: string[], logger: Logger, options?: EventsEmitterOptions) {
    super(logger, NEW_EVENT_EVENT_NAME)
    this.eth = eth
    this.contract = contract
    this.events = events
    this.startingBlock = options?.startingBlock ?? 'genesis'
    this.confirmations = options?.confirmations ?? 0
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

    if (this.confirmations > 0) {
      this.confirmator = options?.confirmator ?? new Confirmator(this, eth, contract.options.address, this.blockTracker, logger)
    }
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
      this.confirmationRoutine = errorHandler(this.confirmator!.runConfirmationsRoutine.bind(this.confirmator), this.logger)
      this.newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, this.confirmationRoutine)
    }
  }

  stop (): void {
    this.stopEvents()

    if (this.confirmations > 0) {
      this.newBlockEmitter.off(NEW_BLOCK_EVENT_NAME, this.confirmationRoutine!)
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

  public emitEvent (data: EventData): void {
    this.logger.debug('Emitting event', data)
    this.blockTracker.setLastProcessedBlockIfHigher(data.blockNumber, data.blockHash)
    this.emit(NEW_EVENT_EVENT_NAME, data)
  }

  protected serializeEvent (data: EventData): EventInterface {
    this.logger.debug(`New ${data.event} event to be confirmed. Transaction ${data.transactionHash}.${data.logIndex}`)
    return {
      blockNumber: data.blockNumber,
      transactionHash: data.transactionHash,
      logIndex: data.logIndex,
      contractAddress: this.contract.options.address,
      event: data.event,
      targetConfirmation: this.confirmations,
      content: JSON.stringify(data)
    }
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
    this.logger.verbose(`Threshold block ${thresholdBlock}`)

    const eventsToBeConfirmed = events
      .filter(event => event.blockNumber > thresholdBlock)
    this.logger.info(`${eventsToBeConfirmed.length} events to be confirmed.`)

    try {
      await Event.bulkCreate(eventsToBeConfirmed.map(this.serializeEvent.bind(this))) // Lets store them to DB
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Duplicated events!')
      }

      throw e
    }

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
      const currentBlock = await this.eth.getBlock('latest')
      let toHash: string

      if (to === 'latest') {
        to = currentBlock.number
        toHash = currentBlock.hash
      } else {
        toHash = (await this.eth.getBlock(to)).hash
      }

      this.logger.info(`=> Processing past events from ${from} to ${to}`)
      const startTime = process.hrtime()
      const events = (await this.contract.getPastEvents('allEvents', {
        fromBlock: from,
        toBlock: to
      }))

      await this.processEvents(events, currentBlock.number)
      this.blockTracker.setLastFetchedBlock(to as number, toHash)

      const [secondsLapsed] = process.hrtime(startTime)
      this.logger.info(`=> Finished processing past events in ${secondsLapsed}s`)
    } finally {
      this.semaphore.release()
    }
  }

  protected async isReorg (): Promise<boolean> {
    const [lastFetchedBlockNumber, lastFetchedBlockHash] = this.blockTracker.getLastFetchedBlock()

    if (!lastFetchedBlockNumber) {
      return false // Nothing was fetched yet, no point in continue
    }

    const actualLastFetchedBlock = await this.eth.getBlock(lastFetchedBlockNumber)

    if (actualLastFetchedBlock.hash === lastFetchedBlockHash) {
      return false // No reorg detected
    }
    this.logger.warn(`Reorg happening! Old hash: ${lastFetchedBlockHash}; New hash: ${actualLastFetchedBlock.hash}`)

    const [lastProcessedBlockNumber, lastProcessedBlockHash] = this.blockTracker.getLastProcessedBlock()

    // If is undefined than nothing was yet processed and the reorg is not affecting our service
    // as we are still awaiting for enough confirmations
    if (lastProcessedBlockNumber) {
      const actualLastProcessedBlock = await this.eth.getBlock(lastProcessedBlockNumber)

      // The reorg is happening outside our confirmation range.
      // We can't do anything about it except notify the consumer.
      if (actualLastProcessedBlock.hash !== lastProcessedBlockHash) {
        this.logger.error(`Reorg out of confirmation range! Old hash: ${lastProcessedBlockHash}; New hash: ${actualLastProcessedBlock.hash}`)
        this.emit(REORG_OUT_OF_RANGE_EVENT_NAME, lastProcessedBlockNumber)
      }
    }

    this.emit(REORG_EVENT_NAME)
    return true
  }

  protected async handleReorg (currentBlock: BlockHeader): Promise<void> {
    const [lastProcessedBlockNumber] = this.blockTracker.getLastProcessedBlock()

    const newEvents = await this.contract.getPastEvents('allEvents', {
      fromBlock: lastProcessedBlockNumber || this.startingBlock,
      toBlock: currentBlock.number
    })

    await this.confirmator!.checkDroppedTransactions(newEvents)

    // Remove all events that currently awaiting confirmation
    await Event.destroy({ where: { contractAddress: this.contract.options.address } })
    await this.processEvents(newEvents, currentBlock.number)
    this.blockTracker.setLastFetchedBlock(currentBlock.number, currentBlock.hash)
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
    this.logger.verbose(`Received new block number ${currentBlock.number}`)
    try {
      // Check if reorg did not happen since the last poll
      if (this.confirmations && await this.isReorg()) {
        return this.handleReorg(currentBlock)
      }

      const [lastFetchedBlockNumber] = this.blockTracker.getLastFetchedBlock()

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
