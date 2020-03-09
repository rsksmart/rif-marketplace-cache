import {
  BaseEventsEmitter,
  BlockTracker,
  EventsEmitterOptions,
  ListeningNewBlockEmitter, PollingEventsEmitter,
  PollingNewBlockEmitter
} from '../../src/blockchain/events'
import { Store } from '../../src/types'
import { BlockHeader, Eth } from 'web3-eth'

import { Arg, Substitute } from '@fluffy-spoon/substitute'
import sinon from 'sinon'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
import util from 'util'
import { Contract, EventData } from 'web3-eth-contract'
import { EventEmitter } from 'events'
import { factory } from '../../src/logger'
import { Sequelize } from 'sequelize-typescript'
import { sequelizeFactory } from '../../src/sequelize'
import Event from '../../src/models/event.model'

chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect
const setImmediatePromise = util.promisify(setImmediate)
const NEW_BLOCK_EVENT = 'newBlock'
const DATA_EVENT_NAME = 'newEvent'

class StoreMock implements Store {
  data: Record<string, any> = {}

  get (key: string): any {
    return this.data[key]
  }

  set (key: string, value: any): void {
    this.data[key] = value
  }

  isEmpty (): boolean {
    return Object.keys(this.data).length === 0
  }
}

function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function subscribeMock (sequence: Array<Error | BlockHeader>, interval = 100): (event: string, cb: (err?: Error, blockHeader?: BlockHeader) => void) => void {
  let counter = 0
  let intervalId: NodeJS.Timeout
  return (event: string, cb: (err?: Error, blockHeader?: BlockHeader) => void) => {
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

/**
 * Dummy implementation for testing BaseEventsEmitter
 */
export class DummyEventsEmitter extends BaseEventsEmitter {
  constructor (eth: Eth, contract: Contract, events: string[], options?: EventsEmitterOptions) {
    const logger = factory('blockchain:events:dummy')
    super(eth, contract, events, logger, options)
  }

  createEvent (data: EventData | EventData[]): Promise<void> {
    return this.processEvents(data)
  }

  startEvents (): void {
    // noop
  }

  stopEvents (): void {
    // noop
  }
}

// TODO: More focused assertions of expected calls.
describe('BlockTracker', () => {
  const STORE_LAST_PROCESSED_BLOCK_KEY = 'blockchain.lastProcessedBlock'

  it('read initial block from store', function () {
    const store = new StoreMock()
    store.set(STORE_LAST_PROCESSED_BLOCK_KEY, 111)

    const bt = new BlockTracker(store)
    expect(bt.getLastProcessedBlock()).to.eql(111)
  })

  it('should save block', function () {
    const store = new StoreMock()
    const bt = new BlockTracker(store)

    expect(bt.getLastProcessedBlock()).to.be.undefined()
    expect(store.isEmpty()).to.be.true()

    bt.setLastProcessedBlock(10)
    expect(bt.getLastProcessedBlock()).to.eql(10)
    expect(store.data[STORE_LAST_PROCESSED_BLOCK_KEY]).to.eql(10)
  })
})

describe('PollingNewBlockEmitter', () => {
  it('should immediately emit event', async function () {
    const spy = sinon.spy()
    const eth = Substitute.for<Eth>()
    eth.getBlockNumber().returns(Promise.resolve(10))

    const emitter = new PollingNewBlockEmitter(eth, 100)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // We have to wait for all previous schedules events in event-loop to finish
    await setImmediatePromise()
    eth.received(1).getBlockNumber()
    expect(spy.calledOnceWith(10)).to.be.true('Emitter callback should have been called with 10.')
  })

  it('should emit only new events', async function () {
    const spy = sinon.spy()
    const eth = Substitute.for<Eth>()
    eth.getBlockNumber().returns(
      Promise.resolve(10),
      Promise.resolve(10),
      Promise.resolve(11)
    )

    const emitter = new PollingNewBlockEmitter(eth, 100)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // Lets wait for 3 events polls
    await sleep(210)
    eth.received(3).getBlockNumber()
    expect(spy.calledTwice).to.be.true('Emitter callback should have been called twice.')
    expect(spy.firstCall.calledWithExactly(10)).to.be.true('Emitter callback should have been called first with 10.')
    expect(spy.secondCall.calledWithExactly(11)).to.be.true('Emitter callback should have been called second time with 11.')
  })

  it('should stop on removeListener', async function () {
    const spy = sinon.spy()
    const eth = Substitute.for<Eth>()
    eth.getBlockNumber().returns(
      Promise.resolve(10),
      Promise.resolve(10)
    )

    const emitter = new PollingNewBlockEmitter(eth, 100)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // Lets wait for 2 events polls
    await sleep(110)
    emitter.off(NEW_BLOCK_EVENT, spy)

    // Lets make sure it is off
    await sleep(110)

    eth.received(2).getBlockNumber()
    expect(spy.calledOnce).to.be.true('Emitter callback should have been called once.')
    expect(spy.firstCall.calledWithExactly(10)).to.be.true('Emitter callback should have been called first with 10.')
  })
})

describe('ListeningNewBlockEmitter', () => {
  const NEW_BLOCK_EVENT = 'newBlock'

  it('should immediately emit event', async function () {
    const spy = sinon.spy()
    const eth = Substitute.for<Eth>()
    eth.getBlockNumber().returns(Promise.resolve(10))

    const emitter = new ListeningNewBlockEmitter(eth)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // We have to wait for all previous schedules events in event-loop to finish
    await setImmediatePromise()
    eth.received(1).getBlockNumber()
    expect(spy.calledOnceWith(10)).to.be.true('Emitter callback should have been called with 10.')
  })

  it('should listen for events from blockchain', async function () {
    const spy = sinon.spy()
    const block1 = Substitute.for<BlockHeader>()
    block1.number.returns!(10)
    const block2 = Substitute.for<BlockHeader>()
    block2.number.returns!(11)
    const subscribe = subscribeMock([block1, block2], 100)
    const eth = Substitute.for<Eth>()
    eth.getBlockNumber().returns(Promise.resolve(9))
    // @ts-ignore
    eth.subscribe(Arg.all()).mimicks(subscribe)

    const emitter = new ListeningNewBlockEmitter(eth)
    emitter.on(NEW_BLOCK_EVENT, spy)

    // Lets wait for 3 events fired
    await sleep(410)

    eth.received(1).getBlockNumber()
    expect(spy.getCalls().length).to.eql(3, 'Emitter callback should have been called three times.')
    expect(spy.firstCall.calledWithExactly(9)).to.be.true('Emitter callback should have been called first with 9.')
    expect(spy.secondCall.calledWithExactly(10)).to.be.true('Emitter callback should have been called second time with 10.')
    expect(spy.thirdCall.calledWithExactly(11)).to.be.true('Emitter callback should have been called second time with 11.')
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

  describe('with confirmations', () => {
    it('should process past events', async function () {
      const events = [
        eventMock({ blockNumber: 4, transactionHash: '1', logIndex: 1 }),
        eventMock({ blockNumber: 8, transactionHash: '2', logIndex: 1 }),
        eventMock({ blockNumber: 9, transactionHash: '3', logIndex: 1 }),
        eventMock({ blockNumber: 10, transactionHash: '4', logIndex: 1 })
      ]

      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().returns(Promise.resolve(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve(events))

      const blockTracker = new BlockTracker(new StoreMock())
      const newBlockEmitter = new EventEmitter()
      const options: EventsEmitterOptions = { confirmations: 2, blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, spy)
      await sleep(100)

      expect(spy.getCalls().length).to.be.eql(2, 'Expected two events emitted.')
      eth.received(1).getBlockNumber()
      contract.received(1).getPastEvents(Arg.all())
      expect(await Event.count()).to.eql(2)
      expect(blockTracker.getLastProcessedBlock()).to.eql(10)
    })

    it('should process new events', async function () {
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().returns(Promise.resolve(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve([]))

      const blockTracker = new BlockTracker(new StoreMock())
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
      expect(spy.getCalls().length).to.be.eql(2, 'Expected two events emitted.')
      eth.received(2).getBlockNumber()
      contract.received(1).getPastEvents(Arg.all())
      expect(blockTracker.getLastProcessedBlock()).to.eql(10)
    })

    it('should handle re-emitted events', async function () {
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().returns(Promise.resolve(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve([]))

      const blockTracker = new BlockTracker(new StoreMock())
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

    it('should confirm events', async function () {
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().returns(Promise.resolve(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve([]))

      const blockTracker = new BlockTracker(new StoreMock())
      const newBlockEmitter = new EventEmitter()
      const options: EventsEmitterOptions = { confirmations: 2, blockTracker, newBlockEmitter }
      const emitterSpy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, emitterSpy)

      // Create events to be confirmed
      const events = [
        { blockNumber: 7, transactionHash: '1', logIndex: 1, content: '{"transactionIndex": 1}' },
        { blockNumber: 8, transactionHash: '2', logIndex: 1, content: '{"transactionIndex": 2}' },
        { blockNumber: 9, transactionHash: '3', logIndex: 1, content: '{"transactionIndex": 3}' },
        { blockNumber: 9, transactionHash: '4', logIndex: 1, content: '{"transactionIndex": 4}' },
        { blockNumber: 10, transactionHash: '5', logIndex: 1, content: '{"transactionIndex": 5}' },
        { blockNumber: 11, transactionHash: '6', logIndex: 1, content: '{"transactionIndex": 5}' }
      ]
      await Event.bulkCreate(events)

      // Start confirmations process
      newBlockEmitter.emit(NEW_BLOCK_EVENT, 11)
      await sleep(100)

      expect(emitterSpy.getCalls().length).to.be.eql(4, 'Expected two events emitted.')
      expect(await Event.count()).to.eql(2)
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
      eth.getBlockNumber().returns(Promise.resolve(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve(events))

      const blockTracker = new BlockTracker(new StoreMock())
      const newBlockEmitter = new EventEmitter()
      const options = { blockTracker, newBlockEmitter }
      const spy = sinon.spy()
      const eventsEmitter = new DummyEventsEmitter(eth, contract, ['testEvent'], options)
      eventsEmitter.on(DATA_EVENT_NAME, spy)
      await sleep(100)

      expect(spy.getCalls().length).to.be.eql(3, 'Expected three events emitted.')
      eth.received(1).getBlockNumber()
      contract.received(1).getPastEvents(Arg.all())
      expect(blockTracker.getLastProcessedBlock()).to.eql(10)
    })

    it('should emits new events', async function () {
      const eth = Substitute.for<Eth>()
      eth.getBlockNumber().returns(Promise.resolve(10))

      const contract = Substitute.for<Contract>()
      contract.getPastEvents(Arg.all()).returns(Promise.resolve([]))

      const blockTracker = new BlockTracker(new StoreMock())
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

      expect(spy.getCalls().length).to.be.eql(3, 'Expected three events emitted.')
      expect(blockTracker.getLastProcessedBlock()).to.eql(10)
      contract.received(1).getPastEvents(Arg.all())
      eth.received(2).getBlockNumber()
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

    const blockTracker = new BlockTracker(new StoreMock())
    blockTracker.setLastProcessedBlock(10)

    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const spy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT, 11)
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT, 12)
    await sleep(100)

    contract.received(2).getPastEvents(Arg.all())
    expect(blockTracker.getLastProcessedBlock()).to.eql(12)
    expect(spy.getCalls().length).to.eql(2, 'Expected two emitted events')
  })

  it('should not emit empty events', async function () {
    const eth = Substitute.for<Eth>()
    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(
      Promise.resolve([eventMock({ blockNumber: 11, event: 'testEvent', returnValues: { hey: 123 } })]), // Value for polling new events
      Promise.resolve([]) // Value for polling new events
    )

    const blockTracker = new BlockTracker(new StoreMock())
    blockTracker.setLastProcessedBlock(10)

    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const spy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT, 11)
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT, 12)
    await sleep(100)

    contract.received(2).getPastEvents(Arg.all())
    expect(blockTracker.getLastProcessedBlock()).to.eql(12)
    expect(spy.getCalls().length).to.eql(2, 'Expected two emitted events')
  })

  it('should ignore same blocks', async function () {
    const eth = Substitute.for<Eth>()
    const contract = Substitute.for<Contract>()
    contract.getPastEvents(Arg.all()).returns(
      Promise.resolve([eventMock({ blockNumber: 11 })]) // Value for polling new events
    )

    const blockTracker = new BlockTracker(new StoreMock())
    blockTracker.setLastProcessedBlock(10)

    const newBlockEmitter = new EventEmitter()
    const options = { blockTracker, newBlockEmitter }
    const spy = sinon.spy()
    const eventsEmitter = new PollingEventsEmitter(eth, contract, ['testEvent'], options)
    eventsEmitter.on(DATA_EVENT_NAME, spy)
    await setImmediatePromise()

    newBlockEmitter.emit(NEW_BLOCK_EVENT, 11)
    await sleep(100)

    newBlockEmitter.emit(NEW_BLOCK_EVENT, 11) // Testing if same block is ignored
    await sleep(100)

    contract.received(1).getPastEvents(Arg.all())
    expect(blockTracker.getLastProcessedBlock()).to.eql(11)
    expect(spy.getCalls().length).to.eql(1, 'Expected only one emitted event')
  })
})
