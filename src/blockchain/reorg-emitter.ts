import { ServiceMethods } from '@feathersjs/feathers'

import { loggingFactory } from '../logger'
import { REORG_OUT_OF_RANGE_EVENT_NAME } from './events'

const logger = loggingFactory('blockchain:reorg-service')
const DEFAULT_DEBOUNCE_TIME = 5000

export class ReorgEmitterService implements Partial<ServiceMethods<any>> {
  private readonly debounceTime: number
  private reorgContract: string[] = []
  private lastProcessedBlockNumber = 0
  private timeoutStarted = false
  emit?: Function
  events: string[]

  constructor (debounceTime?: number) {
    this.debounceTime = debounceTime || DEFAULT_DEBOUNCE_TIME
    this.events = [REORG_OUT_OF_RANGE_EVENT_NAME]
  }

  // eslint-disable-next-line require-await
  async get (): Promise<void> {
    return Promise.resolve()
  }

  emitReorg (lastProcessedBlockNumber: number, contractName: string): void {
    if (!this.emit) {
      throw new Error('ReorgEmitterService invalid setup. Missing \'emit\' function')
    }

    if (!this.timeoutStarted) {
      setTimeout(() => {
        logger.warn(`Reorg outside of confirmation range happens on block number ${lastProcessedBlockNumber} for [${this.reorgContract}] contracts`)
        this.emit!(REORG_OUT_OF_RANGE_EVENT_NAME, { contracts: this.reorgContract, lastProcessedBlockNumber: this.lastProcessedBlockNumber })
        this.reorgContract = []
        this.lastProcessedBlockNumber = 0
      }, this.debounceTime)
      this.timeoutStarted = true
    }

    this.reorgContract = [...this.reorgContract, contractName]
    this.lastProcessedBlockNumber = lastProcessedBlockNumber
  }
}
