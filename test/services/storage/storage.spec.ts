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

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Storage services', function () {
  const provider = 'TestAddress'
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>

  before(() => {
    sequelize = sequelizeFactory()
  })
  describe('Events Processor', () => {
    describe('Offer events', () => {
      let processor: (event: EventData) => Promise<void>
      let offerService: OfferService
      let offerServiceEmitSpy: sinon.SinonSpy

      before(() => {
        offerService = new OfferService({ Model: Offer })
        processor = eventProcessor({ offerService } as StorageServices, eth)
      })
      beforeEach(async () => {
        await sequelize.sync({ force: true })
        offerServiceEmitSpy = sinon.spy()
        offerService.emit = offerServiceEmitSpy
      })

      it('should create new Offer if not existed', async () => {
        const event = eventMock({
          event: 'MessageEmitted',
          returnValues: { provider }
        })
        await processor(event)
        const createdEvent = await Offer.findOne({ where: { address: event.returnValues.provider } })

        expect(createdEvent).to.be.instanceOf(Offer)
        expect(offerServiceEmitSpy).to.have.been.calledWithMatch('created')
      })
      it('should update existed Offer', async () => {
        const event = eventMock({
          event: 'TotalCapacitySet',
          returnValues: {
            capacity: 1000,
            provider
          }
        })
        const eventFromDb = await Offer.create({ address: event.returnValues.provider })
        expect(eventFromDb).to.be.instanceOf(Offer)

        await processor(event)

        expect(offerServiceEmitSpy).to.have.been.calledWithMatch('updated')
      })
      it('should update capacity on `TotalCapacitySet`', async () => {
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
      it('should not update Offer on `MessageEmitted` with empty message', async () => {
        const event = eventMock({
          event: 'MessageEmitted',
          returnValues: {
            message: '',
            provider
          }
        })

        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { address: event.returnValues.provider } })

        expect(updatedEventFromDB?.peerId).to.be.eql(null)
      })
      it('should update `peerId` on "MessageEmitted" event', async () => {
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
      it('should throw error on unknown message flag of "MessageEmitted" event', async () => {
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

        await expect(processor(event)).to.eventually.be.rejectedWith(EventError, `During processing event MessageEmitted: Unknown message flag ${unknownId}!`)
      })
    })
  })
})
