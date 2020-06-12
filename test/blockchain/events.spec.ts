import { BlockHeader, BlockTransactionString, Eth } from 'web3-eth'
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
  ListeningNewBlockEmitter, PollingEventsEmitter,
  PollingNewBlockEmitter
} from '../../src/blockchain/events'
import { Logger } from '../../src/definitions'
import { loggingFactory } from '../../src/logger'
import { sequelizeFactory } from '../../src/sequelize'
import Event from '../../src/blockchain/event.model'
import { sleep } from '../utils'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect
const setImmediatePromise = util.promisify(setImmediate)

const NEW_BLOCK_EVENT = 'newBlock'
const DATA_EVENT_NAME = 'newEvent'
const STORE_LAST_FETCHED_BLOCK_NUMBER_KEY = 'lastFetchedBlockNumber'
const STORE_LAST_FETCHED_BLOCK_HASH_KEY = 'lastFetchedBlockHash'
const STORE_LAST_PROCESSED_BLOCK_NUMBER_KEY = 'lastProcessedBlockNumber'
const STORE_LAST_PROCESSED_BLOCK_HASH_KEY = 'lastProcessedBlockHash'

function subscribeMock (sequence: Array<Error | BlockHeader>, interval = 100): (event: string, cb: (err?: Error, blockHeader?: BlockHeader) => void) => void {
  let counter = 0
  let intervalId: NodeJS.Timeout
  return (event: string, cb: (err?: Error, blockHeader?: BlockHeader) => void): void => {
    intervalId = setInterval(() => {
      if (counter >= sequence.length) {
        clearInterval(intervalId)
        return
      }

      if (sequence[counter] instanceof Error) {
        // eslint-disable-next-line standard/no-callback-literal
        cb(sequence[counter] as Error, undefined)
      } else {
        cb(undefined, sequence[counter] as BlockHeader)
      }

      counter += 1
    }, interval)
  }
}

function eventMock (options?: Partial<EventData>): EventData {
  const testEvent = Substitute.for<EventData>()
  options = options || {}

  for (const [key, value] of Object.entries(options)) {
    // @ts-ignore
    testEvent[key].returns!(value)
  }

  if (!options.event) {
    testEvent.event.returns!('testEvent')
  }

  return testEvent
}

function blockFactory (blockNumber: number, blockHash = '0x123'): BlockTransactionString {
  const block = Substitute.for<BlockTransactionString>()
  block.number.returns!(blockNumber)
  block.hash.returns!(blockHash)
  return block
}

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

describe('PollingNewBlockEmitter', () => {
  it('should immediately emit event', async function () {
    const spy = sinon.spy()
    const block = blockFactory(111)
    const eth = Substitute.for<Eth>()
    eth.getBlock(Arg.all()).returns(Promise.resolve(block))

    const emitter = new PollingNewBlockEmitter(eth, 100)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // We have to wait for all previous schedules events in event-loop to finish
    await setImmediatePromise()
    eth.received(1).getBlock(Arg.all())
    expect(spy.calledOnceWith(block)).to.be.true('Emitter callback should have been called with 10.')

    emitter.off(NEW_BLOCK_EVENT, spy) // Cleanup
  })

  it('should emit only new events', async function () {
    const spy = sinon.spy()
    const eth = Substitute.for<Eth>()
    const firstBlock = blockFactory(10)
    const secondBlock = blockFactory(11)
    eth.getBlock(Arg.all()).returns(
      Promise.resolve(firstBlock),
      Promise.resolve(blockFactory(10)),
      Promise.resolve(secondBlock)
    )

    const emitter = new PollingNewBlockEmitter(eth, 100)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // Lets wait for 3 events polls
    await sleep(210)
    eth.received(3).getBlock(Arg.all())
    expect(spy.calledTwice).to.be.true('Emitter callback should have been called twice.')
    expect(spy.firstCall.calledWithExactly(firstBlock)).to.be.true('Emitter callback should have been called first with 10.')
    expect(spy.secondCall.calledWithExactly(secondBlock)).to.be.true('Emitter callback should have been called second time with 11.')

    emitter.off(NEW_BLOCK_EVENT, spy) // Cleanup
  })

  it('should stop on removeListener', async function () {
    const spy = sinon.spy()
    const block = blockFactory(10)
    const eth = Substitute.for<Eth>()
    eth.getBlock(Arg.all()).returns(
      Promise.resolve(block),
      Promise.resolve(blockFactory(10))
    )

    const emitter = new PollingNewBlockEmitter(eth, 100)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // Lets wait for 2 events polls
    await sleep(110)
    emitter.off(NEW_BLOCK_EVENT, spy)

    // Lets make sure it is off
    await sleep(110)

    eth.received(2).getBlock(Arg.all())
    expect(spy.calledOnce).to.be.true('Emitter callback should have been called once.')
    expect(spy.firstCall.calledWithExactly(block)).to.be.true('Emitter callback should have been called first with 10.')
  })
})

describe('ListeningNewBlockEmitter', () => {
  const NEW_BLOCK_EVENT = 'newBlock'

  it('should immediately emit event', async function () {
    const spy = sinon.spy()
    const block = blockFactory(10)
    const eth = Substitute.for<Eth>()
    eth.getBlock(Arg.all()).returns(Promise.resolve(block))

    const emitter = new ListeningNewBlockEmitter(eth)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // We have to wait for all previous schedules events in event-loop to finish
    await setImmediatePromise()
    eth.received(1).getBlock(Arg.all())
    expect(spy.calledOnceWith(block)).to.be.true('Emitter callback should have been called with 10.')
  })

  it('should listen for events from blockchain', async function () {
    const spy = sinon.spy()
    const block = blockFactory(9)
    const block1 = Substitute.for<BlockHeader>()
    block1.number.returns!(10)
    const block2 = Substitute.for<BlockHeader>()
    block2.number.returns!(11)
    const subscribe = subscribeMock([block1, block2], 100)
    const eth = Substitute.for<Eth>()
    eth.getBlock(Arg.all()).returns(Promise.resolve(block))
    // @ts-ignore
    eth.subscribe(Arg.all()).mimicks(subscribe)

    const emitter = new ListeningNewBlockEmitter(eth)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // Lets wait for 3 events fired
    await sleep(410)

    eth.received(1).getBlock(Arg.all())
    expect(spy).to.have.callCount(3)
    expect(spy.firstCall).to.be.calledWithExactly(block)
    expect(spy.secondCall).to.be.calledWithExactly(block1)
    expect(spy.thirdCall).to.be.calledWithExactly(block2)
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
    eth.getBlock('latest').resolves(blockFactory(11))

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
      eth.getBlock('latest').resolves(blockFactory(10))

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

    it('should confirm events', async function () {
      const contract = Substitute.for<Contract>()
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().resolves(10)

      const blockTracker = new BlockTracker({})
      blockTracker.setLastFetchedBlock(3, '') // Leads to no processPastEvents

      const newBlockEmitter = new EventEmitter()
      const options: EventsEmitterOptions = { confirmations: 2, blockTracker, newBlockEmitter }
      const emitterSpy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, emitterSpy)

      // Create events to be confirmed
      const events = [
        {
          event: 'testEvent',
          blockNumber: 7,
          transactionHash: '1',
          logIndex: 1,
          content: '{"transactionHash": "1", "blockHash": "0x321", "blockNumber": 7}'
        },
        {
          event: 'testEvent',
          blockNumber: 8,
          transactionHash: '2',
          logIndex: 1,
          content: '{"transactionHash": "2", "blockHash": "0x321", "blockNumber": 8}'
        },
        {
          event: 'testEvent',
          blockNumber: 9,
          transactionHash: '3',
          logIndex: 1,
          content: '{"transactionHash": "3", "blockHash": "0x321", "blockNumber": 9}'
        },
        {
          event: 'testEvent',
          blockNumber: 9,
          transactionHash: '4',
          logIndex: 1,
          content: '{"transactionHash": "4", "blockHash": "0x321", "blockNumber": 9}'
        },
        {
          event: 'testEvent',
          blockNumber: 10,
          transactionHash: '5',
          logIndex: 1,
          content: '{"transactionHash": "5", "blockHash": "0x321", "blockNumber": 10}'
        },
        {
          event: 'testEvent',
          blockNumber: 11,
          transactionHash: '6',
          logIndex: 1,
          content: '{"transactionHash": "6", "blockHash": "0x321", "blockNumber": 11}'
        }
      ]
      await Event.bulkCreate(events)
      expect(await Event.count({ where: { emitted: true } })).to.eql(0)

      // Start confirmations process
      newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(11))
      await sleep(500)

      expect(emitterSpy.callCount).to.be.eql(4, 'Expected four events emitted.')
      expect(await Event.count({ where: { emitted: true } })).to.eql(4)
      expect(blockTracker.getLastProcessedBlock()).to.eql([9, '0x321'])
    })

    it('each emitter should confirm only his events', async function () {
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().resolves(10)

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve([]))

      const firstBlockTracker = new BlockTracker({})
      const firstNewBlockEmitter = new EventEmitter()
      const firstOptions: EventsEmitterOptions = {
        confirmations: 2,
        blockTracker: firstBlockTracker,
        newBlockEmitter: firstNewBlockEmitter
      }
      const firstEmitterSpy = sinon.spy()
      const firstEventsEmitter = new DummyEventsEmitter(eth, contract, ['firstEvent'], firstOptions, 'dummy1')
      firstEventsEmitter.on(DATA_EVENT_NAME, firstEmitterSpy)

      const secondBlockTracker = new BlockTracker({})
      const secondNewBlockEmitter = new EventEmitter()
      const secondOptions: EventsEmitterOptions = {
        confirmations: 2,
        blockTracker: secondBlockTracker,
        newBlockEmitter: secondNewBlockEmitter
      }
      const secondEmitterSpy = sinon.spy()
      const secondEventsEmitter = new DummyEventsEmitter(eth, contract, ['secondEvent'], secondOptions, 'dummy2')
      secondEventsEmitter.on(DATA_EVENT_NAME, secondEmitterSpy)

      // Create events to be confirmed
      const events = [
        {
          event: 'firstEvent',
          blockNumber: 7,
          transactionHash: '1',
          logIndex: 1,
          content: '{"transactionHash": "1", "blockHash": "0x321", "blockNumber": 7, "event": "firstEvent"}'
        },
        {
          event: 'secondEvent',
          blockNumber: 8,
          transactionHash: '2',
          logIndex: 1,
          content: '{"transactionHash": "2", "blockHash": "0x321", "blockNumber": 8, "event": "secondEvent"}'
        },
        {
          event: 'firstEvent',
          blockNumber: 9,
          transactionHash: '3',
          logIndex: 1,
          content: '{"transactionHash": "3", "blockHash": "0x321", "blockNumber": 9, "event": "firstEvent"}'
        },
        {
          event: 'secondEvent',
          blockNumber: 10,
          transactionHash: '4',
          logIndex: 1,
          content: '{"transactionHash": "4", "blockHash": "0x321", "blockNumber": 10, "event": "secondEvent"}'
        },
        {
          event: 'firstEvent',
          blockNumber: 11,
          transactionHash: '5',
          logIndex: 1,
          content: '{"transactionHash": "5", "blockHash": "0x321", "blockNumber": 11, "event": "firstEvent"}'
        },
        {
          event: 'firstEvent',
          blockNumber: 12,
          transactionHash: '6',
          logIndex: 1,
          content: '{"transactionHash": "6", "blockHash": "0x321", "blockNumber": 12, "event": "firstEvent"}'
        },
        {
          event: 'secondEvent',
          blockNumber: 13,
          transactionHash: '7',
          logIndex: 1,
          content: '{"transactionHash": "7", "blockHash": "0x321", "blockNumber": 13, "event": "secondEvent"}'
        }
      ]
      await Event.bulkCreate(events)
      expect(await Event.count({ where: { emitted: true } })).to.eql(0)

      // Start confirmations process
      firstNewBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(13))
      await sleep(500)

      secondNewBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(13))
      await sleep(500)

      expect(firstEmitterSpy.callCount).to.be.eql(3, 'Expected three firstEvent events emitted.')
      firstEmitterSpy.getCalls().forEach(call => expect(call.args[0].event).to.eql('firstEvent'))

      expect(secondEmitterSpy.callCount).to.be.eql(2, 'Expected two secondEvent events emitted.')
      secondEmitterSpy.getCalls().forEach(call => expect(call.args[0].event).to.eql('secondEvent'))

      expect(await Event.count({ where: { emitted: true } })).to.eql(5)
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
      eth.getBlock('latest').resolves(blockFactory(10))

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

    newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(12))
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

    newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(12))
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

    newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(11))
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(11)) // Testing if same block is ignored
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
    newBlockEmitter.emit(NEW_BLOCK_EVENT, blockFactory(11))
    await sleep(50)
    contract.received(1).getPastEvents(Arg.all())

    // After the processingEvents() is finished
    await sleep(500)
    contract.received(2).getPastEvents(Arg.all())
  })
})
