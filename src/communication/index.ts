import config from 'config'
import { createLibP2P, Room, Message } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'
import PeerId from 'peer-id'

import { loggingFactory } from '../logger'
import Offer from '../services/storage/models/offer.model'
import {
  Application,
  CommsMessage,
  CommsPayloads,
  MessageHandler,
  ServiceAddresses
} from '../definitions'
import { errorHandler } from '../utils'
import { messageHandler } from './handlers'

const logger = loggingFactory('communication')

let _messageHandler: MessageHandler = messageHandler()

// (offerId -> room) MAP
export const rooms = new Map<string, Room>()

export function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

export function getRoom (topic: string): Room | undefined {
  return rooms.get(topic)
}

export function subscribeForOffer (libp2p: Libp2p, offer: Offer): void {
  const topic = getRoomTopic(offer.provider)

  if (rooms.has(topic)) {
    rooms.get(topic)?.leave()
  }
  const roomLogger = loggingFactory(`communication:room:${topic}`)
  const messageHandler = errorHandler(_messageHandler, roomLogger)
  const room = new Room(libp2p, topic)
  rooms.set(topic, room) // store room to be able to leave the channel when offer is terminated
  roomLogger.info(`Created room for topic: ${topic}`)

  room.on('message', async ({ from, data: message }: Message<any>) => {
    // Ignore message from itself
    if (from === libp2p?.peerId.toJSON().id) {
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

export async function initLibp2p (): Promise<Libp2p> {
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')
  return createLibP2P({ ...libp2pConf, peerId: await PeerId.create() })
}

export async function subscribeForOffers (libp2p: Libp2p): Promise<void> {
  for (const offer of await Offer.findAll()) {
    subscribeForOffer(libp2p, offer)
  }
}

export async function initComms (app: Application): Promise<void> {
  if (app.get('libp2p')) {
    throw new Error('libp2p node already spawned')
  }
  app.set('libp2p', await initLibp2p())
  const notificationService = app.service(ServiceAddresses.NOTIFICATION)
  _messageHandler = messageHandler(notificationService)
}

export async function stop (app: Application): Promise<void> {
  for (const [, room] of rooms) {
    room.leave()
  }

  const libp2p = app.get('libp2p')

  if (libp2p) {
    await libp2p.stop()
  }
}

export default function (app: Application): void {
  app.set('commsInit', initComms(app))
}
