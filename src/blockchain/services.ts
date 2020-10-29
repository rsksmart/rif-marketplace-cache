import { getObject } from 'sequelize-store'
import { Event, INVALID_CONFIRMATION_EVENT_NAME, NEW_CONFIRMATION_EVENT_NAME, NEW_BLOCK_EVENT_NAME, REORG_OUT_OF_RANGE_EVENT_NAME } from '@rsksmart/web3-events'
import type { BlockHeader, Eth } from 'web3-eth'
import type { ServiceMethods } from '@feathersjs/feathers'
import { loggingFactory } from '../logger'

const DEFAULT_DEBOUNCE_TIME = 5000

export class NewBlockEmitterService implements Partial<ServiceMethods<any>> {
  emit?: Function
  events: string[]

  constructor () {
    this.events = [NEW_BLOCK_EVENT_NAME]
  }

  // eslint-disable-next-line require-await
  async find (): Promise<BlockHeader> {
    return this.getLastBlock()
  }

  getLastBlock (): BlockHeader {
    return getObject()['blockchain.lastFetchedBlock'] as BlockHeader
  }
}

export class ConfirmatorService implements Partial<ServiceMethods<any>> {
  private readonly eth: Eth
  public events: string[]

  constructor (eth: Eth) {
    this.eth = eth
    this.events = [NEW_CONFIRMATION_EVENT_NAME, INVALID_CONFIRMATION_EVENT_NAME]
  }

  async find (): Promise<object[]> {
    const transactionsToBeConfirmed = await Event.findAll({
      attributes: ['blockNumber', 'transactionHash', 'event', 'targetConfirmation'],
      group: ['transactionHash', 'event']
    }) as Event[]
    const currentBlockNumber = await this.eth.getBlockNumber()

    return transactionsToBeConfirmed.map(event => {
      return {
        event: event.event,
        transactionHash: event.transactionHash,
        confirmations: currentBlockNumber - event.blockNumber,
        targetConfirmation: event.targetConfirmation
      }
    })
  }
}

export class ReorgEmitterService implements Partial<ServiceMethods<any>> {
  private readonly debounceTime: number
  private reorgContract: string[] = []
  private lastProcessedBlockNumber = 0
  private timeoutStarted = false
  private logger = loggingFactory('blockchain:reorg-service')
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
        this.logger.warn(`Reorg outside of confirmation range happens on block number ${lastProcessedBlockNumber} for [${this.reorgContract}] contracts`)
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
