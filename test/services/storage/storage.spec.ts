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

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const mockEventsFactory = (event: Record<string, unknown> = {}): EventData => Object.assign({
  returnValues: { provider: 'ProviderAddress' },
  raw: { data: 'data', topics: [] },
  event: 'MessageEmitted',
  signature: 'Sig',
  logIndex: 2,
  transactionIndex: 2,
  transactionHash: 'TestTransactionHASH',
  blockHash: 'TestBlockHASH',
  blockNumber: 10,
  address: 'testADdress'
}, event) as EventData

describe('Storage services', function () {
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

      it('Should create new Offer if not existed', async () => {
        const event = mockEventsFactory()
        await processor(event)
        const createdEvent = await Offer.findOne({ where: { address: event.returnValues.provider } })

        expect(createdEvent).to.be.instanceOf(Offer)
        expect(offerServiceEmitSpy).to.have.been.calledWithMatch('created')
      })
      it('Should update existing Offer', async () => {
        const event = mockEventsFactory({
          event: 'TotalCapacitySet',
          returnValues: {
            provider: 'TestAddress',
            totalCapacity: 1000
          }
        })
        const eventFromDb = await Offer.create({ address: event.returnValues.provider })
        await processor(event)
        const updatedEventFromDB = await Offer.findOne({ where: { address: event.returnValues.provider } })

        expect(updatedEventFromDB?.updatedAt).to.be.gt(eventFromDb.updatedAt)
        expect(eventFromDb).to.be.instanceOf(Offer)
        expect(offerServiceEmitSpy).to.have.been.calledWithMatch('updated')
      })
      // it ('Should update capacity on "TotalCapacitySet" event', () => {})
      // it ('Should update prices on "BillingPlanSet" event', () => {})
    })
  })
})
