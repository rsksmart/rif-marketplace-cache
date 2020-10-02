import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'

import { TestingApp, ZERO_ADDRESS } from '../../utils'
import { sleep } from '../../../utils'
import Offer from '../../../../src/services/storage/models/offer.model'
import BillingPlan from '../../../../src/services/storage/models/billing-plan.model'
import Rate from '../../../../src/services/rates/rates.model'
import { asciiToHex } from 'web3-utils'
import Agreement from '../../../../src/services/storage/models/agreement.model'
import { wrapEvent } from '../../../../src/utils'

chai.use(sinonChai)
const expect = chai.expect

const generateMsg = (peerId = 'FakePeerId') => {
  const testPeerIdHex = asciiToHex(peerId, 32).replace('0x', '')
  const nodeIdFlag = '01'
  return `0x${nodeIdFlag}${testPeerIdHex}`
}

describe('Storage service', function () {
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
      afterEach(async () => {
        await BillingPlan.destroy({ where: {} })
        await Offer.destroy({ where: {} })
        await Rate.destroy({ where: {} })
      })
      it('should create an offer and plans', async () => {
        const offerData = {
          totalCapacity: '1024',
          periods: [10],
          prices: [100],
          msg: generateMsg('test')
        }
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
        expect(offer.peerId).to.be.eql('test')
        expect(offer.plans.length).to.be.eql(1)
        expect(offer.plans[0].period.toString()).to.be.eql(offerData.periods[0].toString())
        expect(offer.plans[0].price.toString()).to.be.eql(offerData.prices[0].toString())
      })
      it('should update/create existing offer and plans', async () => {
        const offerData = {
          totalCapacity: 2000,
          periods: [10, 100],
          prices: [200, 300],
          msg: generateMsg('test')
        }
        const offerFromDb = await Offer.create({ provider: app.providerAddress, totalCapacity: 1000 })
        const rateFromDb = await Rate.create({ token: 'rbtc', usd: 1 })
        const planFromDb = await BillingPlan.create({
          period: 10,
          price: 100,
          tokenAddress: ZERO_ADDRESS,
          offerId: offerFromDb.provider,
          rateId: 'rbtc'
        })
        expect(rateFromDb).to.be.instanceOf(Rate)
        expect(offerFromDb).to.be.instanceOf(Offer)
        expect(offerFromDb.totalCapacity.toString()).to.be.eql('1000')
        expect(planFromDb).to.be.instanceOf(BillingPlan)
        expect(planFromDb.period.toString()).to.be.eql('10')
        expect(planFromDb.price.toString()).to.be.eql('100')

        await app.createOffer(offerData)

        await sleep(4000)
        await app.advanceBlock()
        await sleep(4000)
        await app.advanceBlock()
        await sleep(4000)

        const offers = await Offer.findAll({ include: [{ model: BillingPlan, as: 'plans' }] })
        expect(offers.length).to.be.eql(1)

        const offer = offers[0]
        expect(offer.totalCapacity.toString()).to.be.eql(offerData.totalCapacity.toString())
        expect(offer.provider).to.be.eql(app.providerAddress)
        expect(offer.peerId).to.be.eql('test')
        expect(offer.plans.length).to.be.eql(2)
        expect(offer.plans[0].period.toString()).to.be.eql(offerData.periods[0].toString())
        expect(offer.plans[0].price.toString()).to.be.eql(offerData.prices[0].toString())
        expect(offer.plans[1].period.toString()).to.be.eql(offerData.periods[1].toString())
        expect(offer.plans[1].price.toString()).to.be.eql(offerData.prices[1].toString())
      })
    })
    describe('Agreements', () => {
      afterEach(async () => {
        await BillingPlan.destroy({ where: {} })
        await Offer.destroy({ where: {} })
        await Rate.destroy({ where: {} })
      })
      it('should create new agreement', async () => {})
      it('should update existed agreement', async () => {})
      it('should make agreement inActive', async () => {})
      it('should proceed deposit funds', async () => {})
      it('should proceed withdrawal funds', async () => {})
      it('should proceed funds payout', async () => {})
    })
    describe('Staking', () => {
      afterEach(async () => {
        await BillingPlan.destroy({ where: {} })
        await Offer.destroy({ where: {} })
        await Rate.destroy({ where: {} })
      })
      it('should create new stake', async () => {})
      it('should update existed stake', async () => {})
      it('should be able to unstake', async () => {})
      it('should be able to query total stake in USD', async () => {})
    })
    describe('Avg Billing Plan', () => {
      afterEach(async () => {
        await BillingPlan.destroy({ where: {} })
        await Offer.destroy({ where: {} })
        await Rate.destroy({ where: {} })
      })
      it('should be able to query avg billing price min/max values', async () => {})
    })
  })
})
