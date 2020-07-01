import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import { EventData } from 'web3-eth-contract'
import { asciiToHex } from 'web3-utils'
import Eth from 'web3-eth'
import { SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize-typescript'

import eventProcessor from '../../../src/services/storage/storage.processor'
import { OfferService, StorageServices } from '../../../src/services/storage'
import { sequelizeFactory } from '../../../src/sequelize'
import Offer from '../../../src/services/storage/models/offer.model'
import { eventMock } from '../../utils'
import { EventError } from '../../../src/errors'
import BillingPlan from '../../../src/services/storage/models/price.model'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Storage services: Events Processor', function () {
  const provider = 'TestAddress'
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>

  before(() => {
    sequelize = sequelizeFactory()
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

        expect(updatedEventFromDB?.totalCapacity).to.be.eql(event.returnValues.capacity)
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
        expect(billingPlan?.amount).to.be.eql(event.returnValues.price)
        expect(billingPlan?.period).to.be.eql(event.returnValues.period)
      })
      it('create new BillingPlan if has one with different period`', async () => {
        await processor(billingEvent)

        const billingPlan = await BillingPlan.findOne({ where: { offerId: provider, period: 99 } })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.createdAt).to.be.eql(billingPlan?.updatedAt) // new instance
        expect(billingPlan?.amount).to.be.eql(billingEvent.returnValues.price)
        expect(billingPlan?.period).to.be.eql(billingEvent.returnValues.period)
      })
      it('update BillingPlan', async () => {
        // Create new offer and billing plan
        const offer = await Offer.create({ address: provider })
        const billing = await BillingPlan.create({ offerId: offer.address, period: 99, amount: 1 })
        expect(offer).to.be.instanceOf(Offer)
        expect(billing?.amount).to.be.eql(1)
        expect(billing).to.be.instanceOf(BillingPlan)

        const newPrice = 99999
        billingEvent.returnValues.price = newPrice

        await processor(billingEvent)

        const billingPlan = await BillingPlan.findOne({ where: { offerId: offer.address, period: 99 } })

        expect(billingPlan).to.be.instanceOf(BillingPlan)
        expect(billingPlan?.updatedAt).to.be.gt(billingPlan?.createdAt)
        expect(billingPlan?.amount).to.be.eql(newPrice)
        expect(billingPlan?.period).to.be.eql(billingEvent.returnValues.period)
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
})
