import { BlockHeader, Eth } from 'web3-eth'
import { Subscription } from 'web3-core-subscriptions'
import { EventEmitter } from 'events'
import { getObject } from 'sequelize-store'
import { ServiceMethods } from '@feathersjs/feathers'

import { loggingFactory } from '../logger'
import type { Logger } from '../definitions'

const DEFAULT_POLLING_INTERVAL = 5000
export const NEW_BLOCK_EVENT_NAME = 'newBlock'

/**
 * Abstract EventEmitter that automatically start (what ever task defined in abstract start() method) when first listener is
 * attached and similarly stops (what ever task defined in abstract stop() method) when last listener is removed.
 */
export abstract class AutoStartStopEventEmitter extends EventEmitter {
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

export class NewBlockEmitterService implements Partial<ServiceMethods<any>> {
  emit?: Function
  events: string[] = []

  constructor () {
    this.events = [NEW_BLOCK_EVENT_NAME]
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setup (): void {
  }

  getLastBlockNumber (): number {
    return getObject()['blockchain.lastFetchedBlockNumber'] as number
  }
}
