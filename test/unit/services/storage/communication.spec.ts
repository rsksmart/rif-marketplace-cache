import chai from 'chai'
import sinonChai from 'sinon-chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import PeerId from 'peer-id'
import { Room } from '@rsksmart/rif-communications-pubsub'

import { sequelizeFactory } from '../../../../src/sequelize'
import { Comms, getRoomTopic } from '../../../../src/communication'
import Offer from '../../../../src/services/storage/models/offer.model'
import { awaitForPeerJoined, createLibp2pRoom, sleep, spawnLibp2p } from '../../../utils'
import Agreement from '../../../../src/services/storage/models/agreement.model'
import NotificationModel from '../../../../src/services/notification/notification.model'
import Libp2p from 'libp2p'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Communication', function () {
  this.timeout(10000)
  let offer: Offer
  let libp2p: Libp2p
  let roomPinner: Room
  let room: Room
  let comms: Comms
  const sequelize = sequelizeFactory()

  before(async () => {
    await sequelize.sync({ force: true })
    const peerId = await PeerId.create()
    offer = await Offer.create({ provider: 'abc', totalCapacity: 123, peerId: peerId.toJSON().id })

    // Create libp2p ndoe for pinner
    libp2p = await spawnLibp2p(peerId)
    // Create PubSub room to listen on events
    roomPinner = await createLibp2pRoom(libp2p, offer.provider)

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
    const agreement = await Agreement.create({ agreementReference: 'test', consumer: 'testAccount' })
    // Send message
    const message = { code: 2, payload: { agreementReference: agreement.agreementReference, hello: 'hello' } }
    await roomPinner.broadcast(message)
    await sleep(500)

    const notifications = await NotificationModel.findAll()
    expect(notifications.length).to.be.eql(1)
    expect(notifications[0].account).to.be.eql(agreement.consumer)
    expect(notifications[0].type).to.be.eql('2')
    expect(notifications[0].payload).to.be.eql(message.payload)
  })
})
