import BigNumber from 'bignumber.js'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import { asciiToHex, soliditySha3 } from 'web3-utils'
import Eth from 'web3-eth'
import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize'

import eventProcessor from '../../../../src/services/storage/processor'
import { StorageServices } from '../../../../src/services/storage'
import { AgreementService, OfferService, StakeService } from '../../../../src/services/storage/services'
import { sequelizeFactory } from '../../../../src/sequelize'
import Offer from '../../../../src/services/storage/models/offer.model'
import { blockMock, eventMock } from '../../../utils'
import { EventError } from '../../../../src/errors'
import BillingPlan from '../../../../src/services/storage/models/billing-plan.model'
import StakeModel from '../../../../src/services/storage/models/stake.model'
import Agreement from '../../../../src/services/storage/models/agreement.model'
import { decodeByteArray, wrapEvent } from '../../../../src/utils'
import { getBlockDate } from '../../../../src/blockchain/utils'
import { StakeEvents, StorageEvents, ZERO_ADDRESS } from '../../../../src/definitions'
import {
  AgreementFundsDeposited, AgreementFundsPayout, AgreementFundsWithdrawn,
  AgreementStopped,
  BillingPlanSet,
  MessageEmitted, NewAgreement,
  TotalCapacitySet
} from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/StorageManager'
import { Staked, Unstaked } from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/Staking'
import Rate from '../../../../src/rates/rates.model'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Storage services: Events Processor', () => {
  const provider = 'TestAddress'
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>

  before(() => {
    sequelize = sequelizeFactory()
    eth = Substitute.for<Eth>()
  })

  describe('Offer events', () => {
    let processor: (event: StorageEvents) => Promise<void>
    let offerService: OfferService
    let offerServiceEmitSpy: sinon.SinonSpy

    before(() => {
      offerService = new OfferService({ Model: Offer })
      processor = eventProcessor({ offerService } as StorageServices, { eth })
      offerServiceEmitSpy = sinon.spy()
      offerService.emit = offerServiceEmitSpy
    })
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      offerServiceEmitSpy.resetHistory()
    })

    it('should create new Offer if not existed', async () => {
      const event = eventMock<MessageEmitted>({
        event: 'MessageEmitted',
        returnValues: { provider }
      })
      await processor(event)
      const createdEvent = await Offer.findOne({ where: { provider: event.returnValues.provider } })

      expect(createdEvent).to.be.instanceOf(Offer)
      expect(offerServiceEmitSpy).to.have.been.calledOnceWith('created')
    })
    it('should update existed Offer', async () => {
      const event = eventMock<TotalCapacitySet>({
        event: 'TotalCapacitySet',
        returnValues: {
          capacity: 1000,
          provider: 'test'
        }
      })
      const eventFromDb = await Offer.create({ provider: event.returnValues.provider })
      expect(eventFromDb).to.be.instanceOf(Offer)

      await processor(event)

      expect(offerServiceEmitSpy).to.have.been.calledOnceWith('updated')
    })

    describe('TotalCapacitySet', () => {
      it('should update capacity', async () => {
        const event = eventMock<TotalCapacitySet>({
          event: 'TotalCapacitySet',
          returnValues: {
            capacity: 1000,
            provider
          }
        })

        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { provider: event.returnValues.provider } })

        expect(updatedEventFromDB?.totalCapacity).to.be.eql(new BigNumber(event.returnValues.capacity))
      })
    })

    describe('BillingPlanSet', () => {
      const token = ZERO_ADDRESS
      it('create new BillingPlan if not exist', async () => {
        const event = eventMock<BillingPlanSet>({
          event: 'BillingPlanSet',
          returnValues: {
            price: 1000,
            period: 69696,
            token,
            provider
          }
        })

        await processor(event)

        const billingPlan = await BillingPlan.findOne({ where: { offerId: provider } })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.createdAt).to.be.eql(billingPlan?.updatedAt) // new instance
        expect(billingPlan?.price).to.be.eql(new BigNumber(event.returnValues.price))
        expect(billingPlan?.tokenAddress).to.be.eql(event.returnValues.token)
        expect(billingPlan?.period).to.be.eql(new BigNumber(event.returnValues.period))
      })
      it('create new BillingPlan if has one with different period`', async () => {
        const billingEvent = eventMock<BillingPlanSet>({
          event: 'BillingPlanSet',
          returnValues: {
            price: 1000,
            period: 99,
            token,
            provider
          }
        })

        await processor(billingEvent)

        const billingPlan = await BillingPlan.findOne({
          where: {
            offerId: provider,
            period: '99',
            tokenAddress: token
          }
        })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.createdAt).to.be.eql(billingPlan?.updatedAt) // new instance
        expect(billingPlan?.price).to.be.eql(new BigNumber(billingEvent.returnValues.price))
        expect(billingPlan?.tokenAddress).to.be.eql(billingEvent.returnValues.token)
        expect(billingPlan?.period).to.be.eql(new BigNumber(billingEvent.returnValues.period))
      })
      it('update BillingPlan', async () => {
        const newPrice = 99999
        const billingEvent = eventMock<BillingPlanSet>({
          event: 'BillingPlanSet',
          returnValues: {
            price: newPrice,
            period: 99,
            token,
            provider
          }
        })

        // Create new offer and billing plan
        const offer = await Offer.create({ provider })
        const billing = await BillingPlan.create({
          offerId: offer.provider,
          period: 99,
          price: 1,
          tokenAddress: token,
          rateId: 'rbtc'
        })
        expect(offer).to.be.instanceOf(Offer)
        expect(billing?.price).to.be.eql(new BigNumber(1))
        expect(billing?.tokenAddress).to.be.eql(token)
        expect(billing).to.be.instanceOf(BillingPlan)

        await processor(billingEvent)

        const billingPlan = await BillingPlan.findOne({ where: { offerId: offer.provider, period: '99' } })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.updatedAt).to.be.gt(billingPlan?.createdAt)
        expect(billingPlan?.price).to.be.eql(new BigNumber(newPrice))
        expect(billingPlan?.tokenAddress).to.be.eql(token)
        expect(billingPlan?.period).to.be.eql(new BigNumber(billingEvent.returnValues.period))
      })
      it('should remove billing plan on price 0', async () => {
        const billingEvent = eventMock<BillingPlanSet>({
          event: 'BillingPlanSet',
          returnValues: {
            price: 0, // should remove billing plan on 0 price
            period: 99,
            token,
            provider
          }
        })

        // Create new offer and billing plan
        const offer = await Offer.create({ provider })
        const billing = await BillingPlan.create({
          offerId: offer.provider,
          period: 99,
          price: 1,
          tokenAddress: token,
          rateId: 'rbtc'
        })
        expect(offer).to.be.instanceOf(Offer)
        expect(billing?.price).to.be.eql(new BigNumber(1))
        expect(billing?.tokenAddress).to.be.eql(token)
        expect(billing).to.be.instanceOf(BillingPlan)

        await processor(billingEvent)

        const billingPlan = await BillingPlan.findOne({
          where: {
            offerId: offer.provider,
            period: '99',
            tokenAddress: token
          }
        })
        expect(billingPlan).to.be.null()
      })
    })

    describe('MessageEmitted', () => {
      it('should not update Offer if message is empty', async () => {
        const event = eventMock<MessageEmitted>({
          event: 'MessageEmitted',
          returnValues: {
            message: [],
            provider
          }
        })

        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { provider: event.returnValues.provider } })

        expect(updatedEventFromDB?.peerId).to.be.eql(null)
      })
      it('should throw error on unknown message flag', async () => {
        const testPeerId = 'FakePeerId'
        const testPeerIdHex = asciiToHex(testPeerId, 32).replace('0x', '')
        const unknownId = '02'
        const event = eventMock<MessageEmitted>({
          event: 'MessageEmitted',
          returnValues: {
            message: [`0x${unknownId}${testPeerIdHex}`],
            provider
          }
        })

        await expect(processor(event)).to.eventually.be.rejectedWith(
          EventError,
          `During processing event MessageEmitted: Unknown message flag ${unknownId}!`
        )
      })
      it('should update `peerId`', async () => {
        const testPeerId = 'FakePeerId'
        const testPeerIdHex = asciiToHex(testPeerId, 32).replace('0x', '')
        const nodeIdFlag = '01'
        const message = `0x${nodeIdFlag}${testPeerIdHex}`
        const event = eventMock<MessageEmitted>({
          event: 'MessageEmitted',
          returnValues: {
            message: [message],
            provider
          }
        })

        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { provider: event.returnValues.provider } })

        expect(updatedEventFromDB?.peerId).to.be.eql(testPeerId)
      })
    })
  })

  describe('Agreements events', () => {
    let processor: (event: StorageEvents) => Promise<void>
    let agreementService: AgreementService
    let agreementServiceEmitSpy: sinon.SinonSpy
    let offer: Offer
    let plan: BillingPlan
    let agreementData: Record<string, unknown>
    const token = '0x0000'
    const billingPeriod = 99
    const size = 100
    const availableFunds = 100
    const agreementCreator = asciiToHex('AgreementCreator')
    const dataReference = ['Reference1', 'Reference2'].map(asciiToHex)
    const agreementReference = soliditySha3(agreementCreator, ...dataReference, token)
    const blockNumber = 13

    function agreementNotExistTest (event: StorageEvents): Mocha.Test {
      return it('should throw error if agreement not exist', async () => {
        await expect(processor(event)).to.eventually.be.rejectedWith(
          EventError,
          `Agreement with ID ${agreementReference} was not found!`
        )
      })
    }

    before(async () => {
      agreementService = new AgreementService({ Model: Agreement })
      processor = eventProcessor({ agreementService } as StorageServices, { eth })
      agreementServiceEmitSpy = sinon.spy()
      agreementService.emit = agreementServiceEmitSpy
      const mockedBlock = blockMock(blockNumber, '0x0111', { timestamp: (new Date()).getTime() })
      eth.getBlock(blockNumber).resolves(mockedBlock)

      agreementData = {
        agreementReference,
        dataReference: decodeByteArray(dataReference),
        consumer: agreementCreator,
        offerId: provider,
        size,
        tokenAddress: token,
        billingPeriod,
        billingPrice: 100,
        availableFunds,
        lastPayout: await getBlockDate(eth, blockNumber)
      }
    })
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      agreementServiceEmitSpy.resetHistory()
      offer = await Offer.create({ provider })
      plan = await BillingPlan.create({
        offerId: offer.provider,
        price: 100,
        period: billingPeriod,
        tokenAddress: token,
        rateId: 'rbtc'
      })
      expect(offer).to.be.instanceOf(Offer)
      expect(plan).to.be.instanceOf(BillingPlan)
    })

    describe('NewAgreement', () => {
      const event = eventMock<NewAgreement>({
        event: 'NewAgreement',
        blockNumber,
        returnValues: {
          billingPeriod,
          agreementCreator,
          dataReference,
          size,
          availableFunds,
          provider,
          token
        }
      })

      it('should throw error if billing plan not exist', async () => {
        await expect(BillingPlan.destroy({
          where: {
            offerId: provider,
            period: billingPeriod.toString(),
            tokenAddress: token
          }
        })).to.eventually.become(1)
        await expect(processor(event)).to.eventually.be.rejectedWith(
          EventError,
          `Price for period ${event.returnValues.billingPeriod.toString()}, token ${token} and offer ${provider} not found when creating new request ${agreementReference}`
        )
      })
      it('should create/overwrite new agreement', async () => {
        await processor(event)

        const agreement = await Agreement.findOne({
          where: {
            agreementReference
          }
        })
        expect(agreement).to.be.instanceOf(Agreement)
        expect(agreement?.agreementReference).to.be.eql(agreementReference)
        expect(agreement?.dataReference).to.be.eql(decodeByteArray(event.returnValues.dataReference))
        expect(agreement?.consumer).to.be.eql(event.returnValues.agreementCreator)
        expect(agreement?.offerId).to.be.eql(provider)
        expect(agreement?.size).to.be.eql(new BigNumber(event.returnValues.size))
        expect(agreement?.billingPeriod).to.be.eql(new BigNumber(event.returnValues.billingPeriod))
        expect(agreement?.billingPrice).to.be.eql(new BigNumber(plan.price))
        expect(agreement?.availableFunds).to.be.eql(new BigNumber(event.returnValues.availableFunds))
        expect(agreement?.tokenAddress).to.be.eql(token)
        expect(agreement?.lastPayout).to.be.eql(await getBlockDate(eth, event.blockNumber))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('created')
      })
    })

    describe('AgreementStopped', () => {
      const event = eventMock<AgreementStopped>({
        event: 'AgreementStopped',
        blockNumber: 13,
        returnValues: {
          agreementReference,
          provider
        }
      })

      agreementNotExistTest(event)
      it('should make agreement inActive', async () => {
        // Create Agreement
        const agreement = await Agreement.create(agreementData)
        expect(agreement).to.be.instanceOf(Agreement)
        expect(agreement?.isActive).to.be.eql(true)

        await processor(event)

        const agreementAfterUpdate = await Agreement.findOne({
          where: {
            agreementReference
          }
        })

        expect(agreementAfterUpdate?.isActive).to.be.eql(false)
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementStopped', agreementAfterUpdate?.toJSON() as Record<string, unknown>))
      })
    })

    describe('AgreementFundsDeposited', () => {
      const event = eventMock<AgreementFundsDeposited>({
        event: 'AgreementFundsDeposited',
        blockNumber: 13,
        returnValues: {
          agreementReference,
          amount: 50,
          provider
        }
      })

      agreementNotExistTest(event)
      it('should proceed deposit funds', async () => {
        // Create Agreement
        const agreement = await Agreement.create(agreementData)
        expect(agreement).to.be.instanceOf(Agreement)

        await processor(event)

        const agreementAfterUpdate = await Agreement.findOne({
          where: {
            agreementReference
          }
        })

        expect(agreementAfterUpdate?.availableFunds).to.be.eql(agreement.availableFunds.plus(event.returnValues.amount))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementFundsDeposited', agreementAfterUpdate?.toJSON() as Record<string, unknown>))
      })
    })

    describe('AgreementFundsWithdrawn', () => {
      const event = eventMock<AgreementFundsWithdrawn>({
        event: 'AgreementFundsWithdrawn',
        blockNumber: 13,
        returnValues: {
          agreementReference,
          amount: 50,
          provider
        }
      })

      agreementNotExistTest(event)
      it('should proceed withdrawal funds', async () => {
        // Create Agreement
        const agreement = await Agreement.create(agreementData)
        expect(agreement).to.be.instanceOf(Agreement)

        await processor(event)

        const agreementAfterUpdate = await Agreement.findOne({
          where: {
            agreementReference
          }
        })

        expect(agreementAfterUpdate?.availableFunds).to.be.eql(agreement.availableFunds.minus(event.returnValues.amount))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementFundsWithdrawn', agreementAfterUpdate?.toJSON() as Record<string, unknown>))
      })
    })

    describe('AgreementFundsPayout', () => {
      const event = eventMock<AgreementFundsPayout>({
        event: 'AgreementFundsPayout',
        blockNumber: 13,
        returnValues: {
          agreementReference,
          amount: 50,
          provider
        }
      })

      agreementNotExistTest(event)
      it('should proceed funds payout', async () => {
        const mockedBlock = blockMock(blockNumber + 1, '0x0111', { timestamp: (new Date()).getTime() })
        eth.getBlock(blockNumber + 1).resolves(mockedBlock)

        // Create Agreement
        const agreement = await Agreement.create(agreementData)
        expect(agreement).to.be.instanceOf(Agreement)

        await processor(event)

        const agreementAfterUpdate = await Agreement.findOne({
          where: {
            agreementReference
          }
        })

        expect(agreementAfterUpdate?.availableFunds).to.be.eql(agreement.availableFunds.minus(event.returnValues.amount))
        expect(agreementAfterUpdate?.lastPayout).to.be.eql(await getBlockDate(eth, blockNumber))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementFundsPayout', agreementAfterUpdate?.toJSON() as Record<string, unknown>))
      })
    })
  })

  describe('Staking events', () => {
    const token = ZERO_ADDRESS
    const account = provider.toLowerCase()
    let processor: (event: StakeEvents) => Promise<void>
    let stakeService: StakeService
    let stakeServiceEmitSpy: sinon.SinonSpy

    before(() => {
      stakeService = new StakeService({ Model: StakeModel })
      processor = eventProcessor({ stakeService } as StorageServices, { eth })
      stakeServiceEmitSpy = sinon.spy()
      stakeService.emit = stakeServiceEmitSpy
    })

    beforeEach(async () => {
      await sequelize.sync({ force: true })
      stakeServiceEmitSpy.resetHistory()
    })

    it('should create new Stake if not existed', async () => {
      const total = 1000
      const event = eventMock<Staked>({
        event: 'Staked',
        returnValues: { user: account, total, token, amount: 1000 }
      })
      await processor(event)
      const createdStake = await StakeModel.findOne({ where: { token, account } })

      expect(createdStake).to.be.instanceOf(StakeModel)
      expect(createdStake?.account).to.be.eql(account)
      expect(createdStake?.token).to.be.eql(token)
      expect(createdStake?.symbol).to.be.eql('rbtc')
      expect(stakeServiceEmitSpy).to.have.been.calledWith('updated')
    })

    describe('Staked', () => {
      it('should update stake', async () => {
        const amount = new BigNumber(1e18).toString()
        const total = amount
        const event = eventMock<Staked>({
          event: 'Staked',
          returnValues: {
            amount,
            total,
            user: account,
            token
          }
        })
        await Rate.create({ token: 'rbtc', usd: 1000 })

        await processor(event)
        const updatedStake = await StakeModel.findOne({ where: { token, account } })
        expect(updatedStake?.total).to.be.eql(new BigNumber(event.returnValues.total))
        expect(stakeServiceEmitSpy).to.have.been.calledWith('updated', { stakes: await StakeModel.findAll({ where: { account } }), totalStakedFiat: '1000.00' })
      })
    })
    describe('Unstaked', () => {
      it('should update total', async () => {
        const total = 0
        const amount = new BigNumber(1e18)
        const event = eventMock<Unstaked>({
          event: 'Unstaked',
          returnValues: {
            amount,
            total,
            user: account,
            token
          }
        })
        await Rate.create({ token: 'rbtc', usd: 1000 })
        await StakeModel.create({ token, total: amount, account })

        await processor(event)
        const updatedStake = await StakeModel.findOne({ where: { token, account } })

        expect(stakeServiceEmitSpy).to.have.been.calledWith('updated', { stakes: await StakeModel.findAll({ where: { account } }), totalStakedFiat: '0.00' })
        expect(updatedStake?.total).to.be.eql(new BigNumber(event.returnValues.total))
      })
      it('should throw if unstake without stake', async () => {
        const total = 0
        const amount = 1000
        const event = eventMock<Unstaked>({
          event: 'Unstaked',
          returnValues: {
            amount,
            total,
            user: account,
            token
          }
        })

        await expect(processor(event)).to.be.eventually.rejectedWith(
          Error,
          `Stake for account ${account}, token ${token} not exist`
        )
      })
    })
  })
})
