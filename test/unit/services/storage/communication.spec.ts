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
import { NotificaitonType } from '../../../../src/definitions'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Communication', function () {
  this.timeout(10000)
  let offer: Offer
  let agreement: Agreement
  let libp2p: Libp2p
  let roomPinner: Room
  let room: Room
  let comms: Comms
  const sequelize = sequelizeFactory()

  before(async () => {
    await sequelize.sync({ force: true })
    const peerId = await PeerId.create()
    offer = await Offer.create({ provider: 'abc', totalCapacity: 123, peerId: peerId.toJSON().id })
    agreement = await Agreement.create({ agreementReference: 'test', consumer: 'testAccount' })

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
  beforeEach(async () => {
    await NotificationModel.destroy({ where: {} })
  })

  it('Should create notification', async () => {
    // Send message
    const message = { code: 2, payload: { agreementReference: agreement.agreementReference, hello: 'hello' } }
    await roomPinner.broadcast(message)
    await sleep(500)

    const notifications = await NotificationModel.findAll()
    expect(notifications.length).to.be.eql(1)
    expect(notifications[0].account).to.be.eql(agreement.consumer)
    expect(notifications[0].type).to.be.eql(NotificaitonType.AGREEMENT)
    expect(notifications[0].payload).to.be.eql({ ...message.payload, code: message.code })
  })
  it('should GC notification', async () => {
    await NotificationModel.bulkCreate([
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: 'test123', id: 1 } }, // notification for another agreement
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 2 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 3 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 4 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 5 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 6 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 7 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 8 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 9 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 10 } },
      { account: 'testAcc', type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 11 } }
    ])
    const notifications = await NotificationModel.findAll()
    expect(notifications.length).to.be.eql(11)

    // Send message
    const message = { type: NotificaitonType.AGREEMENT, payload: { agreementReference: agreement.agreementReference, id: 12 } }
    await roomPinner.broadcast(message)
    await sleep(500)

    const notificationsUpdated = await NotificationModel.findAll({ raw: true })
    expect(notificationsUpdated.length).to.be.eql(11)
    // Oldest notification for agreement should be removed
    expect(await NotificationModel.findOne({ where: { payload: { id: 2 } } })).to.be.eql(null)
  })
})
