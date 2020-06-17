import { BlockHeader, Eth } from 'web3-eth'
import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import sinon from 'sinon'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
import { Sequelize } from 'sequelize-typescript'
import { EventEmitter } from 'events'
import sinonChai from 'sinon-chai'

import Event from '../../src/blockchain/event.model'
import { sequelizeFactory } from '../../src/sequelize'
import { Confirmator, ConfirmatorService } from '../../src/blockchain/confirmator'
import { eventMock, receiptMock, sleep } from '../utils'
import { loggingFactory } from '../../src/logger'
import { BlockTracker } from '../../src/blockchain/block-tracker'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Confirmator', function () {
  let confirmator: Confirmator
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>
  let confirmedEventSpy: sinon.SinonSpy
  let invalidEventSpy: sinon.SinonSpy
  let newEventSpy: sinon.SinonSpy
  let blockTracker: BlockTracker
  let emitter: EventEmitter

  before((): void => {
    sequelize = sequelizeFactory()
  })

  beforeEach(async () => {
    await sequelize.sync({ force: true })

    blockTracker = new BlockTracker({})
    emitter = new EventEmitter()

    confirmedEventSpy = sinon.spy()
    invalidEventSpy = sinon.spy()
    newEventSpy = sinon.spy()
    eth = Substitute.for<Eth>()
    confirmator = new Confirmator(emitter, eth, '0x123', blockTracker, loggingFactory('blockchain:confirmator'))

    emitter.on('newEvent', newEventSpy)
    emitter.on('newConfirmation', confirmedEventSpy)
    emitter.on('invalidConfirmation', invalidEventSpy)
  })

  it('should emit newConfirmation and newEvent event when new block is available', async () => {
    const events = [
      { // Nothing emitted
        contractAddress: '0x123',
        event: 'testEvent',
        blockNumber: 7,
        transactionHash: '1',
        targetConfirmation: 3,
        emitted: true,
        content: '{"event": "testEvent", "blockNumber": 7, "blockHash": "0x123"}'
      },
      { // Emitted newConfirmation
        contractAddress: '0x123',
        event: 'testEvent',
        blockNumber: 8,
        transactionHash: '2',
        targetConfirmation: 4,
        emitted: false,
        content: '{"event": "testEvent", "blockNumber": 8, "blockHash": "0x123"}'
      },
      { // Emitted newEvent
        contractAddress: '0x123',
        event: 'niceEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false,
        content: '{"event": "niceEvent", "blockNumber": 9, "blockHash": "0x123"}'
      },
      { // Emitted newEvent
        contractAddress: '0x123',
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false,
        content: '{"event": "otherEvent", "blockNumber": 9, "blockHash": "0x123"}'
      },
      { // Nothing emitted
        contractAddress: '0x123',
        event: 'completelyDifferentEvent',
        blockNumber: 9,
        transactionHash: '4',
        targetConfirmation: 2,
        emitted: true, // This event won't be emitted as it was already emitted previously
        content: '{"event": "completelyDifferentEvent", "blockNumber": 9, "blockHash": "0x123"}'
      }
    ]
    await Event.bulkCreate(events)
    eth.getTransactionReceipt('2').resolves(receiptMock(8))
    eth.getTransactionReceipt('3').resolves(receiptMock(9))
    eth.getTransactionReceipt('4').resolves(receiptMock(9))

    const block = Substitute.for<BlockHeader>()
    block.number.returns!(11)
    await confirmator.runConfirmationsRoutine(block)
    await sleep(10)

    expect(invalidEventSpy).to.not.have.been.called()
    expect(confirmedEventSpy).to.have.callCount(1)
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 3,
      event: 'testEvent',
      targetConfirmation: 4,
      transactionHash: '2'
    })

    expect(newEventSpy).to.have.callCount(2)
    expect(newEventSpy).to.have.been.calledWithExactly({
      event: 'otherEvent',
      blockNumber: 9,
      blockHash: '0x123'
    })
    expect(newEventSpy).to.have.been.calledWithExactly({
      event: 'niceEvent',
      blockNumber: 9,
      blockHash: '0x123'
    })

    expect(await Event.count()).to.eql(5)
    expect(blockTracker.getLastProcessedBlock()).to.eql([9, '0x123'])
  })

  it('should confirm only events for given address', async () => {
    const events = [
      { // Nothing emitted; different address
        contractAddress: '0x0',
        event: 'testEvent',
        blockNumber: 8,
        transactionHash: '2',
        targetConfirmation: 4,
        emitted: false,
        content: '{"event": "testEvent", "blockNumber": 8, "blockHash": "0x123"}'
      },
      { // Emitted newConfirmation
        contractAddress: '0x123',
        event: 'testEvent',
        blockNumber: 8,
        transactionHash: '2',
        targetConfirmation: 4,
        emitted: false,
        content: '{"event": "testEvent", "blockNumber": 8, "blockHash": "0x123"}'
      },
      { // Emitted newEvent
        contractAddress: '0x123',
        event: 'niceEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false,
        content: '{"event": "niceEvent", "blockNumber": 9, "blockHash": "0x123"}'
      },
      { // Not emitted newEvent; different address
        contractAddress: '0x0',
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false,
        content: '{"event": "otherEvent", "blockNumber": 9, "blockHash": "0x123"}'
      },
      { // Nothing emitted
        contractAddress: '0x123',
        event: 'completelyDifferentEvent',
        blockNumber: 9,
        transactionHash: '4',
        targetConfirmation: 2,
        emitted: true, // This event won't be emitted as it was already emitted previously
        content: '{"event": "completelyDifferentEvent", "blockNumber": 9, "blockHash": "0x123"}'
      }
    ]
    await Event.bulkCreate(events)
    eth.getTransactionReceipt('2').resolves(receiptMock(8))
    eth.getTransactionReceipt('3').resolves(receiptMock(9))
    eth.getTransactionReceipt('4').resolves(receiptMock(9))

    const block = Substitute.for<BlockHeader>()
    block.number.returns!(11)
    await confirmator.runConfirmationsRoutine(block)
    await sleep(10)

    expect(invalidEventSpy).to.not.have.been.called()
    expect(confirmedEventSpy).to.have.callCount(1)
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 3,
      event: 'testEvent',
      targetConfirmation: 4,
      transactionHash: '2'
    })

    expect(newEventSpy).to.have.callCount(1)
    expect(newEventSpy).to.not.have.been.calledWithExactly({
      event: 'otherEvent',
      blockNumber: 9,
      blockHash: '0x123'
    })
    expect(newEventSpy).to.have.been.calledWithExactly({
      event: 'niceEvent',
      blockNumber: 9,
      blockHash: '0x123'
    })

    expect(await Event.count()).to.eql(5)
    expect(blockTracker.getLastProcessedBlock()).to.eql([9, '0x123'])
  })

  it('should remove already confirmed events that exceed targetConfirmation*multiplier', async () => {
    // Multiplayer = 1,5

    const events = [
      { // Deleted; confirmations = 11
        contractAddress: '0x123',
        event: 'testEvent',
        blockNumber: 7,
        transactionHash: '1',
        targetConfirmation: 3,
        emitted: true
      },
      { // Not deleted as not emitted; confirmations = 8
        contractAddress: '0x123',
        event: 'testEvent',
        blockNumber: 8,
        transactionHash: '2',
        targetConfirmation: 3,
        emitted: false
      },
      { // Deleted; confirmations = 5
        contractAddress: '0x123',
        event: 'niceEvent',
        blockNumber: 13,
        transactionHash: '3',
        targetConfirmation: 3,
        emitted: true
      },
      { // Not deleted; confirmations = 4
        contractAddress: '0x123',
        event: 'otherEvent',
        blockNumber: 14,
        transactionHash: '3',
        targetConfirmation: 3,
        emitted: true
      },
      { // Not deleted; confirmations = 3
        contractAddress: '0x123',
        event: 'completelyDifferentEvent',
        blockNumber: 15,
        transactionHash: '4',
        targetConfirmation: 3,
        emitted: true
      }
    ]
    await Event.bulkCreate(events)
    eth.getTransactionReceipt('2').resolves(receiptMock(8))

    const block = Substitute.for<BlockHeader>()
    block.number.returns!(18)
    await confirmator.runConfirmationsRoutine(block)
    await sleep(10)

    expect(newEventSpy).to.not.have.been.called()
    expect(invalidEventSpy).to.not.have.been.called()
    expect(confirmedEventSpy).to.not.have.been.called()

    expect(await Event.count()).to.eql(3)
    expect(await Event.findOne({ where: { event: 'testEvent', blockNumber: 7, transactionHash: '1' } })).to.be.null()
    expect(await Event.findOne({
      where: {
        event: 'testEvent',
        blockNumber: 8,
        transactionHash: '2'
      }
    })).to.be.not.null()
    expect(await Event.findOne({ where: { event: 'niceEvent', blockNumber: 13, transactionHash: '3' } })).to.be.null()
    expect(await Event.findOne({
      where: {
        event: 'otherEvent',
        blockNumber: 14,
        transactionHash: '3'
      }
    })).to.be.not.null()
    expect(await Event.findOne({
      where: {
        event: 'completelyDifferentEvent',
        blockNumber: 15,
        transactionHash: '4'
      }
    })).to.not.be.null()
  })

  it('should remove events without valid receipt and emit invalid event', async () => {
    const events = [
      { // Already emitted, awaits deletion
        contractAddress: '0x123',
        event: 'testEvent',
        blockNumber: 7,
        transactionHash: '1',
        targetConfirmation: 3,
        emitted: true
      },
      { // Already emitted, awaits deletion
        contractAddress: '0x123',
        event: 'testEvent',
        blockNumber: 7,
        transactionHash: '2',
        targetConfirmation: 3,
        emitted: true
      },
      { // To be emitted, but not valid receipt (invalid status)
        contractAddress: '0x123',
        event: 'niceEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false
      },
      { // To be emitted, but not valid receipt (invalid block number)
        contractAddress: '0x123',
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '4',
        targetConfirmation: 2,
        emitted: false
      },
      { // To be emitted, and valid receipt
        contractAddress: '0x123',
        event: 'completelyDifferentEvent',
        blockNumber: 9,
        transactionHash: '5',
        targetConfirmation: 2,
        emitted: false,
        content: '{"event": "completelyDifferentEvent", "blockNumber": 9, "blockHash": "0x123"}'
      }
    ]
    await Event.bulkCreate(events)

    eth.getTransactionReceipt('3').resolves(receiptMock(10))
    eth.getTransactionReceipt('4').resolves(receiptMock(9, false))
    eth.getTransactionReceipt('5').resolves(receiptMock(9))

    const block = Substitute.for<BlockHeader>()
    block.number.returns!(11)
    await confirmator.runConfirmationsRoutine(block)
    await sleep(10)

    expect(confirmedEventSpy).to.have.callCount(0)

    expect(await Event.count()).to.eql(3)

    expect(newEventSpy).to.have.callCount(1)
    expect(newEventSpy).to.have.been.calledWithExactly({
      event: 'completelyDifferentEvent',
      blockNumber: 9,
      blockHash: '0x123'
    })

    expect(invalidEventSpy).to.have.callCount(2)
    expect(invalidEventSpy).to.have.been.calledWithExactly({
      transactionHash: '3'
    })
    expect(invalidEventSpy).to.have.been.calledWithExactly({
      transactionHash: '4'
    })
  })

  it('should detect dropped out hashes', async () => {
    const events = [
      {
        contractAddress: '0x666', // Different contract
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
        contractAddress: '0x123',
        event: 'niceEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false,
        content: '{"event": "niceEvent", "blockNumber": 9, "blockHash": "0x123"}'
      },
      {
        contractAddress: '0x123',
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '4',
        targetConfirmation: 2,
        emitted: false,
        content: '{"event": "otherEvent", "blockNumber": 9, "blockHash": "0x123"}'
      },
      {
        contractAddress: '0x123',
        event: 'completelyDifferentEvent',
        blockNumber: 9,
        transactionHash: '5',
        targetConfirmation: 2,
        emitted: true, // This event won't be emitted as it was already emitted previously
        content: '{"event": "completelyDifferentEvent", "blockNumber": 9, "blockHash": "0x123"}'
      }
    ]
    await Event.bulkCreate(events)

    await confirmator.checkDroppedTransactions([
      eventMock({ transactionHash: '4' }),
      eventMock({ transactionHash: '5' })
    ])

    expect(invalidEventSpy).to.have.callCount(2)

    expect(invalidEventSpy).to.have.been.calledWithExactly({ transactionHash: '2' })
    expect(invalidEventSpy).to.have.been.calledWithExactly({ transactionHash: '3' })
  })
})

describe('ConfirmatorService', function () {
  let confirmationService: ConfirmatorService
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>

  before((): void => {
    sequelize = sequelizeFactory()
  })

  beforeEach(async () => {
    await sequelize.sync({ force: true })
    eth = Substitute.for<Eth>()
    confirmationService = new ConfirmatorService(eth)
  })

  it('should return events for find()', async () => {
    // Create events to be confirmed
    const events = [
      {
        event: 'testEvent',
        blockNumber: 7,
        transactionHash: '1',
        targetConfirmation: 3,
        emitted: true
      },
      {
        event: 'testEvent',
        blockNumber: 8,
        transactionHash: '2',
        targetConfirmation: 3,
        emitted: true
      },
      {
        event: 'niceEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 3,
        emitted: false
      },
      {
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: true
      },
      {
        event: 'otherEvent',
        blockNumber: 10,
        transactionHash: '4',
        targetConfirmation: 3,
        emitted: false
      }
    ]
    await Event.bulkCreate(events)

    eth.getBlockNumber().resolves(11)

    expect(await confirmationService.find()).to.eql(
      [
        {
          event: 'testEvent',
          confirmations: 4,
          transactionHash: '1',
          targetConfirmation: 3
        },
        {
          event: 'testEvent',
          confirmations: 3,
          transactionHash: '2',
          targetConfirmation: 3
        },
        {
          event: 'niceEvent',
          confirmations: 2,
          transactionHash: '3',
          targetConfirmation: 3
        },
        {
          event: 'otherEvent',
          confirmations: 2,
          transactionHash: '3',
          targetConfirmation: 2
        },
        {
          event: 'otherEvent',
          confirmations: 1,
          transactionHash: '4',
          targetConfirmation: 3
        }
      ]
    )
  })
})
