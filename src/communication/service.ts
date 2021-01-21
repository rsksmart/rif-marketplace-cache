import { Service } from 'feathers-sequelize'
import PeerId from 'peer-id'

import { CommsMessage, CommsPayloads, MessageHandler } from '../definitions'
import type { EmitFn } from '../definitions'
import Offer from '../services/storage/models/offer.model'
import { disallow } from 'feathers-hooks-common'
import { loggingFactory } from '../logger'

type CacheIncomingNotification = {
  signature: Buffer
  offerId: string
  publicKey: string
  contractAddress: string
  data: CommsMessage<CommsPayloads>
}

const logger = loggingFactory('comms:service')

async function verifyMessage (
  message: CacheIncomingNotification,
  offerPeerId: string
): Promise<boolean> {
  const { signature, publicKey, data } = message
  const peerId = await PeerId.createFromPubKey(publicKey)

  if (peerId.toJSON().id !== offerPeerId) {
    return false
  }

  return await peerId.pubKey.verify(Buffer.from(JSON.stringify(data)), signature)
}

export class CommsService extends Service {
  emit?: EmitFn
  messageHandler: MessageHandler

  constructor (config: any, messageHandler: MessageHandler) {
    super(config)
    this.messageHandler = messageHandler
  }

  async create (message: CacheIncomingNotification): Promise<boolean> {
    logger.debug('Receive message: ', message)
    const { offerId } = message
    const offer = await Offer.findOne({ where: { provider: message.offerId } })

    if (!offer) {
      throw new Error(`Offer for provider ${offerId} not found`)
    }

    if (!await verifyMessage(message, offer.peerId)) {
      throw new Error('Invalid signature or peerId')
    }

    await this.messageHandler(message.data)
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
