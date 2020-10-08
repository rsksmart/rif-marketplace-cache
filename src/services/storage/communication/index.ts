import config from 'config'
import { createLibP2P, Room } from '@rsksmart/rif-communications-pubsub'
import type Libp2p from 'libp2p'

import { loggingFactory } from '../../../logger'

const logger = loggingFactory('storage:communication')

let libp2p: Libp2p

async function initCommunication (): Promise<void> {
  if (libp2p) {
    logger.debug('libp2p node already spawned')
    return
  }
  const libp2pConf = config.get<object>('comms.libp2p')
  logger.info('Spawn libp2p node')

  libp2p = await createLibP2P(libp2pConf)

  const room = new Room(libp2p, '0xtestroom')
  room.on('peer:joined', (peer) => console.log(`Peer ${peer} joined.`))
  room.on('peer:left', (peer) => console.log(`Peer ${peer} left.`))
  room.on('message', (message) => console.log(`Message received from ${message.from}, message ${message.data}`))
  room.on('error', (e) => console.log(e))
}

async function subscribeForOffers () {

}
