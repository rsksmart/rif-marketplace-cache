import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import { EventData } from 'web3-eth-contract'
import Eth from 'web3-eth'
import { SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize-typescript'

import eventProcessor from '../../../src/services/storage/storage.processor'
import { OfferService, StorageServices } from '../../../src/services/storage'
import { sequelizeFactory } from '../../../src/sequelize'
import Offer from '../../../src/services/storage/models/offer.model'
import { eventMock } from '../../utils'

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
        offerServiceEmitSpy = sinon.spy()
        offerService.emit = offerServiceEmitSpy
        processor = eventProcessor({ offerService } as StorageServices, eth)
      })
      beforeEach(async () => {
        await sequelize.sync({ force: true })
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
      it('should update existing Offer', async () => {
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
        expect(offerServiceEmitSpy).to.have.been.calledWithMatch('updated')
      })
      // it ('Should update capacity on "TotalCapacitySet" event', () => {})
      // it ('Should update prices on "BillingPlanSet" event', () => {})
    })
  })
})
