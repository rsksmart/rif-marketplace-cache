import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { TestingApp } from '../utils'
import { sleep } from '../../../utils'
import Offer from '../../../../src/services/storage/models/offer.model'
import BillingPlan from '../../../../src/services/storage/models/billing-plan.model'

chai.use(sinonChai)
const expect = chai.expect

describe.only('Storage service', function () {
  this.timeout(20000)
  let app: TestingApp

  before(async () => {
    // @ts-ignore
    config.rns.enabled = false
    app = new TestingApp()
    await app.initAndStart()
  })
  after(async () => {
    await app.stop()
    // @ts-ignore
    config.rns.enabled = true
  })
  describe('Storage manager', () => {
    describe('Offers', () => {
      const offerData = {
        totalCapacity: '1024',
        periods: [10, 20],
        prices: [100, 200]
      }
      beforeEach(async () => {
        await Offer.destroy({ where: {} })
        await BillingPlan.destroy({ where: {} })
      })
      it('should create an offer', async () => {
        await app.createOffer(offerData)

        await sleep(4000)
        await app.advanceBlock()
        await sleep(4000)
        await app.advanceBlock()
        await sleep(4000)

        const offers = await Offer.findAll({ include: [{ model: BillingPlan, as: 'plans' }] })
        expect(offers.length).to.be.eql(1)

        const offer = offers[0]
        expect(offer.totalCapacity.toString()).to.be.eql(offerData.totalCapacity)
        expect(offer.provider).to.be.eql(app.providerAddress)
        expect(offer.plans.length).to.be.eql(2)
      })
    })
  })
})
