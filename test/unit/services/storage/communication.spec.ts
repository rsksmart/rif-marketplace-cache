import chai from 'chai'
import sinonChai from 'sinon-chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import PeerId from 'peer-id'
import { createLibP2P, Message, Room } from '@rsksmart/rif-communications-pubsub'

import { sequelizeFactory } from '../../../../src/sequelize'
import {
  Comms,
  getRoomTopic,
} from '../../../../src/communication'
import Offer from '../../../../src/services/storage/models/offer.model'
import { sleep } from '../../../utils'
import { loggingFactory } from '../../../../src/logger'
import { NotificationService } from '../../../../src/services/notification'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

async function createPinnerLibp2p (peerId: PeerId, offerId: string): Promise<Room> {
  const roomName = getRoomTopic(offerId)
  const logger = loggingFactory(`test:comms:room:${roomName}`)
  const libp2p = await createLibP2P({
    addresses: { listen: ['/ip4/127.0.0.1/tcp/0'] },
    peerId: peerId,
    config: {
      peerDiscovery: {
        bootstrap: {
          enabled: false
        }
      }
    }
  })
  logger.info(`Listening on room ${roomName}`)

  const roomPinner = new Room(libp2p, roomName, { pollInterval: 100 })

  roomPinner.on('peer:joined', (peer) => logger.debug(`${roomName}: peer ${peer} joined`))
  roomPinner.on('peer:left', (peer) => logger.debug(`${roomName}: peer ${peer} left`))
  roomPinner.on('message', (msg: Message) => {
    if (msg.from === libp2p.peerId.toJSON().id) return
    logger.info(`Receive message: ${JSON.stringify(msg.data)}`)
  })
  roomPinner.on('error', (e) => logger.error(e))
  return roomPinner
}

function awaitForPeerJoined (room: Room) {
  return new Promise(resolve => {
    room.on('peer:joined', (peer) => {
      resolve()
    })
  })
}

describe.only('Communication', function () {
  this.timeout(200000)
  let offer: Offer
  let roomPinner: Room
  let room: Room
  let comms: Comms
  const sequelize = sequelizeFactory()

  before(async () => {
    await sequelize.sync({ force: true })
    const peerId = await PeerId.create()
    offer = await Offer.create({ provider: 'abc', totalCapacity: 123, peerId: peerId.toJSON().id })

    // Create PubSub room to listen on events
    roomPinner = await createPinnerLibp2p(peerId, offer.provider)

    // Init comms
    comms = new Comms()
    await comms.init()
    // Subscribe for offers
    await comms.subscribeForOffers()
    room = comms.getRoom(getRoomTopic(offer.provider)) as Room
    // Await for nodes find each other
    await awaitForPeerJoined(roomPinner)
  })
  it('Should create notification', async () => {
    // Send message
    await room?.broadcast({ message: 'Hi from cache' })
    await roomPinner.broadcast({ message: 'Hi from pinner' })
    await sleep(10000)
  })
})
