import config from 'config'
import { createLibP2P, Room } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'

import { loggingFactory } from '../../../logger'
import Offer from '../models/offer.model'
import NotificationModel from '../../notification/notification.model'

const logger = loggingFactory('storage:communication')

let libp2p: Libp2p

function getRoomTopic (offerId: string): string {
  return `${config.get<string>('blockchain.networkId')}:${offerId}`
}

async function initCommunication (): Promise<void> {
  if (libp2p) {
    logger.debug('libp2p node already spawned')
    return
  }
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')

  libp2p = await createLibP2P(libp2pConf)
}

async function handleMessage (message: any): Promise<void> {
  // await NotificationModel.create({ title: 'Some titile',})
}

async function subscribeForOffers () {
  const offers = await Offer.findAll()
  offers.forEach(offer => {
    const topic = getRoomTopic(offer.provider)
    const logger = loggingFactory(`storage:communication:room:${topic}`)
    const room = new Room(libp2p, topic)

    room.on('message', async ({ from, data }) => {
      if (from !== offer.peerId) {
        return
      }
      await handleMessage(data)
    })
    room.on('error', (e) => logger.error(e))
  })
}
