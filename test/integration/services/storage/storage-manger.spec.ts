import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import BigNumber from 'bignumber.js'
import { asciiToHex, hexToAscii } from 'web3-utils'

import { encodeHash, getFeatherClient, prefixArray, TestingApp, ZERO_ADDRESS } from '../../utils'
import Offer from '../../../../src/services/storage/models/offer.model'
import BillingPlan from '../../../../src/services/storage/models/billing-plan.model'
import Rate from '../../../../src/services/rates/rates.model'
import Agreement from '../../../../src/services/storage/models/agreement.model'
import StakeModel from '../../../../src/services/storage/models/stake.model'
import { ServiceAddresses } from '../../../../src/definitions'
import { WEI } from '../../../../src/services/storage/utils'

chai.use(sinonChai)
const expect = chai.expect

const generateMsg = (peerId: string) => {
  const encodedPeerId = encodeHash(peerId).map(el => el.replace('0x', ''))
  return prefixArray(encodedPeerId, '01', 64)
    .map(el => `0x${el}`)
}

function randomStr (length = 32): string {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function generateCID (): string[] {
  return [asciiToHex(`/ipfs/${randomStr(26)}`)]
}

describe('Storage service', function () {
  this.timeout(60000)
  let app: TestingApp
  let encodedMessage: string[]

  before(async () => {
    // @ts-ignore
    config.rns.enabled = false
    app = new TestingApp()
    await app.initAndStart()
    encodedMessage = generateMsg(app.peerId?.id as string)
  })
  after(async () => {
    await app.stop()
    // @ts-ignore
    config.rns.enabled = true
  })
  describe('Storage', () => {
    describe('Offers', () => {
      afterEach(async () => {
        await BillingPlan.destroy({ where: {} })
        await Offer.destroy({ where: {} })
      })
      it('should create an offer and plans', async () => {
        const offerData = {
          totalCapacity: '1024',
          periods: [10],
          prices: [100],
          msg: encodedMessage
        }
        await app.createOffer(offerData)

        await app.addConfirmations()

        const offers = await Offer.findAll({ include: [{ model: BillingPlan, as: 'plans' }] })
        expect(offers.length).to.be.eql(1)

        const offer = offers[0]
        expect(offer.peerId).to.be.eql(app.peerId?.id as string)
        expect(offer.totalCapacity.toString()).to.be.eql(offerData.totalCapacity)
        expect(offer.provider).to.be.eql(app.providerAddress)
        expect(offer.plans.length).to.be.eql(1)
        expect(offer.plans[0].period.toString()).to.be.eql(offerData.periods[0].toString())
        expect(offer.plans[0].price.toString()).to.be.eql(offerData.prices[0].toString())
      })
      it('should update/create existing offer and plans', async () => {
        const offerData = {
          totalCapacity: 2000,
          periods: [10, 100],
          prices: [200, 300],
          msg: encodedMessage
        }
        const offerFromDb = await Offer.create({ provider: app.providerAddress, totalCapacity: 1000 })
        const planFromDb = await BillingPlan.create({
          period: 10,
          price: 100,
          tokenAddress: ZERO_ADDRESS,
          offerId: offerFromDb.provider,
          rateId: 'rbtc'
        })
        expect(offerFromDb).to.be.instanceOf(Offer)
        expect(offerFromDb.totalCapacity.toString()).to.be.eql('1000')
        expect(planFromDb).to.be.instanceOf(BillingPlan)
        expect(planFromDb.period.toString()).to.be.eql('10')
        expect(planFromDb.price.toString()).to.be.eql('100')

        await app.createOffer(offerData)

        await app.addConfirmations()

        const offers = await Offer.findAll({ include: [{ model: BillingPlan, as: 'plans' }] })
        expect(offers.length).to.be.eql(1)

        const offer = offers[0]
        expect(offer.totalCapacity.toString()).to.be.eql(offerData.totalCapacity.toString())
        expect(offer.provider).to.be.eql(app.providerAddress)
        expect(offer.peerId).to.be.eql(app.peerId?.id as string)
        expect(offer.plans.length).to.be.eql(2)
        expect(offer.plans[0].period.toString()).to.be.eql(offerData.periods[0].toString())
        expect(offer.plans[0].price.toString()).to.be.eql(offerData.prices[0].toString())
        expect(offer.plans[1].period.toString()).to.be.eql(offerData.periods[1].toString())
        expect(offer.plans[1].price.toString()).to.be.eql(offerData.prices[1].toString())
      })
    })
    describe('Agreements', () => {
      let offerData: Record<any, any>
      const size = 10

      before(async () => {
        offerData = {
          totalCapacity: 2000,
          periods: [10, 2592000],
          prices: [200, 300],
          msg: encodedMessage
        }
        await BillingPlan.destroy({ where: {} })
        await Agreement.destroy({ where: {} })
        await Offer.destroy({ where: {} })

        await app.createOffer(offerData)
        await app.addConfirmations()
      })
      afterEach(async () => {
        await Agreement.destroy({ where: {} })
      })
      it('should create new agreement', async () => {
        const agreementData = {
          provider: app.providerAddress,
          cid: generateCID(),
          period: offerData.periods[0],
          size: size,
          amount: 10000
        }
        await app.createAgreement(agreementData)
        await app.addConfirmations()

        const agreement = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        expect(agreement).to.be.instanceOf(Agreement)
        expect(agreement?.consumer).to.be.eql(app.consumerAddress)
        expect(agreement?.dataReference).to.be.eql(hexToAscii(agreementData.cid[0]))
        expect(agreement?.size.toString()).to.be.eql(agreementData.size.toString())
        expect(agreement?.billingPeriod.toString()).to.be.eql(offerData.periods[0].toString())
        expect(agreement?.billingPrice.toString()).to.be.eql(offerData.prices[0].toString())
        expect(agreement?.availableFunds.toNumber()).to.be.eql(agreementData.amount)
        expect(agreement?.tokenAddress).to.be.eql(ZERO_ADDRESS)
      })
      it('should update existed agreement', async () => {
        const agreementData = {
          provider: app.providerAddress,
          cid: generateCID(),
          period: offerData.periods[1],
          size: size,
          amount: 30000
        }
        await app.createAgreement(agreementData)
        await app.addConfirmations()

        const agreement = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        expect(agreement?.availableFunds.toNumber()).to.be.eql(agreementData.amount)

        await app.createAgreement({ ...agreementData, amount: 30000 })
        await app.addConfirmations()

        const updatedAgreement = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        expect(updatedAgreement?.availableFunds.toNumber()).to.be.eql(60000)
      })
      it('should make agreement inActive on AgreementStopped event', async () => {
        const agreementData = {
          provider: app.providerAddress,
          cid: generateCID(),
          period: offerData.periods[0],
          size: size,
          amount: 2000
        }
        await app.createAgreement(agreementData)
        await app.addConfirmations()

        await app.payoutFunds(agreementData.cid)
        await app.addConfirmations()
        const updatedAgreement = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        expect(updatedAgreement?.isActive).to.be.eql(false)
      })
      it('should proceed deposit funds', async () => {
        const agreementData = {
          provider: app.providerAddress,
          cid: generateCID(),
          period: offerData.periods[0],
          size: size,
          amount: 10000
        }
        await app.createAgreement(agreementData)
        await app.addConfirmations()

        const agreement = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        const depositData = {
          cid: agreementData.cid,
          token: ZERO_ADDRESS,
          amount: 1000
        }
        await app.depositFunds(depositData)
        await app.addConfirmations()

        const updatedAgreement = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        expect(agreement?.availableFunds.plus(depositData.amount).toNumber()).to.be.eql(updatedAgreement?.availableFunds.toNumber())
      })
      it('should proceed withdrawal funds', async () => {
        const agreementData = {
          provider: app.providerAddress,
          cid: generateCID(),
          period: offerData.periods[0],
          size: size,
          amount: 2e18
        }
        await app.createAgreement(agreementData)
        await app.addConfirmations()

        const withdrawData = {
          cid: agreementData.cid,
          amount: new BigNumber(1e18)
        }
        await app.withdrawalFunds(withdrawData)
        await app.addConfirmations()

        const updatedAgreement = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        expect(updatedAgreement?.availableFunds.toString()).to.be.eql((new BigNumber(1e18)).toString())
      })
      it('should proceed funds payout', async () => {
        const agreementData = {
          provider: app.providerAddress,
          cid: generateCID(),
          period: offerData.periods[0],
          size: size,
          amount: 2000
        }
        await app.createAgreement(agreementData)
        await app.addConfirmations()

        await app.payoutFunds(agreementData.cid)
        await app.addConfirmations()

        const agreementAfter = await Agreement.findOne({ where: { offerId: app.providerAddress } })
        expect(agreementAfter?.availableFunds.toNumber()).to.be.eql(0)
      })
    })
    describe('Staking', () => {
      afterEach(async () => {
        await StakeModel.destroy({ where: {} })
      })
      it('should create new stake', async () => {
        const account = app.getRandomAccount()
        const amount = new BigNumber(1e18)

        await app.stake(amount, account)
        await app.addConfirmations()

        const stake = await StakeModel.findOne({ where: { account } })
        expect(stake).to.be.instanceOf(StakeModel)
        expect(stake?.total.toString()).to.be.eql(amount.toString())
        expect(stake?.account).to.be.eql(account)
        expect(stake?.symbol).to.be.eql('rbtc')
      })
      it('should be able to unstake', async () => {
        const account = app.getRandomAccount()
        const amount = 100

        await app.stake(amount, account)
        await app.addConfirmations()

        const stake = await StakeModel.findOne({ where: { account } })
        expect(stake?.total.toNumber()).to.be.eql(amount)

        await app.unstake(amount, account)
        await app.addConfirmations()

        const updatedStake = await StakeModel.findOne({ where: { account } })
        expect(updatedStake?.total.toNumber()).to.be.eql(0)
      })
      it('should be able to query total stake in USD', async () => {
        const client = getFeatherClient()
        const stakeService = client.service(ServiceAddresses.STORAGE_STAKES)

        const account = app.getRandomAccount()
        const amount = new BigNumber(1e18) // 1 rbtc

        await app.stake(amount, account)
        await app.addConfirmations()

        const rate = await Rate.findOne({ where: { token: 'rbtc' }, raw: true })
        const [stake] = await StakeModel.findAll({ where: { account }, raw: true })

        const totalStakedUSD = (new BigNumber(stake.total)).div(WEI).multipliedBy(rate?.usd as number).toString()
        const { totalStakedFiat, stakes } = await stakeService.get(account)
        expect(totalStakedUSD).to.be.eql(totalStakedFiat)
        expect(stakes.length).to.be.eql(1)
      })
      it('should return total staked fiat equal to 0.00 for empty account', async () => {
        const client = getFeatherClient()
        const stakeService = client.service(ServiceAddresses.STORAGE_STAKES)

        const account = app.getRandomAccount()
        const { totalStakedFiat, stakes } = await stakeService.get(account)
        const totalStakedUSD = '0.00'

        expect(totalStakedUSD).to.be.eql(totalStakedFiat)
        expect(stakes.length).to.be.eql(0)
      })
    })
    describe('Avg Billing Plan', () => {
      before(async () => {
        await BillingPlan.destroy({ where: {} })
        await Offer.destroy({ where: {} })

        const pricePerDayPerGb = WEI / 1024
        const offerData = {
          totalCapacity: 2000,
          periods: [86400, 604800],
          prices: [pricePerDayPerGb, 7 * pricePerDayPerGb],
          msg: encodedMessage
        }

        await app.createOffer(offerData)
        await app.addConfirmations()
      })
      afterEach(async () => {
        await BillingPlan.destroy({ where: {} })
        await Offer.destroy({ where: {} })
      })
      it('should be able to query avg billing price min/max values', async () => {
        const client = getFeatherClient()
        const avgBillingPlanService = client.service(ServiceAddresses.AVG_BILLING_PRICE)
        const { min, max } = await avgBillingPlanService.get(1)
        const rate = await Rate.findOne({ where: { token: 'rbtc' }, raw: true })
        expect(min).to.be.eql(Math.floor(rate?.usd as number))
        expect(max).to.be.eql(Math.floor(rate?.usd as number))
      })
    })
  })
})
