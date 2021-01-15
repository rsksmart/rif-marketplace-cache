import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import PeerId from 'peer-id'

import { generateCID, generateMsg, getFeatherClient, TestingApp } from '../utils'
import Agreement from '../../../src/services/storage/models/agreement.model'
import { MessageCodesEnum, ServiceAddresses } from '../../../src/definitions'
import NotificationModel from '../../../src/notification/notification.model'
import { sleep } from '../../utils'

chai.use(sinonChai)
const expect = chai.expect

describe('Comms service', function () {
  this.timeout(60000)
  let app: TestingApp

  before(async () => {
    // @ts-ignore
    config.rns.enabled = false
    // @ts-ignore
    config.comms.strategy = 'api'
    app = new TestingApp()
    await app.initAndStart()
  })
  after(async () => {
    await app.stop()
    // @ts-ignore
    config.rns.enabled = true
    // @ts-ignore
    config.comms.strategy = 'libp2p'
  })
  describe('Notification', () => {
    const client = getFeatherClient()
    const commsService = client.service(ServiceAddresses.COMMS)
    let agreementData: Record<string, any>
    let offerData: Record<string, any>

    before(async () => {
      offerData = {
        totalCapacity: '1024',
        periods: [10],
        prices: [100],
        msg: generateMsg(app.peerId?.id as string)
      }

      agreementData = {
        provider: app.providerAddress,
        cid: generateCID(),
        period: offerData.periods[0],
        size: 10,
        amount: 10000
      }
      // Create offer
      await app.createOffer(offerData)
      await app.addConfirmations()

      // Create agreement
      await app.createAgreement(agreementData)
      await app.addConfirmations()
    })
    beforeEach(async () => {
      await NotificationModel.destroy({ where: {} })
    })

    it('should create notification through API', async () => {
      const peerId = await PeerId.createFromJSON(app.peerId as any)
      const agreement = await Agreement.findOne({ raw: true }) as Agreement
      const data = {
        code: MessageCodesEnum.I_AGREEMENT_EXPIRED,
        payload: {
          agreementReference: agreement.agreementReference,
          test: 'Hello'
        },
        version: 1,
        timestamp: Date.now()
      }
      const msg = {
        data,
        offerId: app.providerAddress.toLowerCase(),
        publicKey: app.peerId?.pubKey,
        signature: await peerId.privKey.sign(Buffer.from(JSON.stringify(data)))
      }

      expect(await commsService.create(msg)).to.be.eql(true)
      const [notification] = await NotificationModel.findAll()
      expect(notification.type).to.be.eql('storage')
      expect(notification.payload.agreementReference).to.be.eql(agreement.agreementReference)
      expect(notification.payload.code).to.be.eql(MessageCodesEnum.I_AGREEMENT_EXPIRED)
      await sleep(3000)
    })
    it('should not create notification for no offer message', async () => {
      const peerId = await PeerId.createFromJSON(app.peerId as any)
      const agreement = await Agreement.findOne({ raw: true }) as Agreement
      const data = {
        code: MessageCodesEnum.I_AGREEMENT_EXPIRED,
        payload: {
          agreementReference: agreement.agreementReference,
          test: 'Hello'
        },
        version: 1,
        timestamp: Date.now()
      }
      const msg = {
        data,
        offerId: app.providerAddress.toLowerCase() + '123',
        publicKey: app.peerId?.pubKey,
        signature: await peerId.privKey.sign(Buffer.from(JSON.stringify(data)))
      }
      await commsService.create(msg).catch((e: any) => {
        expect(e.message).to.be.eql(`Offer for provider ${app.providerAddress.toLowerCase() + '123'} not found`)
      })
      const notifications = await NotificationModel.findAll()
      expect(notifications.length).to.be.eql(0)
    })
    it('should not create notification for invalid signature', async () => {
      const peerId = await PeerId.createFromJSON(app.peerId as any)
      const agreement = await Agreement.findOne({ raw: true }) as Agreement
      const data = {
        code: MessageCodesEnum.I_AGREEMENT_EXPIRED,
        payload: {
          agreementReference: agreement.agreementReference,
          test: 'Hello'
        },
        version: 1,
        timestamp: Date.now()
      }
      const msg = {
        data,
        offerId: app.providerAddress.toLowerCase(),
        publicKey: app.peerId?.pubKey,
        signature: await peerId.privKey.sign(Buffer.from(JSON.stringify({ data: 'test' })))
      }
      await commsService.create(msg).catch((e: any) => {
        expect(e.message).to.be.eql('Invalid signature or peerId')
      })
      const notifications = await NotificationModel.findAll()
      expect(notifications.length).to.be.eql(0)
    })
    it('should not create notification for invalid peerId', async () => {
      const peerId = await PeerId.createFromJSON(app.peerId as any)
      const anotherPeerID = (await PeerId.create()).toJSON()
      const agreement = await Agreement.findOne({ raw: true }) as Agreement
      const data = {
        code: MessageCodesEnum.I_AGREEMENT_EXPIRED,
        payload: {
          agreementReference: agreement.agreementReference,
          test: 'Hello'
        },
        version: 1,
        timestamp: Date.now()
      }
      const msg = {
        data,
        offerId: app.providerAddress.toLowerCase(),
        publicKey: anotherPeerID.pubKey,
        signature: await peerId.privKey.sign(Buffer.from(JSON.stringify(data)))
      }
      await commsService.create(msg).catch((e: any) => {
        expect(e.message).to.be.eql('Invalid signature or peerId')
      })
      const notifications = await NotificationModel.findAll()
      expect(notifications.length).to.be.eql(0)
    })
  })
})
