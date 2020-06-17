import { BlockHeader, Eth } from 'web3-eth'
import { Arg, Substitute } from '@fluffy-spoon/substitute'
import sinon from 'sinon'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
import util from 'util'
import sinonChai from 'sinon-chai'
import { Sequelize } from 'sequelize-typescript'
import { Contract, EventData } from 'web3-eth-contract'
import { EventEmitter } from 'events'

import {
  BaseEventsEmitter,
  EventsEmitterOptions,
  PollingEventsEmitter, REORG_EVENT_NAME, REORG_OUT_OF_RANGE_EVENT_NAME
} from '../../src/blockchain/events'
import { Logger } from '../../src/definitions'
import { loggingFactory } from '../../src/logger'
import { sequelizeFactory } from '../../src/sequelize'
import Event from '../../src/blockchain/event.model'
import { sleep, blockMock, eventMock } from '../utils'
import { NEW_BLOCK_EVENT_NAME } from '../../src/blockchain/new-block-emitters'
import { BlockTracker } from '../../src/blockchain/block-tracker'
import { AbiItem } from 'web3-utils'
import { Confirmator } from '../../src/blockchain/confirmator'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect
const setImmediatePromise = util.promisify(setImmediate)

const DATA_EVENT_NAME = 'newEvent'

/**
 * Dummy implementation for testing BaseEventsEmitter
 */
export class DummyEventsEmitter extends BaseEventsEmitter {
  constructor (eth: Eth, contract: Contract, events: string[], options?: EventsEmitterOptions, name?: string) {
    let logger: Logger

    if (!name) {
      logger = loggingFactory('blockchain:events:dummy')
    } else {
      logger = loggingFactory('blockchain:events:' + name)
    }

    super(eth, contract, events, logger, options)
  }

  async createEvent (data: EventData | EventData[]): Promise<void> {
    await this.semaphore.acquire()
    try {
      return this.processEvents(data)
    } finally {
      this.semaphore.release()
    }
  }

  startEvents (): void {
    // noop
  }

  stopEvents (): void {
    // noop
  }
}

describe('BaseEventsEmitter', () => {
  let sequelize: Sequelize

  before((): void => {
    sequelize = sequelizeFactory()
  })

  beforeEach(async () => {
    await sequelize.sync({ force: true })
  })

  it('should wait for previous processing finished', async function () {
    const events = [
      eventMock({ blockNumber: 4, transactionHash: '1', logIndex: 1 }),
      eventMock({ blockNumber: 8, transactionHash: '2', logIndex: 1 }),
      eventMock({ blockNumber: 9, transactionHash: '3', logIndex: 1 }),
      eventMock({ blockNumber: 10, transactionHash: '4', logIndex: 1 })
    ]

    const eth = Substitute.for<Eth>()
    eth.getBlockNumber().resolves(11)
    eth.getBlock('latest').resolves(blockMock(11))

    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(sleep(200, events))

    const blockTracker = new BlockTracker({})
    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const spy = sinon.spy()
    const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy) // Will start processingPastEvents() which will be delayed

    // Directly calling processEvents(), which should be blocked by the processingPastEvents()
    const createEventPromise = eventsEmitter.createEvent(events)
    await sleep(50)
    eth.received(1).getBlock('latest')
    eth.received(0).getBlockNumber()

    // After the processingEvents() is finished
    await createEventPromise
    eth.received(1).getBlock('latest')
    eth.received(1).getBlockNumber()
  })

  describe('with confirmations', () => {
    it('should process past events', async function () {
      const events = [
        eventMock({ blockHash: '0x123', blockNumber: 4, transactionHash: '1', logIndex: 1 }),
        eventMock({ blockHash: '0x125', blockNumber: 8, transactionHash: '2', logIndex: 1 }),
        eventMock({ blockHash: '0x123', blockNumber: 9, transactionHash: '3', logIndex: 1 }),
        eventMock({ blockHash: '0x123', blockNumber: 10, transactionHash: '4', logIndex: 1 })
      ]

      const eth = Substitute.for<Eth>()
      eth.getBlock('latest').resolves(blockMock(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve(events))

      const blockTracker = new BlockTracker({})
      const newBlockEmitter = new EventEmitter()
      const options: EventsEmitterOptions = { confirmations: 2, blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, spy)
      await sleep(100)

      expect(spy.callCount).to.be.eql(2, 'Expected two events emitted.')
      eth.received(1).getBlock('latest')
      contract.received(1).getPastEvents(Arg.all())
      expect(await Event.count()).to.eql(2)
      expect(blockTracker.getLastProcessedBlock()).to.eql([8, '0x125'])
      expect(blockTracker.getLastFetchedBlock()).to.eql([10, '0x123'])
    })

    it('should process new events', async function () {
      const contract = Substitute.for<Contract>()
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().resolves(10)

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(3, '') // Leads to no processPastEvents

      const newBlockEmitter = new EventEmitter()
      const options: EventsEmitterOptions = { confirmations: 2, blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, spy)

      const events = [
        eventMock({ blockNumber: 4, transactionHash: '1', logIndex: 1 }),
        eventMock({ blockNumber: 8, transactionHash: '2', logIndex: 1 }),
        eventMock({ blockNumber: 9, transactionHash: '3', logIndex: 1 }),
        eventMock({ blockNumber: 10, transactionHash: '4', logIndex: 1 })
      ]
      await eventsEmitter.createEvent(events)

      expect(await Event.count()).to.eql(2)
      expect(spy.callCount).to.be.eql(2, 'Expected two events emitted.')
      eth.received(1).getBlockNumber()
      contract.received(0).getPastEvents(Arg.all())
    })
  })

  describe('no confirmations', () => {
    it('should process past events', async function () {
      const testEvent = eventMock()
      const events = [
        testEvent,
        testEvent,
        testEvent
      ]

      const eth = Substitute.for<Eth>()
      eth.getBlock('latest').resolves(blockMock(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve(events))

      const blockTracker = new BlockTracker({})
      const newBlockEmitter = new EventEmitter()
      const options = { blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, spy)
      await sleep(100)

      expect(spy.callCount).to.be.eql(3, 'Expected three events emitted.')
      eth.received(1).getBlock('latest')
      contract.received(1).getPastEvents(Arg.all())
      expect(blockTracker.getLastFetchedBlock()).to.eql([10, '0x123'])
    })

    it('should emits new events', async function () {
      const contract = Substitute.for<Contract>()
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().resolves(10)

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(6, '') // Leads to no processPastEvents

      const newBlockEmitter = new EventEmitter()
      const options = { blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)

      const testEvent = eventMock()
      const events = [
        testEvent,
        testEvent,
        testEvent
      ]

      eventsEmitter.on(DATA_EVENT_NAME, spy)
      await eventsEmitter.createEvent(events)
      await sleep(100) // In order to processPastEvents() finish

      expect(spy.callCount).to.be.eql(3, 'Expected three events emitted.')
      expect(blockTracker.getLastFetchedBlock()).to.eql([6, ''])
      contract.received(0).getPastEvents(Arg.all())
      eth.received(1).getBlockNumber()
    })
  })
})

describe('PollingEventsEmitter', function () {
  let sequelize: Sequelize

  before((): void => {
    sequelize = sequelizeFactory()
  })

  beforeEach(async () => {
    await sequelize.sync({ force: true })
  })

  it('should emit new events', async function () {
    const eth = Substitute.for<Eth>()
    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(
      Promise.resolve([eventMock({ blockNumber: 11, event: 'testEvent', returnValues: { hey: 123 } })]), // Value for polling new events
      Promise.resolve([eventMock({ blockNumber: 12, event: 'testEvent', returnValues: { hey: 321 } })]) // Value for polling new events
    )

    const blockTracker = new BlockTracker({})
    blockTracker.setLastFetchedBlock(10, '0x123')

    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const newEventSpy = sinon.spy()
    const reorgSpy = sinon.spy()
    const reorgOutOfRangeSpy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, newEventSpy)
    eventsEmitter.on(REORG_EVENT_NAME, reorgSpy)
    eventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, reorgOutOfRangeSpy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(12))
    await sleep(100)

    contract.received(2).getPastEvents(Arg.all())
    expect(blockTracker.getLastFetchedBlock()).to.eql([12, '0x123'])
    expect(newEventSpy).to.have.callCount(2)
    expect(reorgSpy).to.have.callCount(0)
    expect(reorgOutOfRangeSpy).to.have.callCount(0)
  })

  it('should not emit empty events', async function () {
    const eth = Substitute.for<Eth>()
    eth.getBlock(10).resolves(blockMock(10))
    eth.getBlock(11).resolves(blockMock(11))

    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(
      Promise.resolve([eventMock({ blockNumber: 11, event: 'testEvent', returnValues: { hey: 123 } })]), // Value for polling new events
      Promise.resolve([]) // Value for polling new events
    )

    const blockTracker = new BlockTracker({})
    blockTracker.setLastFetchedBlock(10, '0x123')

    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const newEventSpy = sinon.spy()
    const reorgSpy = sinon.spy()
    const reorgOutOfRangeSpy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, newEventSpy)
    eventsEmitter.on(REORG_EVENT_NAME, reorgSpy)
    eventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, reorgOutOfRangeSpy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(12))
    await sleep(100)

    contract.received(2).getPastEvents(Arg.all())
    expect(blockTracker.getLastFetchedBlock()).to.eql([12, '0x123'])
    expect(newEventSpy).to.have.callCount(1)
    expect(reorgSpy).to.have.callCount(0)
    expect(reorgOutOfRangeSpy).to.have.callCount(0)
  })

  it('should ignore same blocks', async function () {
    const eth = Substitute.for<Eth>()
    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(
      Promise.resolve([eventMock({ blockNumber: 11 })]) // Value for polling new events
    )

    const blockTracker = new BlockTracker({})
    blockTracker.setLastFetchedBlock(10, '0x123')

    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const newEventSpy = sinon.spy()
    const reorgSpy = sinon.spy()
    const reorgOutOfRangeSpy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, newEventSpy)
    eventsEmitter.on(REORG_EVENT_NAME, reorgSpy)
    eventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, reorgOutOfRangeSpy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11)) // Testing if same block is ignored
    await sleep(100)

    contract.received(1).getPastEvents(Arg.all())
    expect(blockTracker.getLastFetchedBlock()).to.eql([11, '0x123'])
    expect(newEventSpy).to.have.callCount(1)
    expect(reorgSpy).to.have.callCount(0)
    expect(reorgOutOfRangeSpy).to.have.callCount(0)
  })

  it('should wait for previous processing finished', async function () {
    const events = [
      eventMock({ blockNumber: 4, transactionHash: '1', logIndex: 1 }),
      eventMock({ blockNumber: 8, transactionHash: '2', logIndex: 1 }),
      eventMock({ blockNumber: 9, transactionHash: '3', logIndex: 1 }),
      eventMock({ blockNumber: 10, transactionHash: '4', logIndex: 1 })
    ]

    const eth = Substitute.for<Eth>()
    eth.getBlockNumber().resolves(10)

    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(sleep(200, events), Promise.resolve(events))

    const blockTracker = new BlockTracker({})
    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const spy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy) // Will start processingPastEvents() which will be delayed

    // Directly calling processEvents(), which should be blocked by the processingPastEvents()
    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
    await sleep(50)
    contract.received(1).getPastEvents(Arg.all())

    // After the processingEvents() is finished
    await sleep(500)
    contract.received(2).getPastEvents(Arg.all())
  })

  describe('reorg handling', function () {
    it('should handle reorg without nothing processed yet', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(10).resolves(blockMock(10, '0x321')) // Different hash ==> reorg

      const events = [
        {
          contractAddress: '0x123',
          event: 'testEvent',
          blockNumber: 7,
          transactionHash: '1',
          targetConfirmation: 3,
          emitted: true,
          content: '{"event": "testEvent", "blockNumber": 7, "blockHash": "0x123"}'
        },
        {
          contractAddress: '0x123',
          event: 'testEvent',
          blockNumber: 8,
          transactionHash: '2',
          targetConfirmation: 4,
          emitted: false,
          content: '{"event": "testEvent", "blockNumber": 8, "blockHash": "0x123"}'
        },
        {
          contractAddress: '0x666',
          event: 'niceEvent',
          blockNumber: 9,
          transactionHash: '3',
          targetConfirmation: 2,
          emitted: false,
          content: '{"event": "niceEvent", "blockNumber": 9, "blockHash": "0x123"}'
        }
      ]
      await Event.bulkCreate(events)

      const contract = Substitute.for<Contract>()
      contract.options.returns!({ jsonInterface: [{}] as AbiItem[], address: '0x123' })
      contract.getPastEvents(Arg.all()).resolves(
        [eventMock({ blockNumber: 11, transactionHash: '1', logIndex: 1 })]
      )

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(10, '0x123')

      const newBlockEmitter = new EventEmitter()
      const options = { blockTracker, newBlockEmitter, confirmations: 1, confirmator: Substitute.for<Confirmator>() }
      const newEventSpy = sinon.spy()
      const reorgSpy = sinon.spy()
      const reorgOutOfRangeSpy = sinon.spy()
      const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, newEventSpy)
      eventsEmitter.on(REORG_EVENT_NAME, reorgSpy)
      eventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, reorgOutOfRangeSpy)
      await setImmediatePromise()

      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
      await sleep(200)

      contract.received(1).getPastEvents(Arg.all())
      eth.received(1).getBlock(Arg.all())
      expect(blockTracker.getLastFetchedBlock()).to.eql([11, '0x123'])
      expect(newEventSpy).to.have.callCount(0)
      expect(reorgSpy).to.have.callCount(1)
      expect(reorgOutOfRangeSpy).to.have.callCount(0)
      expect(await Event.count()).to.eql(2)
    })

    it('should handle reorg with already processed', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(10).resolves(blockMock(10, '0x321')) // Different hash ==> reorg
      eth.getBlock(8).resolves(blockMock(8, '0x222')) // Same hash ==> reorg in confirmation range

      const contract = Substitute.for<Contract>()
      contract.options.returns!({ jsonInterface: [{}] as AbiItem[], address: '0x123' })
      contract.getPastEvents(Arg.all()).resolves(
        [eventMock({ blockNumber: 11, transactionHash: '1', logIndex: 1 })]
      )

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(10, '0x123')
      blockTracker.setLastProcessedBlockIfHigher(8, '0x222')

      const newBlockEmitter = new EventEmitter()
      const options = { blockTracker, newBlockEmitter, confirmations: 1, confirmator: Substitute.for<Confirmator>() }
      const newEventSpy = sinon.spy()
      const reorgSpy = sinon.spy()
      const reorgOutOfRangeSpy = sinon.spy()
      const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, newEventSpy)
      eventsEmitter.on(REORG_EVENT_NAME, reorgSpy)
      eventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, reorgOutOfRangeSpy)
      await setImmediatePromise()

      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
      await sleep(200)

      contract.received(1).getPastEvents(Arg.all())
      eth.received(2).getBlock(Arg.all())
      expect(blockTracker.getLastFetchedBlock()).to.eql([11, '0x123'])
      expect(newEventSpy).to.have.callCount(0)
      expect(reorgSpy).to.have.callCount(1)
      expect(reorgOutOfRangeSpy).to.have.callCount(0)
      expect(await Event.count()).to.eql(1)
    })

    it('should handle reorg and detect reorg outside of confirmation range', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(10).resolves(blockMock(10, '0x321')) // Different hash ==> reorg
      eth.getBlock(8).resolves(blockMock(8, '0x33')) // Different hash ==> reorg OUTSIDE of confirmation range

      const contract = Substitute.for<Contract>()
      contract.options.returns!({ jsonInterface: [{}] as AbiItem[], address: '0x123' })
      contract.getPastEvents(Arg.all()).resolves(
        [eventMock({ blockNumber: 11, transactionHash: '1', logIndex: 1 })]
      )

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(10, '0x123')
      blockTracker.setLastProcessedBlockIfHigher(8, '0x222')

      const newBlockEmitter = new EventEmitter()
      const options = { blockTracker, newBlockEmitter, confirmations: 1, confirmator: Substitute.for<Confirmator>() }
      const newEventSpy = sinon.spy()
      const reorgSpy = sinon.spy()
      const reorgOutOfRangeSpy = sinon.spy()
      const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, newEventSpy)
      eventsEmitter.on(REORG_EVENT_NAME, reorgSpy)
      eventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, reorgOutOfRangeSpy)
      await setImmediatePromise()

      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
      await sleep(200)

      contract.received(1).getPastEvents(Arg.all())
      eth.received(2).getBlock(Arg.all())
      expect(blockTracker.getLastFetchedBlock()).to.eql([11, '0x123'])
      expect(newEventSpy).to.have.callCount(0)
      expect(reorgSpy).to.have.callCount(1)
      expect(reorgOutOfRangeSpy).to.have.callCount(1)
      expect(await Event.count()).to.eql(1)
    })
  })
})
