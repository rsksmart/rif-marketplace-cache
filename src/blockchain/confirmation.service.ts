import type { Eth } from 'web3-eth'
import type { ServiceAddons, ServiceMethods } from '@feathersjs/feathers'
import { EventEmitter } from 'events'
import config from 'config'

import Event from './event.model'
import { Application, NewBlockEmitterOptions } from '../definitions'
import { ListeningNewBlockEmitter, PollingNewBlockEmitter } from './events'
import { asyncSplit, errorHandler, split } from '../utils'
import { loggingFactory } from '../logger'

const logger = loggingFactory('blockchain.confirmations')
const NEW_CONFIRMATION_EVENT_NAME = 'newConfirmation'
const INVALID_CONFIRMATION_EVENT_NAME = 'invalidConfirmation'

function isConfirmedClosure (currentBlockNumber: number) {
  return (event: Event): boolean => event.getConfirmationsCount(currentBlockNumber) > event.targetConfirmation
}

export default class ConfirmationService implements Partial<ServiceMethods<any>> {
  private readonly eth: Eth
  private newBlockEmitter: EventEmitter
  public events: string[]

  constructor (eth: Eth, newBlockEmitterOptions?: NewBlockEmitterOptions | EventEmitter) {
    this.eth = eth
    this.events = [NEW_CONFIRMATION_EVENT_NAME]

    if (newBlockEmitterOptions) {
      if (newBlockEmitterOptions instanceof EventEmitter) {
        this.newBlockEmitter = newBlockEmitterOptions
      } else {
        if (newBlockEmitterOptions.polling) {
          this.newBlockEmitter = new PollingNewBlockEmitter(this.eth, newBlockEmitterOptions.pollingInterval)
        } else {
          this.newBlockEmitter = new ListeningNewBlockEmitter(this.eth)
        }
      }
    } else {
      this.newBlockEmitter = new ListeningNewBlockEmitter(this.eth)
    }
  }

  private async eventHasValidReceipt (event: Event): Promise<boolean> {
    const reciept = await this.eth.getTransactionReceipt(event.transactionHash)

    if (reciept.status && reciept.blockNumber === event.blockNumber) {
      return true
    } else {
      logger.warn(`Event ${event.event} of transaction ${event.transactionHash} does not have valid receipt!
      Block numbers: ${event.blockNumber} (event) vs ${reciept.blockNumber} (receipt) and receipt status: ${reciept.status} `)
      return false
    }
  }

  private async handleAlreadyConfirmed (events: Event[], currentBlockNumber: number): Promise<void> {
    const targetMultiplier = config.get<number>('blockchain.confirmationsService.deleteTargetConfirmationsMultiplier')
    const toBeDeleted = events.filter(event => event.emitted && event.getConfirmationsCount(currentBlockNumber) >= event.targetConfirmation * targetMultiplier)
    logger.verbose(`Removing ${toBeDeleted.length} already confirmed events that exceeded number of required configuration * multiplier`)
    await Event.destroy({ where: { id: toBeDeleted.map(e => e.id) } })
  }

  private async emitConfirmations (this: ConfirmationService & ServiceAddons<any>, currentBlockNumber: number): Promise<void> {
    const events = await Event.findAll({
      attributes: { exclude: ['content'] },
      group: ['transactionHash', 'event']
    })

    const [alreadyConfirmed, toBeConfirmed] = split(events, isConfirmedClosure(currentBlockNumber))
    await this.handleAlreadyConfirmed(alreadyConfirmed, currentBlockNumber)

    const [valid, invalid] = await asyncSplit(toBeConfirmed, this.eventHasValidReceipt.bind(this))
    valid.map(event => {
      return {
        event: event.event,
        transactionHash: event.transactionHash,
        confirmations: event.getConfirmationsCount(currentBlockNumber),
        targetConfirmation: event.targetConfirmation
      }
    })
      .forEach(event => {
        logger.debug(`Emitting confirmation:\n${JSON.stringify(event, null, 2)}`)
        this.emit(NEW_CONFIRMATION_EVENT_NAME, event)
      })

    if (invalid.length !== 0) {
      logger.warn(`${invalid.length} events dropped because of no valid reciept.`)
      invalid.forEach(e => this.emit(INVALID_CONFIRMATION_EVENT_NAME, { transactionHash: e.transactionHash }))
      await Event.destroy({ where: { id: invalid.map(e => e.id) } })
    }
  }

  async find (): Promise<object[]> {
    const transactionsToBeConfirmed = await Event.findAll({
      attributes: ['blockNumber', 'transactionHash', 'event', 'targetConfirmation'],
      group: ['transactionHash', 'event']
    })
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

  setup (app: Application, path: string): Promise<void> {
    const fullService = app.service(path)
    this.newBlockEmitter.on('newBlock', errorHandler(this.emitConfirmations.bind(fullService), logger))
    return Promise.resolve()
  }
}
