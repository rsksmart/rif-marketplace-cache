import config from 'config'
import { createLibP2P, Room, Message } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'
import PeerId from 'peer-id'

import { loggingFactory } from './logger'
import Offer from './services/storage/models/offer.model'
import NotificationModel from './services/notification/notification.model'
import { NotificationService } from './services/notification'
import {
  Application,
  CommsMessage,
  CommsPayloads,
  MessageCodesEnum,
  MessageHandler,
  NotificationType
} from './definitions'
import Agreement from './services/storage/models/agreement.model'
import { errorHandler } from './utils'

type NotificationData = {
  accounts: string[]
  type: string
  payload: CommsPayloads
}

const logger = loggingFactory('communication')
// (offerId -> room) MAP
const rooms = new Map<string, Room>()

export function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

async function gcAgreementNotifications (agreementReference: string): Promise<void> {
  // Remove old notifications for specific agreement
  const messageLimit = config.get<number>('notification.countOfNotificationPersistedPerAgreement')
  const notificationToDelete = await NotificationModel.findAll({
    offset: messageLimit,
    order: [['id', 'DESC']],
    where: {
      payload: {
        agreementReference: agreementReference
      },
      type: NotificationType.STORAGE
    }
  })
  await Promise.all(notificationToDelete.map(n => n.destroy()))
}

function buildNotification (agreement: Agreement, message: CommsMessage<CommsPayloads>): NotificationData | undefined {
  const notification = {
    type: NotificationType.STORAGE,
    payload: { ...message.payload, code: message.code }
  }
  switch (message.code) {
    case MessageCodesEnum.I_AGREEMENT_NEW:
      return {
        accounts: [agreement.offerId],
        ...notification
      }
    case MessageCodesEnum.I_AGREEMENT_EXPIRED:
      return {
        accounts: [agreement.consumer, agreement.offerId],
        ...notification
      }
    case MessageCodesEnum.I_HASH_PINNED:
    case MessageCodesEnum.E_AGREEMENT_SIZE_LIMIT_EXCEEDED:
      return {
        accounts: [agreement.consumer],
        ...notification
      }
    default:
      return undefined
  }
}

export function messageHandler (
  notificationService?: NotificationService
): (message: CommsMessage<CommsPayloads>) => Promise<void> {
  return async function (message: CommsMessage<CommsPayloads>): Promise<void> {
    const agreement = await Agreement.findOne({ where: { agreementReference: message.payload.agreementReference } })

    if (!agreement) {
      logger.verbose(`Agreement ${message.payload.agreementReference} for message not found`)
      return
    }
    const notificationData = buildNotification(agreement, message)
    logger.debug('Build Notification: ', notificationData)

    if (!notificationData) {
      return
    }

    if (!notificationService) {
      NotificationModel.create(notificationData)
    } else {
      await notificationService.create(notificationData)
    }

    // GC agreement notifications
    await gcAgreementNotifications(agreement.agreementReference)
  }
}

export async function initLibp2p (): Promise<Libp2p> {
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')
  return createLibP2P({ ...libp2pConf, peerId: await PeerId.create() })
}

export class Comms {
  public libp2p: Libp2p | undefined
  private _messageHandler: MessageHandler = messageHandler()

  set messageHandler (handler: MessageHandler) {
    this._messageHandler = handler
  }

  get peerId (): string {
    if (!this.libp2p) {
      throw new Error('Libp2p not initialized')
    }
    return this?.libp2p?.peerId.toJSON().id as string
  }

  get rooms (): Map<string, Room> {
    return rooms
  }

  getRoom (topic: string): Room | undefined {
    return rooms.get(topic)
  }

  async init (): Promise<void> {
    if (this.libp2p) {
      throw new Error('libp2p node already spawned')
    }
    this.libp2p = await initLibp2p()
  }

  subscribeForOffer (offer: Offer): void {
    if (!this.libp2p) {
      throw new Error('Libp2p not initialized')
    }
    const topic = getRoomTopic(offer.provider)

    if (rooms.has(topic)) {
      rooms.get(topic)?.leave()
    }
    const roomLogger = loggingFactory(`communication:room:${topic}`)
    const messageHandler = errorHandler(this._messageHandler, roomLogger)
    const room = new Room(this.libp2p, topic)
    rooms.set(topic, room) // store room to be able to leave the channel when offer is terminated
    roomLogger.info(`Created room for topic: ${topic}`)

    room.on('message', async ({ from, data: message }: Message<any>) => {
      // Ignore message from itself
      if (from === this.libp2p?.peerId.toJSON().id) {
        return
      }

      roomLogger.debug(`Receive message: ${JSON.stringify(message)}`)

      if (from !== offer.peerId) {
        return
      }
      await messageHandler(message as CommsMessage<CommsPayloads>)
    })
    room.on('peer:joined', (peer) => roomLogger.debug(`${topic}: peer ${peer} joined`))
    room.on('peer:left', (peer) => roomLogger.debug(`${topic}: peer ${peer} left`))
    room.on('error', (e) => roomLogger.error(e))
  }

  async subscribeForOffers (): Promise<void> {
    if (!this.libp2p) {
      throw new Error('Libp2p not initialized')
    }
    for (const offer of await Offer.findAll()) {
      this.subscribeForOffer(offer)
    }
  }

  async stop (): Promise<void> {
    for (const [, room] of this.rooms) {
      room.leave()
    }

    if (this.libp2p) {
      await this.libp2p.stop()
    }
  }
}

export default function (app: Application): void {
  app.set('comms', new Comms())
}
