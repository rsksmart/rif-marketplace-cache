import type { Eth } from 'web3-eth'
import type { ServiceMethods } from '@feathersjs/feathers'

import Event from './event.model'

export default class ConfirmationService implements Partial<ServiceMethods<any>> {
  private readonly eth: Eth

  constructor (eth: Eth) {
    this.eth = eth
  }

  async find () {
    const transactionsToBeConfirmed = await Event.findAll({
      attributes: ['blockNumber', 'transactionHash', 'event', 'targetConfirmation'],
      group: ['blockNumber', 'transactionHash', 'event']
    })
    const currentBlock = await this.eth.getBlockNumber()

    return transactionsToBeConfirmed.map(event => {
      return {
        event: event.event,
        transactionHash: event.transactionHash,
        confirmations: currentBlock - event.blockNumber,
        targetConfirmation: event.targetConfirmation
      }
    })
  }
}
