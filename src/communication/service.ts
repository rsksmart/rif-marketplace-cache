import { Service } from 'feathers-sequelize'

import { CommsMessage, CommsPayloads, MessageHandler } from '../definitions'
import Offer from '../services/storage/models/offer.model'
import { disallow } from 'feathers-hooks-common'
import { loggingFactory } from '../logger'

type CacheIncomingNotification = { signature: Buffer, offerId: string, publicKey: string, peerId: string }

const logger = loggingFactory('comms:service')

export class CommsService extends Service {
  emit?: Function
  messageHandler: MessageHandler

  constructor (config: any, messageHandler: MessageHandler) {
    super(config)
    this.messageHandler = messageHandler
  }

  async create (message: CacheIncomingNotification & CommsMessage<CommsPayloads>): Promise<boolean> {
    logger.debug('Receive message: ', message)
    const { offerId, peerId } = message
    const offer = await Offer.findOne({ where: { provider: message.offerId } })

    if (!offer) {
      throw new Error(`Offer for provider ${offerId} not found`)
    }

    // TODO check somehow that message come from the correct pinner
    // Maybe add some message encryption using libp2p keys

    await this.messageHandler(message)
    return true
  }
}

export const CommsServiceHook = {
  before: {
    all: [],
    find: disallow('external'),
    get: disallow('external'),
    create: [],
    update: disallow('external'),
    patch: disallow('external'),
    remove: disallow('external')
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
