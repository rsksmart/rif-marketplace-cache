import { Eth, TransactionReceipt } from 'web3-eth'
import { Arg, Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import sinon from 'sinon'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
import { Sequelize } from 'sequelize-typescript'
import { EventEmitter } from 'events'
import sinonChai from 'sinon-chai'

import Event from '../../src/blockchain/event.model'
import { sequelizeFactory } from '../../src/sequelize'
import ConfirmationService from '../../src/blockchain/confirmation.service'
import { Application } from '../../src/definitions'
import { sleep } from '../utils'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

function receiptMock (blockNumber?: number, status = true): TransactionReceipt {
  const receipt = Substitute.for<TransactionReceipt>()

  if (blockNumber !== undefined) {
    receipt.blockNumber.returns!(blockNumber)
  }

  if (status !== undefined) {
    receipt.status.returns!(status)
  }

  return receipt
}

describe('confirmation.service', function () {
  let service: ConfirmationService
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>
  let confirmedEventSpy: sinon.SinonSpy
  let invalidEventSpy: sinon.SinonSpy
  let newBlockEmitter: EventEmitter
  let serviceEmitter: EventEmitter

  before((): void => {
    sequelize = sequelizeFactory()
  })

  beforeEach(async () => {
    await sequelize.sync({ force: true })

    newBlockEmitter = new EventEmitter()
    serviceEmitter = new EventEmitter()

    confirmedEventSpy = sinon.spy()
    invalidEventSpy = sinon.spy()
    eth = Substitute.for<Eth>()
    service = new ConfirmationService(eth, newBlockEmitter)

    const appMock = Substitute.for<Application>()
    appMock.service(Arg.all()).returns(Object.setPrototypeOf({ emit: serviceEmitter.emit.bind(serviceEmitter) }, service))

    await service.setup(appMock, 'some/path')

    serviceEmitter.on('newConfirmation', confirmedEventSpy)
    serviceEmitter.on('invalidConfirmation', invalidEventSpy)
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

    expect(await service.find()).to.eql(
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

  it('should emit newConfirmation event when new block is available', async () => {
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
        targetConfirmation: 2,
        emitted: false
      },
      {
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false
      },
      {
        event: 'completelyDifferentEvent',
        blockNumber: 9,
        transactionHash: '4',
        targetConfirmation: 2,
        emitted: true
      }
    ]
    await Event.bulkCreate(events)
    eth.getTransactionReceipt('2').resolves(receiptMock(8))
    eth.getTransactionReceipt('3').resolves(receiptMock(9))
    eth.getTransactionReceipt('4').resolves(receiptMock(9))

    newBlockEmitter.emit('newBlock', 11)
    await sleep(200)

    expect(invalidEventSpy).to.not.have.been.called()
    expect(confirmedEventSpy).to.have.callCount(4)
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 3,
      event: 'testEvent',
      targetConfirmation: 3,
      transactionHash: '2'
    })
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 2,
      event: 'niceEvent',
      targetConfirmation: 2,
      transactionHash: '3'
    })
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 2,
      event: 'otherEvent',
      targetConfirmation: 2,
      transactionHash: '3'
    })
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 2,
      event: 'completelyDifferentEvent',
      targetConfirmation: 2,
      transactionHash: '4'
    })

    expect(await Event.count()).to.eql(5)
  })

  it('should remove already confirmed events that exceed targetConfirmation*multiplier', async () => {
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
        emitted: false
      },
      {
        event: 'niceEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: true
      },
      {
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: true
      },
      {
        event: 'completelyDifferentEvent',
        blockNumber: 15,
        transactionHash: '4',
        targetConfirmation: 2,
        emitted: true
      }
    ]
    await Event.bulkCreate(events)

    newBlockEmitter.emit('newBlock', 18)
    await sleep(200)

    expect(invalidEventSpy).to.not.have.been.called()
    expect(confirmedEventSpy).to.not.have.been.called()

    expect(await Event.count()).to.eql(2)
    expect(await Event.findOne({ where: { event: 'testEvent', blockNumber: 7, transactionHash: '1' } })).to.be.null()
    expect(await Event.findOne({
      where: {
        event: 'testEvent',
        blockNumber: 8,
        transactionHash: '2'
      }
    })).to.not.be.null()
    expect(await Event.findOne({ where: { event: 'niceEvent', blockNumber: 9, transactionHash: '3' } })).to.be.null()
    expect(await Event.findOne({ where: { event: 'otherEvent', blockNumber: 9, transactionHash: '3' } })).to.be.null()
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
        targetConfirmation: 2,
        emitted: false
      },
      {
        event: 'otherEvent',
        blockNumber: 9,
        transactionHash: '3',
        targetConfirmation: 2,
        emitted: false
      },
      {
        event: 'completelyDifferentEvent',
        blockNumber: 9,
        transactionHash: '4',
        targetConfirmation: 2,
        emitted: true
      }
    ]
    await Event.bulkCreate(events)

    eth.getTransactionReceipt('3').resolves(receiptMock(9))

    newBlockEmitter.emit('newBlock', 11)
    await sleep(200)

    expect(confirmedEventSpy).to.have.callCount(2)
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 2,
      event: 'niceEvent',
      targetConfirmation: 2,
      transactionHash: '3'
    })
    expect(confirmedEventSpy).to.have.been.calledWithExactly({
      confirmations: 2,
      event: 'otherEvent',
      targetConfirmation: 2,
      transactionHash: '3'
    })

    expect(await Event.count()).to.eql(3)

    expect(invalidEventSpy).to.have.callCount(2)
    expect(invalidEventSpy).to.have.been.calledWithExactly({
      transactionHash: '2'
    })
    expect(invalidEventSpy).to.have.been.calledWithExactly({
      transactionHash: '4'
    })
  })
})
