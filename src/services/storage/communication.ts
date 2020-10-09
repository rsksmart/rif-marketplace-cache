import config from 'config'
import { createLibP2P, Room } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'

import { loggingFactory } from '../../logger'
import Offer from './models/offer.model'
import { Application, ServiceAddresses } from '../../definitions'

const logger = loggingFactory('storage:communication')
// (offerId -> room) MAP
const rooms = new Map()

let libp2p: Libp2p

function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

export function getRooms () {
  return rooms
}

export function getRoom (offerId: string) {
  return rooms.get(getRoomTopic(offerId))
}

function messageHandler (app: Application): (message: any) => Promise<void> {
  const messageService = app.service(ServiceAddresses.NOTIFICATION)
  // TODO add GC for notification
  return async function (message: any): Promise<void> {
    await messageService.create({ title: '', type: message.code, payload: message.payload })
  }
}

async function subscribeForOffers (app: Application): Promise<void> {
  const handler = messageHandler(app)
  for (const offer of await Offer.findAll()) {
    const topic = getRoomTopic(offer.provider)
    const logger = loggingFactory(`storage:communication:room:${topic}`)

    const room = new Room(libp2p, topic)
    rooms.set(offer.provider, room) // store room to be able to leave the channel when offer is terminated

    room.on('message', async ({ from, data: message }) => {
      if (from !== offer.peerId) {
        return
      }
      logger.debug(`Receive message: ${message}`)
      await handler(message)
    })
    room.on('error', (e) => logger.error(e))
  }
}

export default async function (app: Application): Promise<void> {
  if (libp2p) {
    logger.debug('libp2p node already spawned')
    return
  }
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')

  libp2p = await createLibP2P(libp2pConf)

  await subscribeForOffers(app)
}
