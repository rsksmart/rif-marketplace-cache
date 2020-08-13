import BigNumber from 'bignumber.js'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import { EventData } from 'web3-eth-contract'
import { asciiToHex, soliditySha3 } from 'web3-utils'
import Eth from 'web3-eth'
import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize-typescript'

import eventProcessor from '../../../src/services/storage/storage.processor'
import { AgreementService, OfferService, StorageServices } from '../../../src/services/storage'
import { sequelizeFactory } from '../../../src/sequelize'
import Offer from '../../../src/services/storage/models/offer.model'
import { blockMock, eventMock } from '../../utils'
import { EventError } from '../../../src/errors'
import BillingPlan from '../../../src/services/storage/models/price.model'
import Agreement from '../../../src/services/storage/models/agreement.model'
import { decodeByteArray, wrapEvent } from '../../../src/utils'
import { getBlockDate } from '../../../src/blockchain/utils'

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
    let processor: (event: EventData) => Promise<void>
    let offerService: OfferService
    let offerServiceEmitSpy: sinon.SinonSpy

    before(() => {
      offerService = new OfferService({ Model: Offer })
      processor = eventProcessor({ offerService } as StorageServices, eth)
      offerServiceEmitSpy = sinon.spy()
      offerService.emit = offerServiceEmitSpy
    })
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      offerServiceEmitSpy.resetHistory()
    })

    it('should create new Offer if not existed', async () => {
      const event = eventMock({
        event: 'MessageEmitted',
        returnValues: { provider }
      })
      await processor(event)
      const createdEvent = await Offer.findOne({ where: { address: event.returnValues.provider } })

      expect(createdEvent).to.be.instanceOf(Offer)
      expect(offerServiceEmitSpy).to.have.been.calledOnceWith('created')
    })
    it('should update existed Offer', async () => {
      const event = eventMock({
        event: 'TotalCapacitySet',
        returnValues: {
          capacity: 1000,
          provider: 'test'
        }
      })
      const eventFromDb = await Offer.create({ address: event.returnValues.provider })
      expect(eventFromDb).to.be.instanceOf(Offer)

      await processor(event)

      expect(offerServiceEmitSpy).to.have.been.calledOnceWith('updated')
    })
    describe('TotalCapacitySet', () => {
      it('should update capacity', async () => {
        const event = eventMock({
          event: 'TotalCapacitySet',
          returnValues: {
            capacity: 1000,
            provider
          }
        })

        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { address: event.returnValues.provider } })

        expect(updatedEventFromDB?.totalCapacity).to.be.eql(new BigNumber(event.returnValues.capacity))
      })
    })
    describe('BillingPlanSet', () => {
      const billingEvent: EventData = eventMock({
        event: 'BillingPlanSet',
        returnValues: {
          price: 1000,
          period: 99,
          provider
        }
      })
      it('create new BillingPlan if not exist', async () => {
        const event = eventMock({
          event: 'BillingPlanSet',
          returnValues: {
            price: 1000,
            period: 69696,
            provider
          }
        })

        await processor(event)

        const billingPlan = await BillingPlan.findOne({ where: { offerId: provider } })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.createdAt).to.be.eql(billingPlan?.updatedAt) // new instance
        expect(billingPlan?.amount).to.be.eql(new BigNumber(event.returnValues.price))
        expect(billingPlan?.period).to.be.eql(new BigNumber(event.returnValues.period))
      })
      it('create new BillingPlan if has one with different period`', async () => {
        await processor(billingEvent)

        const billingPlan = await BillingPlan.findOne({ where: { offerId: provider, period: '99' } })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.createdAt).to.be.eql(billingPlan?.updatedAt) // new instance
        expect(billingPlan?.amount).to.be.eql(new BigNumber(billingEvent.returnValues.price))
        expect(billingPlan?.period).to.be.eql(new BigNumber(billingEvent.returnValues.period))
      })
      it('update BillingPlan', async () => {
        // Create new offer and billing plan
        const offer = await Offer.create({ address: provider })
        const billing = await BillingPlan.create({ offerId: offer.address, period: 99, amount: 1 })
        expect(offer).to.be.instanceOf(Offer)
        expect(billing?.amount).to.be.eql(new BigNumber(1))
        expect(billing).to.be.instanceOf(BillingPlan)

        const newPrice = 99999
        billingEvent.returnValues.price = newPrice

        await processor(billingEvent)

        const billingPlan = await BillingPlan.findOne({ where: { offerId: offer.address, period: '99' } })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.updatedAt).to.be.gt(billingPlan?.createdAt)
        expect(billingPlan?.amount).to.be.eql(new BigNumber(newPrice))
        expect(billingPlan?.period).to.be.eql(new BigNumber(billingEvent.returnValues.period))
      })
    })
    describe('MessageEmitted', () => {
      it('should not update Offer if message is empty', async () => {
        const event = eventMock({
          event: 'MessageEmitted',
          returnValues: {
            message: [],
            provider
          }
        })

        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { address: event.returnValues.provider } })

        expect(updatedEventFromDB?.peerId).to.be.eql(null)
      })
      it('should throw error on unknown message flag', async () => {
        const testPeerId = 'FakePeerId'
        const testPeerIdHex = asciiToHex(testPeerId, 32).replace('0x', '')
        const unknownId = '02'
        const event = eventMock({
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
        const event = eventMock({
          event: 'MessageEmitted',
          returnValues: {
            message: [message],
            provider
          }
        })

        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { address: event.returnValues.provider } })

        expect(updatedEventFromDB?.peerId).to.be.eql(testPeerId)
      })
    })
  })
  describe('Agreements events', () => {
    let processor: (event: EventData) => Promise<void>
    let agreementService: AgreementService
    let agreementServiceEmitSpy: sinon.SinonSpy
    let offer: Offer
    let plan: BillingPlan
    let agreementData: object
    const billingPeriod = 99
    const size = 100
    const availableFunds = 100
    const agreementCreator = asciiToHex('AgreementCreator')
    const dataReference = ['Reference1', 'Reference2'].map(asciiToHex)
    const agreementReference = soliditySha3(agreementCreator, ...dataReference)
    const blockNumber = 13
    const agreementNotExistTest = (event: EventData): Mocha.Test => it('should throw error if agreement not exist', async () => {
      await expect(processor(event)).to.eventually.be.rejectedWith(
        EventError,
        `Agreement with ID ${agreementReference} was not found!`
      )
    })

    before(async () => {
      agreementService = new AgreementService({ Model: Agreement })
      processor = eventProcessor({ agreementService } as StorageServices, eth)
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
        billingPeriod,
        billingPrice: 100,
        availableFunds,
        lastPayout: await getBlockDate(eth, blockNumber)
      }
    })
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      agreementServiceEmitSpy.resetHistory()
      offer = await Offer.create({ address: provider })
      plan = await BillingPlan.create({ offerId: offer.address, amount: 100, period: billingPeriod })
      expect(offer).to.be.instanceOf(Offer)
      expect(plan).to.be.instanceOf(BillingPlan)
    })

    describe('NewAgreement', () => {
      const event = eventMock({
        event: 'NewAgreement',
        blockNumber,
        returnValues: {
          billingPeriod,
          agreementCreator,
          dataReference,
          size,
          availableFunds,
          provider
        }
      })

      it('should throw error if billing plan not exist', async () => {
        await expect(BillingPlan.destroy({ where: { offerId: provider, period: billingPeriod.toString() } })).to.eventually.become(1)
        await expect(processor(event)).to.eventually.be.rejectedWith(
          EventError,
          `Price for period ${event.returnValues.billingPeriod.toString()} and offer ${provider} not found when creating new request ${agreementReference}`
        )
      })
      it('should create/overwrite new agreement', async () => {
        await processor(event)

        const agreement = await Agreement.findOne({ where: { agreementReference, offerId: event.returnValues.provider } })
        expect(agreement).to.be.instanceOf(Agreement)
        expect(agreement?.agreementReference).to.be.eql(agreementReference)
        expect(agreement?.dataReference).to.be.eql(decodeByteArray(event.returnValues.dataReference))
        expect(agreement?.consumer).to.be.eql(event.returnValues.agreementCreator)
        expect(agreement?.offerId).to.be.eql(provider)
        expect(agreement?.size).to.be.eql(new BigNumber(event.returnValues.size))
        expect(agreement?.billingPeriod).to.be.eql(new BigNumber(event.returnValues.billingPeriod))
        expect(agreement?.billingPrice).to.be.eql(new BigNumber(plan.amount))
        expect(agreement?.availableFunds).to.be.eql(new BigNumber(event.returnValues.availableFunds))
        expect(agreement?.lastPayout).to.be.eql(await getBlockDate(eth, event.blockNumber))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('created')
      })
    })
    describe('AgreementStopped', () => {
      const event = eventMock({
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

        const agreementAfterUpdate = await Agreement.findOne({ where: { agreementReference, offerId: event.returnValues.provider } })

        expect(agreementAfterUpdate?.isActive).to.be.eql(false)
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementStopped', agreementAfterUpdate?.toJSON() as object))
      })
    })
    describe('AgreementFundsDeposited', () => {
      const event = eventMock({
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

        const agreementAfterUpdate = await Agreement.findOne({ where: { agreementReference, offerId: event.returnValues.provider } })

        expect(agreementAfterUpdate?.availableFunds).to.be.eql(agreement.availableFunds.plus(event.returnValues.amount))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementFundsDeposited', agreementAfterUpdate?.toJSON() as object))
      })
    })
    describe('AgreementFundsWithdrawn', () => {
      const event = eventMock({
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

        const agreementAfterUpdate = await Agreement.findOne({ where: { agreementReference, offerId: event.returnValues.provider } })

        expect(agreementAfterUpdate?.availableFunds).to.be.eql(agreement.availableFunds.minus(event.returnValues.amount))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementFundsWithdrawn', agreementAfterUpdate?.toJSON() as object))
      })
    })
    describe('AgreementFundsPayout', () => {
      const event = eventMock({
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

        const agreementAfterUpdate = await Agreement.findOne({ where: { agreementReference, offerId: event.returnValues.provider } })

        expect(agreementAfterUpdate?.availableFunds).to.be.eql(agreement.availableFunds.minus(event.returnValues.amount))
        expect(agreementAfterUpdate?.lastPayout).to.be.eql(await getBlockDate(eth, blockNumber))
        expect(agreementServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('AgreementFundsPayout', agreementAfterUpdate?.toJSON() as object))
      })
    })
  })
})
