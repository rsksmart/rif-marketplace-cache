import { Eth } from 'web3-eth'
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
  BlockTracker, BlockTrackerStore,
  EventsEmitterOptions,
  PollingEventsEmitter
} from '../../src/blockchain/events'
import { Logger } from '../../src/definitions'
import { loggingFactory } from '../../src/logger'
import { sequelizeFactory } from '../../src/sequelize'
import Event from '../../src/blockchain/event.model'
import { sleep, blockMock, eventMock } from '../utils'
import { NEW_BLOCK_EVENT_NAME } from '../../src/blockchain/new-block-emitters'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect
const setImmediatePromise = util.promisify(setImmediate)

const DATA_EVENT_NAME = 'newEvent'
const STORE_LAST_FETCHED_BLOCK_NUMBER_KEY = 'lastFetchedBlockNumber'
const STORE_LAST_FETCHED_BLOCK_HASH_KEY = 'lastFetchedBlockHash'
const STORE_LAST_PROCESSED_BLOCK_NUMBER_KEY = 'lastProcessedBlockNumber'
const STORE_LAST_PROCESSED_BLOCK_HASH_KEY = 'lastProcessedBlockHash'

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

describe('BlockTracker', () => {
  it('read initial block from store', function () {
    const store = {
      [STORE_LAST_FETCHED_BLOCK_HASH_KEY]: '0x123',
      [STORE_LAST_FETCHED_BLOCK_NUMBER_KEY]: 10,
      [STORE_LAST_PROCESSED_BLOCK_HASH_KEY]: '0x321',
      [STORE_LAST_PROCESSED_BLOCK_NUMBER_KEY]: 8
    }
    const bt = new BlockTracker(store)
    expect(bt.getLastFetchedBlock()).to.eql([10, '0x123'])
    expect(bt.getLastProcessedBlock()).to.eql([8, '0x321'])
  })

  it('should save last fetched block', function () {
    const store = {} as BlockTrackerStore
    const bt = new BlockTracker(store)

    expect(bt.getLastFetchedBlock()).to.be.eql([undefined, undefined])
    expect(store[STORE_LAST_FETCHED_BLOCK_NUMBER_KEY]).to.be.undefined()
    expect(store[STORE_LAST_FETCHED_BLOCK_HASH_KEY]).to.be.undefined()

    bt.setLastFetchedBlock(9, '0x123')
    expect(bt.getLastFetchedBlock()).to.eql([9, '0x123'])
    expect(store[STORE_LAST_FETCHED_BLOCK_NUMBER_KEY]).to.eql(9)
    expect(store[STORE_LAST_FETCHED_BLOCK_HASH_KEY]).to.eql('0x123')
  })

  it('should save last processed block only if higher', function () {
    const store = {} as BlockTrackerStore
    const bt = new BlockTracker(store)

    expect(bt.getLastProcessedBlock()).to.be.eql([undefined, undefined])
    expect(store[STORE_LAST_PROCESSED_BLOCK_NUMBER_KEY]).to.be.undefined()
    expect(store[STORE_LAST_PROCESSED_BLOCK_HASH_KEY]).to.be.undefined()

    bt.setLastProcessedBlockIfHigher(10, '0x123')
    expect(bt.getLastProcessedBlock()).to.eql([10, '0x123'])
    expect(store[STORE_LAST_PROCESSED_BLOCK_NUMBER_KEY]).to.eql(10)
    expect(store[STORE_LAST_PROCESSED_BLOCK_HASH_KEY]).to.eql('0x123')

    bt.setLastProcessedBlockIfHigher(9, '0x123')
    expect(bt.getLastProcessedBlock()).to.eql([10, '0x123'])
    expect(store[STORE_LAST_PROCESSED_BLOCK_NUMBER_KEY]).to.eql(10)
    expect(store[STORE_LAST_PROCESSED_BLOCK_HASH_KEY]).to.eql('0x123')

    bt.setLastProcessedBlockIfHigher(11, '0x1233')
    expect(bt.getLastProcessedBlock()).to.eql([11, '0x1233'])
    expect(store[STORE_LAST_PROCESSED_BLOCK_NUMBER_KEY]).to.eql(11)
    expect(store[STORE_LAST_PROCESSED_BLOCK_HASH_KEY]).to.eql('0x1233')
  })
})

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

    it('should handle re-emitted events', async function () {
      const contract = Substitute.for<Contract>()
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().resolves(10)

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(6, '') // Leads to no processPastEvents

      const newBlockEmitter = new EventEmitter()
      const options: EventsEmitterOptions = { confirmations: 2, blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, spy)

      // Create events that will have conflict with the new events (a.k.a re-emitted from blockchain)
      const storedEvents = [
        { blockNumber: 7, transactionHash: '1', logIndex: 1, content: '{"transactionIndex": 1}' },
        { blockNumber: 7, transactionHash: '1', logIndex: 2, content: '{"transactionIndex": 1}' }, // Will be deleted
        { blockNumber: 8, transactionHash: '2', logIndex: 1, content: '{"transactionIndex": 2}' }, // Will be deleted
        { blockNumber: 8, transactionHash: '3', logIndex: 1, content: '{"transactionIndex": 3}' }, // Will be deleted
        { blockNumber: 9, transactionHash: '4', logIndex: 1, content: '{"transactionIndex": 3}' }
      ]
      await Event.bulkCreate(storedEvents)

      const events = [
        eventMock({ blockNumber: 9, transactionHash: '1', logIndex: 2 }), // Re-emitted event
        eventMock({ blockNumber: 9, transactionHash: '2', logIndex: 1 }), // Re-emitted event
        eventMock({ blockNumber: 9, transactionHash: '3', logIndex: 1 }), // Re-emitted event
        eventMock({ blockNumber: 10, transactionHash: '6', logIndex: 1 })
      ]
      await eventsEmitter.createEvent(events)

      expect(await Event.count()).to.eql(6)
      expect(spy.called).to.be.false()
      expect(await Event.findOne({ where: { blockNumber: 7, transactionHash: '1', logIndex: 2 } })).to.be.null()
      expect(await Event.findOne({ where: { blockNumber: 8, transactionHash: '2', logIndex: 1 } })).to.be.null()
      expect(await Event.findOne({ where: { blockNumber: 8, transactionHash: '3', logIndex: 1 } })).to.be.null()
    })

    it('should handle only re-emitted events that were not already processed in past', async function () {
      const contract = Substitute.for<Contract>()
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().resolves(10)

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(6, '') // Leads to no processPastEvents

      const newBlockEmitter = new EventEmitter()
      const options: EventsEmitterOptions = { confirmations: 2, blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, spy)

      // Create events that will have conflict with the new events (a.k.a re-emitted from blockchain)
      const storedEvents = [
        { blockNumber: 7, transactionHash: '1', logIndex: 1, content: '{"transactionIndex": 1}' },
        { blockNumber: 7, transactionHash: '1', logIndex: 2, content: '{"transactionIndex": 1}' }, // Will be deleted
        { blockNumber: 8, transactionHash: '2', logIndex: 1, content: '{"transactionIndex": 2}' }, // Will be deleted
        { blockNumber: 8, transactionHash: '3', logIndex: 1, emitted: true, content: '{"transactionIndex": 3}' }, // Should be deleted, but was already processed ==> should be ignored
        { blockNumber: 9, transactionHash: '4', logIndex: 1, content: '{"transactionIndex": 3}' }
      ]
      await Event.bulkCreate(storedEvents)

      const events = [
        eventMock({ blockNumber: 9, transactionHash: '1', logIndex: 2 }), // Re-emitted event
        eventMock({ blockNumber: 9, transactionHash: '2', logIndex: 1 }), // Re-emitted event
        eventMock({ blockNumber: 9, transactionHash: '3', logIndex: 1 }), // Re-emitted event, but was already processed ==> should be ignored
        eventMock({ blockNumber: 10, transactionHash: '6', logIndex: 1 })
      ]
      await eventsEmitter.createEvent(events)

      expect(await Event.count()).to.eql(6)
      expect(spy.called).to.be.false()
      expect(await Event.findOne({ where: { blockNumber: 7, transactionHash: '1', logIndex: 2 } })).to.be.null()
      expect(await Event.findOne({ where: { blockNumber: 8, transactionHash: '2', logIndex: 1 } })).to.be.null()
      expect(await Event.findOne({ where: { blockNumber: 8, transactionHash: '3', logIndex: 1 } })).to.not.be.null()
      expect(await Event.findOne({ where: { blockNumber: 9, transactionHash: '3', logIndex: 1 } })).to.be.null()
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
    const spy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(12))
    await sleep(100)

    contract.received(2).getPastEvents(Arg.all())
    expect(blockTracker.getLastFetchedBlock()).to.eql([12, '0x123'])
    expect(spy.callCount).to.eql(2, 'Expected two emitted events')
  })

  it('should not emit empty events', async function () {
    const eth = Substitute.for<Eth>()
    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(
      Promise.resolve([eventMock({ blockNumber: 11, event: 'testEvent', returnValues: { hey: 123 } })]), // Value for polling new events
      Promise.resolve([]) // Value for polling new events
    )

    const blockTracker = new BlockTracker({})
    blockTracker.setLastFetchedBlock(10, '0x123')

    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const spy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(12))
    await sleep(100)

    contract.received(2).getPastEvents(Arg.all())
    expect(blockTracker.getLastFetchedBlock()).to.eql([12, '0x123'])
    expect(spy.callCount).to.eql(1)
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
    const spy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(11)) // Testing if same block is ignored
    await sleep(100)

    contract.received(1).getPastEvents(Arg.all())
    expect(blockTracker.getLastFetchedBlock()).to.eql([11, '0x123'])
    expect(spy.callCount).to.eql(1, 'Expected only one emitted event')
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
})
