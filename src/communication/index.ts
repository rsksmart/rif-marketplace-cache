import config from 'config'
import { createLibP2P, Room, Message } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'
import PeerId from 'peer-id'

import { loggingFactory } from '../logger'
import Offer from '../services/storage/models/offer.model'
import {
  CommsMessage,
  CommsPayloads,
  MessageHandler
} from '../definitions'
import { errorHandler } from '../utils'
import { messageHandler } from './handlers'

const logger = loggingFactory('communication')

// (offerId -> room) MAP
export const rooms = new Map<string, Room>()

let libp2p: Libp2p
let _messageHandler = messageHandler()

export function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

export function getRoom (topic: string): Room | undefined {
  return rooms.get(topic)
}

export function getPeerId (): string {
  if (!libp2p) {
    throw new Error('Libp2p not initialized')
  }
  return libp2p.peerId.toJSON().id as string
}

export function setMessageHandler (handler: MessageHandler): void {
  _messageHandler = handler
}

export function isInitialized (): boolean {
  return Boolean(libp2p)
}

export function subscribeForOffer (offer: Offer): void {
  if (!libp2p) {
    throw new Error('Libp2p not initialized')
  }
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

export async function subscribeForOffers (): Promise<void> {
  if (!libp2p) {
    throw new Error('Libp2p not initialized')
  }

  for (const offer of await Offer.findAll()) {
    subscribeForOffer(offer)
  }
}

export async function initComms (): Promise<void> {
  if (libp2p) {
    throw new Error('libp2p node already spawned')
  }
  libp2p = await initLibp2p()
}

export async function stop (): Promise<void> {
  for (const [, room] of rooms) {
    room.leave()
  }

  if (libp2p) {
    await libp2p.stop()
  }
}
