import config from 'config'
import { createLibP2P, Room, Message } from '@rsksmart/rif-communications-pubsub'
// import type Libp2p from 'libp2p'

import { loggingFactory } from './logger'
import Offer from './services/storage/models/offer.model'
import NotificationModel from './services/notification/notification.model'
import { JsonSerializable } from '@rsksmart/rif-communications-pubsub/types/definitions'
import { NotificationService } from './services/notification'
import { Application } from './definitions'

const logger = loggingFactory('storage:communication')

type MessageHandler = (message: JsonSerializable) => Promise<void>

// (offerId -> room) MAP
const rooms = new Map<string, Room>()

export function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

export function messageHandler (notificationService: NotificationService): (message: any) => Promise<void> {
  // TODO add GC for notification
  return async function (message: any): Promise<void> {
    // await notificationService.create({ title: '', type: message.code, payload: message.payload })
    await NotificationModel.create({ title: '', type: message.code, payload: message.payload })
  }
}

export function initLibp2p (): Promise<any> {
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')

  return createLibP2P(libp2pConf)
}

export class Comms {
  libp2p: any
  messageHandler: MessageHandler | undefined

  get rooms (): Map<string, Room> {
    return rooms
  }

  getRoom (topic: string): Room | undefined {
    return rooms.get(topic)
  }

  async init (messageHandler: MessageHandler): Promise<void> {
    if (this.libp2p) {
      throw new Error('libp2p node already spawned')
    }
    this.messageHandler = messageHandler
    this.libp2p = await initLibp2p()
  }

  subscribeForOffer (offer: Offer): void {
    if (!this.messageHandler || !this.libp2p) {
      throw new Error('Libp2p not initialized')
    }
    const topic = getRoomTopic(offer.provider)
    const logger = loggingFactory(`storage:communication:room:${topic}`)
    const room = new Room(this.libp2p, topic)
    logger.info(`Created room for topic: ${topic}`)
    rooms.set(topic, room) // store room to be able to leave the channel when offer is terminated

    room.on('message', async ({ from, data: message }: Message) => {
      logger.info(`Receive message: ${JSON.stringify(message)}`)

      if (from !== offer.peerId) {
        return
      }
      await this.messageHandler?.(message)
    })
    room.on('peer:joined', (peer) => logger.info(`${topic}: peer ${peer} joined`))
    room.on('peer:left', (peer) => logger.info(`${topic}: peer ${peer} left`))
    room.on('error', (e) => logger.error(e))
  }

  async subscribeForOffers (): Promise<void> {
    if (!this.messageHandler || !this.libp2p) {
      logger.debug('Libp2p not initialized')
    }
    for (const offer of await Offer.findAll()) {
      this.subscribeForOffer(offer)
    }
  }

  stop (): void {
    for (const [, room] of this.rooms) {
      room.leave()
    }

    if (this.libp2p) {
      this.libp2p.stop()
    }
  }
}

export default function (app: Application): void {
  app.set('comms', new Comms())
}
