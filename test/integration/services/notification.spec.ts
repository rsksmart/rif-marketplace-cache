import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'

import { generateCID, generateMsg, getFeatherClient, TestingApp } from '../utils'
import Agreement from '../../../src/services/storage/models/agreement.model'
import { MessageCodesEnum, ServiceAddresses } from '../../../src/definitions'
import NotificationModel from '../../../src/notification/notification.model'

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

    before(() => {
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
    })

    it('Should create notification through API', async () => {
      // Create offer
      await app.createOffer(offerData)
      await app.addConfirmations()

      // Create agreement
      await app.createAgreement(agreementData)
      await app.addConfirmations()

      const agreement = await Agreement.findOne({ raw: true }) as Agreement
      const msg = {
        code: MessageCodesEnum.I_AGREEMENT_EXPIRED,
        payload: {
          agreementReference: agreement.agreementReference,
          test: 'Hello'
        },
        offerId: app.providerAddress.toLowerCase(),
        version: 1,
        timestamp: Date.now()
      }
      expect(await commsService.create(msg)).to.be.eql(true)
      const [notification] = await NotificationModel.findAll()
      expect(notification.type).to.be.eql('storage')
      expect(notification.payload.agreementReference).to.be.eql(agreement.agreementReference)
      expect(notification.payload.code).to.be.eql(MessageCodesEnum.I_AGREEMENT_EXPIRED)
    })
  })
})
