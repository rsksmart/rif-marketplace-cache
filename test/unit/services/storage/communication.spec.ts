import chai from 'chai'
import config from 'config'
import sinonChai from 'sinon-chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import PeerId from 'peer-id'
import Libp2p from 'libp2p'
import { Room } from '@rsksmart/rif-communications-pubsub'

import { sequelizeFactory } from '../../../../src/sequelize'
import { getRoom, getRoomTopic, initComms, subscribeForOffers } from '../../../../src/communication'
import Offer from '../../../../src/services/storage/models/offer.model'
import { awaitForPeerJoined, createLibp2pRoom, sleep, spawnLibp2p } from '../../../utils'
import Agreement from '../../../../src/services/storage/models/agreement.model'
import NotificationModel from '../../../../src/notification/notification.model'
import { Application, MessageCodesEnum, NotificationType } from '../../../../src/definitions'

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
  const sequelize = sequelizeFactory()

  before(async () => {
    // @ts-ignore: not typed
    config.notification.retryInterval = 1000
    // @ts-ignore: not typed
    config.notification.retriesCount = 3

    const app: { [key: string]: any } = {
      get (key: string) {
        return this[key]
      },
      set (key: string, value: any) {
        this[key] = value
      },
      service (key: string) {
        return this.get(key)
      }
    }
    await sequelize.sync({ force: true })
    const peerId = await PeerId.create()
    offer = await Offer.create({ provider: 'abc', totalCapacity: 123, peerId: peerId.toJSON().id })
    agreement = await Agreement.create({ agreementReference: 'test', consumer: 'testAccount', offerId: offer.provider })

    // Create libp2p ndoe for pinner
    libp2p = await spawnLibp2p(peerId)
    // Create PubSub room to listen on events
    roomPinner = await createLibp2pRoom(libp2p, offer.provider)

    // Init comms
    await initComms(app as Application)
    // Subscribe for offers
    await subscribeForOffers(app.get('libp2p'))
    room = getRoom(getRoomTopic(offer.provider)) as Room
    // Await for nodes find each other
    await awaitForPeerJoined(roomPinner)
  })
  beforeEach(async () => {
    await NotificationModel.destroy({ where: {} })
  })

  it('should create notification', async () => {
    // Send message
    const message = { code: MessageCodesEnum.I_AGREEMENT_EXPIRED, payload: { agreementReference: agreement.agreementReference, hello: 'hello' } }
    await roomPinner.broadcast(message)
    await sleep(500)

    const notifications = await NotificationModel.findAll()
    expect(notifications.length).to.be.eql(1)
    expect(notifications[0].accounts).to.be.eql([agreement.consumer, agreement.offerId])
    expect(notifications[0].type).to.be.eql(NotificationType.STORAGE)
    expect(notifications[0].payload).to.be.eql({ ...message.payload, code: message.code })
  })
  it('should create notification if agreement comes later on', async () => {
    const agreementRef = '0x823nd82jdjdkfshjsdf'
    expect(await Agreement.findOne({ where: { agreementReference: agreementRef } })).to.be.eql(null)

    // Send message
    const message = { code: MessageCodesEnum.I_AGREEMENT_EXPIRED, payload: { agreementReference: agreementRef, hello: 'hello' } }
    await roomPinner.broadcast(message)
    await sleep(500)

    // Create agreement after notification comes
    await Agreement.create({ agreementReference: agreementRef, consumer: 'testAccount', offerId: offer.provider })

    await sleep(1500)

    const notifications = await NotificationModel.findAll()
    expect(notifications.length).to.be.eql(1)
    expect(notifications[0].accounts).to.be.eql([agreement.consumer, agreement.offerId])
    expect(notifications[0].type).to.be.eql(NotificationType.STORAGE)
    expect(notifications[0].payload).to.be.eql({ ...message.payload, code: message.code })
  })
  it('should not create notification if no agreement', async () => {
    const fakeAgreementRef = '0x137984yrsdkjfb'
    expect(await Agreement.findOne({ where: { agreementReference: fakeAgreementRef } })).to.be.eql(null)

    // Send message
    const message = { code: MessageCodesEnum.I_AGREEMENT_EXPIRED, payload: { agreementReference: fakeAgreementRef, hello: 'hello' } }
    await roomPinner.broadcast(message)
    await sleep(3000)

    const notifications = await NotificationModel.findAll()
    expect(notifications.length).to.be.eql(0)
  })
  it('should GC notification', async () => {
    await NotificationModel.bulkCreate([
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: 'test123', id: 1 } }, // notification for another agreement
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 2 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 3 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 4 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 5 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 6 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 7 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 8 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 9 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 10 } },
      { accounts: ['testAcc'], type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 11 } }
    ])
    const notifications = await NotificationModel.findAll()
    expect(notifications.length).to.be.eql(11)

    // Send message
    const message = { code: MessageCodesEnum.I_AGREEMENT_EXPIRED, type: NotificationType.STORAGE, payload: { agreementReference: agreement.agreementReference, id: 12 } }
    await roomPinner.broadcast(message)
    await sleep(500)

    const notificationsUpdated = await NotificationModel.findAll({ raw: true })
    expect(notificationsUpdated.length).to.be.eql(11)
    // Oldest notification for agreement should be removed
    expect(await NotificationModel.findOne({ where: { payload: { id: 2 } } })).to.be.eql(null)
  })
})
