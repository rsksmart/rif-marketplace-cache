import chai from 'chai'
import sinonChai from 'sinon-chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import PeerId from 'peer-id'
import { createLibP2P, Message, Room } from '@rsksmart/rif-communications-pubsub'

import { sequelizeFactory } from '../../../../src/sequelize'
import initComms, { getRoomTopic } from '../../../../src/services/storage/communication'
import Offer from '../../../../src/services/storage/models/offer.model'
import { sleep } from '../../../utils'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

async function createPinnerLibp2p (peerId: PeerId, offerId: string): Promise<Room> {
  const roomName = getRoomTopic(offerId)
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

  console.log(`Listening on room ${roomName}`)
  const roomPinner = new Room(libp2p, roomName, { pollInterval: 100 })

  roomPinner.on('peer:joined', (peer) => console.log(`${roomName}: peer ${peer} joined`))
  roomPinner.on('peer:left', (peer) => console.log(`${roomName}: peer ${peer} left`))
  roomPinner.on('message', (msg: Message) => {
    console.log(`Pubsub message ${(msg as any).data.code}:`, msg.data)
  })
  return roomPinner
}

describe.only('Communication', function () {
  this.timeout(200000)
  let offer: Offer
  let roomPinner: Room
  const sequelize = sequelizeFactory()

  before(async () => {
    await sequelize.sync({ force: true })
    const peerId = await PeerId.create()
    offer = await Offer.create({ provider: 'abc', totalCapacity: 123, peerId: peerId.toJSON().id })

    // Create PubSub room to listen on events
    roomPinner = await createPinnerLibp2p(peerId, offer.provider)
  })
  it('Should create notification', async () => {
    // Init comms
    await initComms({} as any)
    await sleep(30000)
    // Send message
    await roomPinner.broadcast({ message: 'Hi there' })
    await sleep(10000)
  })
})
