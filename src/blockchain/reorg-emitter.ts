import { ServiceMethods } from '@feathersjs/feathers'

import { loggingFactory } from '../logger'

const logger = loggingFactory('blockchain:reorg-service')
const DEFAULT_DEBOUNCE_TIME = 5000
export const REORG_EVENT = 'reorg-event'

export class ReorgEmitterService implements Partial<ServiceMethods<any>> {
  private readonly debounceTime: number
  private reorgContract: string[] = []
  private lastProcessedBlockNumber = 0
  private timeoutStarted = false
  emit?: Function
  events: string[]

  constructor (debounceTime?: number) {
    this.debounceTime = debounceTime || DEFAULT_DEBOUNCE_TIME
    this.events = [REORG_EVENT]
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
        if (this.emit) {
          this.emit(REORG_EVENT, { contracts: this.reorgContract, lastProcessedBlockNumber: this.lastProcessedBlockNumber })
        }
        this.reorgContract = []
        this.lastProcessedBlockNumber = 0
      }, this.debounceTime)
      this.timeoutStarted = true
    }

    this.reorgContract = [...this.reorgContract, contractName]
    this.lastProcessedBlockNumber = lastProcessedBlockNumber

    logger.info(`Reorg happens on block number ${lastProcessedBlockNumber} for ${contractName} contract`)
  }
}
