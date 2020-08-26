import { ServiceMethods } from '@feathersjs/feathers'

import { loggingFactory } from '../logger'

const logger = loggingFactory('blockchain:reorg-service')
const DEFAULT_DEBOUNCE_TIME = 5000
const REORG_EVENT = 'reorg-event'

export class ReorgEmitterService implements Partial<ServiceMethods<any>> {
  private readonly debounceTime: number = DEFAULT_DEBOUNCE_TIME // ms
  private reorgContract: string[] = []
  private lastProcessedBlockNumber = 0
  private timeoutStarted = false
  emit?: Function
  events: string[]

  constructor (debounceTime?: number) {
    if (debounceTime) {
      this.debounceTime = debounceTime
    }
    this.events = [REORG_EVENT]
  }

  emitReorg (lastProcessedBlockNumber: number, contractName: string): void {
    if (!this.emit) {
      throw new Error('ReorgEmitterService invalid setup. Missing \'emit\' function')
    }

    if (!this.timeoutStarted) {
      setTimeout(() => {
        if (this.emit) {
          this.emit({ contracts: this.reorgContract, lastProcessedBlockNumber: this.lastProcessedBlockNumber })
        }
        this.reorgContract = []
        this.lastProcessedBlockNumber = 0
      })
      this.timeoutStarted = true
    }

    this.reorgContract = [...this.reorgContract, contractName]
    this.lastProcessedBlockNumber = lastProcessedBlockNumber

    logger.info(`Reorg happens on block number ${lastProcessedBlockNumber} for ${contractName} contract`)
  }
}
