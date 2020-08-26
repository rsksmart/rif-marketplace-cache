import { ServiceMethods } from '@feathersjs/feathers'

import { loggingFactory } from '../logger'

const logger = loggingFactory('blockchain:reorg-service')
const DEFAULT_DEBOUNCE_TIME = 5000
const REORG_EVENT = 'reorg-event'

export class ReorgEmitterService implements Partial<ServiceMethods<any>> {
  private readonly debounceTime: number = DEFAULT_DEBOUNCE_TIME
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
    logger.info(`Reorg happens on block number ${lastProcessedBlockNumber} for ${contractName} contract`)
    this.emit(REORG_EVENT, { lastProcessedBlockNumber, contractName })
  }
}
