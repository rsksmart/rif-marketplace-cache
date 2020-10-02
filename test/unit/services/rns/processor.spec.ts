import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import { EventData } from 'web3-eth-contract'
import Utils from 'web3-utils'

import Eth from 'web3-eth'
import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize-typescript'
import { loggingFactory } from '../../../../src/logger'

import eventProcessor from '../../../../src/services/rns/rns.processor'
import { RnsBaseService, RnsServices } from '../../../../src/services/rns'
import { sequelizeFactory } from '../../../../src/sequelize'
import Domain from '../../../../src/services/rns/models/domain.model'
import DomainOwner from '../../../../src/services/rns/models/owner.model'
import DomainExpiration from '../../../../src/services/rns/models/expiration.model'
import DomainOffer from '../../../../src/services/rns/models/domain-offer.model'
import SoldDomain from '../../../../src/services/rns/models/sold-domain.model'

import { eventMock, transactionMock } from '../../../utils'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const logger = loggingFactory('rns')

describe('Domain events', () => {
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>
  let processor: (event: EventData) => Promise<void>
  let domainService: RnsBaseService
  let domainServiceEmitSpy: sinon.SinonSpy

  const label = 'domain'
  const name = 'domain.rsk'
  const tokenId = Utils.sha3(label) as string
  const labelOther = 'domainother'
  const nameOther = 'domainother.rsk'
  const tokenOtherId = Utils.sha3(labelOther) as string
  const from = 'from_addr'
  const to = 'to_addr'
  const other = 'other_addr'
  const expirationTime = (new Date()).getTime().toString()
  const zeroAddress = '0x0000000000000000000000000000000000000000'
  const transactionHash = 'TX_HASH'

  before(() => {
    sequelize = sequelizeFactory()
    eth = Substitute.for<Eth>()
    domainService = new RnsBaseService({ Model: Domain })
    processor = eventProcessor(logger, eth, { domains: domainService } as RnsServices)
    domainServiceEmitSpy = sinon.spy()
    domainService.emit = domainServiceEmitSpy
  })
  beforeEach(async () => {
    await sequelize.sync({ force: true })
    domainServiceEmitSpy.resetHistory()
  })

  it('should create new Domain with Transfer', async () => {
    const event = eventMock({
      event: 'Transfer',
      transactionHash: 'TX_HASH',
      returnValues: { tokenId, from, to }
    })

    await processor(event)

    const createdEvent = await Domain.findByPk(Utils.numberToHex(event.returnValues.tokenId))
    const owner = await DomainOwner.findByPk(Utils.numberToHex(event.returnValues.tokenId))

    expect(createdEvent).to.be.instanceOf(Domain)
    expect(owner).to.be.instanceOf(DomainOwner)
    expect(owner?.address).to.be.eql(event.returnValues.to)
    expect(domainServiceEmitSpy).to.have.been.calledOnceWith('created')
  })

  it('should update Domain Owner on Tranfer', async () => {
    const event = eventMock({
      event: 'Transfer',
      transactionHash,
      returnValues: { tokenId, from, to }
    })

    // Create domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

    // Transfer
    await processor(event)

    const createdEvent = await Domain.findByPk(Utils.numberToHex(event.returnValues.tokenId))
    const newOwner = await DomainOwner.findByPk(Utils.numberToHex(event.returnValues.tokenId))

    expect(createdEvent).to.be.instanceOf(Domain)
    expect(newOwner).to.be.instanceOf(DomainOwner)
    expect(newOwner?.address).to.be.eql(event.returnValues.to)
  })

  it('should handle multiple Transfers in the same transaction', async () => {
    const event = eventMock({
      event: 'Transfer',
      transactionHash,
      returnValues: { tokenId, from, to }
    })
    const newEvent = eventMock({
      event: 'Transfer',
      transactionHash,
      returnValues: { tokenId, from: to, to: other }
    })

    // Create domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

    // Transfer
    await processor(event)

    const createdEvent = await Domain.findByPk(Utils.numberToHex(event.returnValues.tokenId))
    const newOwner = await DomainOwner.findByPk(Utils.numberToHex(event.returnValues.tokenId))

    expect(createdEvent).to.be.instanceOf(Domain)
    expect(newOwner).to.be.instanceOf(DomainOwner)
    expect(newOwner?.address).to.be.eql(event.returnValues.to)

    // Transfer to other in same transaction (same txHash)
    await processor(newEvent)

    const newCreatedEvent = await Domain.findByPk(Utils.numberToHex(newEvent.returnValues.tokenId))
    const otherOwner = await DomainOwner.findByPk(Utils.numberToHex(newEvent.returnValues.tokenId))

    expect(newCreatedEvent).to.be.instanceOf(Domain)
    expect(otherOwner).to.be.instanceOf(DomainOwner)
    expect(otherOwner?.address).to.be.eql(newEvent.returnValues.to)
  })

  it('should create new Domain with Expiration Date', async () => {
    const event = eventMock({
      event: 'ExpirationChanged',
      returnValues: { tokenId, expirationTime }
    })

    await processor(event)

    const createdEvent = await DomainExpiration.findByPk(Utils.numberToHex(event.returnValues.tokenId))
    const domain = await Domain.findByPk(Utils.numberToHex(event.returnValues.tokenId))
    const expirationTimeDB = (Date.parse(createdEvent?.date.toString() || '') / 1000).toString()

    expect(createdEvent).to.be.instanceOf(DomainExpiration)
    expect(expirationTimeDB).to.be.eql(event.returnValues.expirationTime)
    expect(domain).to.be.instanceOf(Domain)
    expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
  })

  it('should create Expiration Date for existing Domain', async () => {
    const event = eventMock({
      event: 'ExpirationChanged',
      returnValues: { tokenId, expirationTime }
    })

    // Create domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

    await processor(event)

    const createdEvent = await DomainExpiration.findByPk(Utils.numberToHex(event.returnValues.tokenId))
    const expirationTimeDB = (Date.parse(createdEvent?.date.toString() || '') / 1000).toString()

    expect(createdEvent).to.be.instanceOf(DomainExpiration)
    expect(expirationTimeDB).to.be.eql(event.returnValues.expirationTime)
  })

  it('should update Expiration Date', async () => {
    const event = eventMock({
      event: 'ExpirationChanged',
      returnValues: { tokenId, expirationTime }
    })

    // Create domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

    // Setup expiration date
    await processor(event)

    const createdEvent = await DomainExpiration.findByPk(Utils.numberToHex(event.returnValues.tokenId))
    const expirationTimeDB = (Date.parse(createdEvent?.date.toString() || '') / 1000).toString()

    expect(createdEvent).to.be.instanceOf(DomainExpiration)
    expect(expirationTimeDB).to.be.eql(event.returnValues.expirationTime)

    // Update expiration date
    const newExpirationTime = (new Date()).getTime().toString()
    const newEvent = eventMock({
      event: 'ExpirationChanged',
      returnValues: { tokenId, expirationTime: newExpirationTime }
    })

    await processor(newEvent)

    const newCreatedEvent = await DomainExpiration.findByPk(Utils.numberToHex(newEvent.returnValues.tokenId))
    const newExpirationTimeDB = (Date.parse(newCreatedEvent?.date.toString() || '') / 1000).toString()
    expect(newCreatedEvent).to.be.instanceOf(DomainExpiration)
    expect(newExpirationTimeDB).to.be.eql(newEvent.returnValues.expirationTime)
    expect(domainServiceEmitSpy).to.have.been.calledWith('patched')
  })

  it('should create new Domain with Name', async () => {
    const event = eventMock({
      event: 'NameChanged',
      returnValues: { name }
    })

    await processor(event)

    const createdEvent = await Domain.findByPk(Utils.numberToHex(tokenId))

    expect(createdEvent).to.be.instanceOf(Domain)
    expect(createdEvent?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
    expect(createdEvent?.name).to.be.eql(event.returnValues.name)
  })

  it('should create Name for existing Domain', async () => {
    const event = eventMock({
      event: 'NameChanged',
      returnValues: { name }
    })

    // Create domain
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })

    await processor(event)

    const createdEvent = await Domain.findByPk(Utils.numberToHex(tokenId))

    expect(createdEvent).to.be.instanceOf(Domain)
    expect(createdEvent?.name).to.be.eql(event.returnValues.name)
  })

  it('should Decode Name for new Domain - Batch', async () => {
    // Encoded multiple registrations for  `domain.rsk` and `domainother.rsk`
    const txInput = '0x4000aea0000000000000000000000000c0b3b62dd0400e4baa721ddec9b8a384147b23ff' +
      '0000000000000000000000000000000000000000000000003782dace9d90000000000000000000000000000000' +
      '000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000' +
      '0000000000d2f8d0881bc16d674ec80000f8c5b85ec2c414c890f8bf6a479f320ead074411a4b0e7944ea8c9c1' +
      '6d97ebe8ec0de1264229e19b6681ec254dfdb4ee52ed336e6a58d6a635bba4dd00000000000000000000000000' +
      '00000000000000000000000000000000000001646f6d61696eb863c2c414c890f8bf6a479f320ead074411a4b0' +
      'e7944ea8c9c17a134ff0de2189b133a610ff8e4a0164c1fd91a7bb3c4052b1fb1bb6792a220800000000000000' +
      '00000000000000000000000000000000000000000000000001646f6d61696e6f74686572000000000000000000' +
      '0000000000'

    const mockedTransaction = transactionMock(transactionHash, txInput)
    eth.getTransaction(transactionHash).resolves(mockedTransaction)

    const event = eventMock({
      event: 'Transfer',
      transactionHash,
      returnValues: { tokenId, from: zeroAddress, to: to }
    })

    const newEvent = eventMock({
      event: 'Transfer',
      transactionHash,
      returnValues: { tokenId: tokenOtherId, from: zeroAddress, to: to }
    })

    await processor(event)

    const createdEvent = await Domain.findByPk(Utils.numberToHex(tokenId))

    expect(createdEvent).to.be.instanceOf(Domain)
    expect(createdEvent?.name).to.be.eql(name)
    expect(domainServiceEmitSpy).to.have.been.calledWith('patched')

    await processor(newEvent)

    const newCreatedEvent = await Domain.findByPk(Utils.numberToHex(tokenOtherId))

    expect(newCreatedEvent).to.be.instanceOf(Domain)
    expect(newCreatedEvent?.name).to.be.eql(nameOther)
    expect(domainServiceEmitSpy).to.have.been.calledWith('patched')
  })
})

describe('Offer events', () => {
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>
  let processor: (event: EventData) => Promise<void>
  let offersService: RnsBaseService
  let offersServiceEmitSpy: sinon.SinonSpy

  const label = 'domain'
  const tokenId = Utils.sha3(label) as string
  const otherTokenId = Utils.sha3('other') as string
  const from = 'from_addr'
  const placement = 'placement_addr'
  const other = 'other_addr'
  const paymentToken = 'default_payment'
  const cost = 10000

  before(() => {
    sequelize = sequelizeFactory()
    eth = Substitute.for<Eth>()
    offersService = new RnsBaseService({ Model: DomainOffer })
    processor = eventProcessor(logger, eth, { offers: offersService } as RnsServices)
    offersServiceEmitSpy = sinon.spy()
    offersService.emit = offersServiceEmitSpy
  })
  beforeEach(async () => {
    await sequelize.sync({ force: true })
    offersServiceEmitSpy.resetHistory()
  })

  it('should create a new Offer', async () => {
    const event = eventMock({
      event: 'TokenPlaced',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId, paymentToken, cost }
    })

    // Create domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

    await processor(event)

    const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })

    expect(createdEvent).to.be.instanceOf(DomainOffer)
    expect(createdEvent?.tokenId).to.be.eql(Utils.numberToHex(event.returnValues.tokenId))
    expect(createdEvent?.ownerAddress).to.be.eql(owner?.address)
    expect(createdEvent?.paymentToken).to.be.eql(event.returnValues.paymentToken)
    expect(createdEvent?.priceString).to.be.eql(event.returnValues.cost.toString())
  })

  it('should replace an existing Offer when updating', async () => {
    const event = eventMock({
      event: 'TokenPlaced',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId, paymentToken, cost }
    })

    // Create domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

    // Process first offer
    await processor(event)

    const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(createdEvent).to.be.instanceOf(DomainOffer)
    expect(createdEvent?.tokenId).to.be.eql(Utils.numberToHex(event.returnValues.tokenId))
    expect(createdEvent?.ownerAddress).to.be.eql(owner?.address)
    expect(createdEvent?.paymentToken).to.be.eql(event.returnValues.paymentToken)
    expect(createdEvent?.priceString).to.be.eql(event.returnValues.cost.toString())

    // Update offer
    const newPaymentToken = 'OTHER_PAYMENT'
    const newCost = 50000
    const newEvent = eventMock({
      event: 'TokenPlaced',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId, paymentToken: newPaymentToken, cost: newCost }
    })

    // Process new offer
    await processor(newEvent)

    const newCreatedEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(newCreatedEvent).to.be.instanceOf(DomainOffer)
    expect(newCreatedEvent?.tokenId).to.be.eql(Utils.numberToHex(event.returnValues.tokenId))
    expect(newCreatedEvent?.ownerAddress).to.be.eql(owner?.address)
    expect(newCreatedEvent?.paymentToken).to.be.eql(newEvent.returnValues.paymentToken)
    expect(newCreatedEvent?.priceString).to.be.eql(newEvent.returnValues.cost.toString())
    expect(offersServiceEmitSpy).to.have.been.calledOnceWith('removed')
  })

  it('should handle multiple Offers in same transaction', async () => {
    const event = eventMock({
      event: 'TokenPlaced',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId, paymentToken, cost }
    })

    const newEvent = eventMock({
      event: 'TokenPlaced',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId: otherTokenId, paymentToken, cost }
    })

    // Create first domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

    // Create second domain with owner
    await Domain.create({ tokenId: Utils.numberToHex(otherTokenId) })
    const otherOwner = await DomainOwner.create({ tokenId: Utils.numberToHex(otherTokenId), address: from })

    // Process first offer
    await processor(event)

    const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(createdEvent).to.be.instanceOf(DomainOffer)
    expect(createdEvent?.tokenId).to.be.eql(Utils.numberToHex(event.returnValues.tokenId))
    expect(createdEvent?.ownerAddress).to.be.eql(owner?.address)
    expect(createdEvent?.paymentToken).to.be.eql(event.returnValues.paymentToken)
    expect(createdEvent?.priceString).to.be.eql(event.returnValues.cost.toString())

    // Process second offer in same transaction (same txHash)
    await processor(newEvent)

    const newCreatedEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(otherTokenId) } })
    expect(newCreatedEvent).to.be.instanceOf(DomainOffer)
    expect(newCreatedEvent?.tokenId).to.be.eql(Utils.numberToHex(newEvent.returnValues.tokenId))
    expect(newCreatedEvent?.ownerAddress).to.be.eql(otherOwner?.address)
    expect(newCreatedEvent?.paymentToken).to.be.eql(newEvent.returnValues.paymentToken)
    expect(newCreatedEvent?.priceString).to.be.eql(newEvent.returnValues.cost.toString())
  })

  it('should remove an existing Offer', async () => {
    const event = eventMock({
      event: 'TokenUnplaced',
      returnValues: { tokenId }
    })

    // Create domain, owner and offer
    const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })
    const offer = await DomainOffer.create({
      txHash: 'TX_HASH',
      ownerAddress: owner?.address,
      tokenId: Utils.numberToHex(tokenId),
      paymentToken,
      price: cost,
      priceString: cost.toString(),
      approved: true,
      creationDate: (new Date()).getTime().toString()
    })

    expect(domain).to.be.instanceOf(Domain)
    expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
    expect(owner).to.be.instanceOf(DomainOwner)
    expect(owner?.address).to.be.eql(from)
    expect(offer).to.be.instanceOf(DomainOffer)

    // Remove offer
    await processor(event)

    const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(createdEvent).to.be.eql(null)
    expect(offersServiceEmitSpy).to.have.been.calledOnceWith('removed')
  })

  it('should set approval on existing Offer', async () => {
    const event = eventMock({
      event: 'Approval',
      returnValues: { tokenId, owner: from, approved: other }
    })

    const newEvent = eventMock({
      event: 'Approval',
      returnValues: { tokenId, owner: from, approved: placement }
    })

    // Create domain, owner and offer
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })
    await DomainOffer.create({
      txHash: 'TX_HASH',
      ownerAddress: owner?.address,
      tokenId: Utils.numberToHex(tokenId),
      paymentToken,
      price: cost,
      priceString: cost.toString(),
      approved: true,
      creationDate: (new Date()).getTime().toString()
    })

    // Process Approval for other address
    await processor(event)

    const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(createdEvent).to.be.instanceOf(DomainOffer)
    expect(createdEvent?.approved).to.be.eql(false)
    expect(offersServiceEmitSpy).to.have.been.calledOnceWith('patched')

    // Process Approval back for marketplace address
    await processor(newEvent)

    const newCreatedEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(newCreatedEvent).to.be.instanceOf(DomainOffer)
    expect(newCreatedEvent?.approved).to.be.eql(true)
    expect(offersServiceEmitSpy).to.have.been.calledTwice('patched')
  })
})

describe('Sold events', () => {
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>
  let processor: (event: EventData) => Promise<void>
  let soldService: RnsBaseService
  let offersService: RnsBaseService
  let domainService: RnsBaseService
  let soldServiceEmitSpy: sinon.SinonSpy
  let offersServiceEmitSpy: sinon.SinonSpy

  const label = 'domain'
  const tokenId = Utils.sha3(label) as string
  const otherTokenId = Utils.sha3('other') as string
  const from = 'from_addr'
  const to = 'to_addr'
  const paymentToken = 'default_payment'
  const cost = 10000

  before(() => {
    sequelize = sequelizeFactory()
    eth = Substitute.for<Eth>()
    soldService = new RnsBaseService({ Model: SoldDomain })
    offersService = new RnsBaseService({ Model: DomainOffer })
    domainService = new RnsBaseService({ Model: Domain })

    processor = eventProcessor(logger, eth, { sold: soldService, offers: offersService, domains: domainService } as RnsServices)
    soldServiceEmitSpy = sinon.spy()
    soldService.emit = soldServiceEmitSpy
    offersServiceEmitSpy = sinon.spy()
    offersService.emit = offersServiceEmitSpy
  })
  beforeEach(async () => {
    await sequelize.sync({ force: true })
    soldServiceEmitSpy.resetHistory()
  })

  it('should sell a Domain', async () => {
    const event = eventMock({
      event: 'TokenSold',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId, newOwner: to }
    })

    // Create domain, owner and offer
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })
    const offer = await DomainOffer.create({
      txHash: 'TX_HASH',
      ownerAddress: owner?.address,
      tokenId: Utils.numberToHex(tokenId),
      paymentToken,
      price: cost,
      priceString: cost.toString(),
      approved: true,
      creationDate: (new Date()).getTime().toString()
    })

    // Sell Domain
    await processor(event)

    const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(createdEvent).to.be.eql(null)

    const soldEvent = await SoldDomain.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(soldEvent).to.be.instanceOf(SoldDomain)
    expect(soldEvent?.paymentToken).to.be.eql(offer?.paymentToken)
    expect(soldEvent?.priceString).to.be.eql(offer?.priceString)
    expect(soldServiceEmitSpy).to.have.been.calledOnceWith('created')
    expect(offersServiceEmitSpy).to.have.been.calledOnceWith('removed')
  })

  it('should handle multiple Sells in the same Transaction', async () => {
    const event = eventMock({
      event: 'TokenSold',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId, newOwner: to }
    })

    const newEvent = eventMock({
      event: 'TokenSold',
      transactionHash: 'TX_HASH',
      blockNumber: 1,
      returnValues: { tokenId: otherTokenId, newOwner: to }
    })

    // Create the domains, owners and offers
    await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
    const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })
    const offer = await DomainOffer.create({
      txHash: 'TX_HASH',
      ownerAddress: owner?.address,
      tokenId: Utils.numberToHex(tokenId),
      paymentToken,
      price: cost,
      priceString: cost.toString(),
      approved: true,
      creationDate: (new Date()).getTime().toString()
    })

    await Domain.create({ tokenId: Utils.numberToHex(otherTokenId) })
    const otherOwner = await DomainOwner.create({ tokenId: Utils.numberToHex(otherTokenId), address: from })
    const newOffer = await DomainOffer.create({
      txHash: 'TX_HASH',
      ownerAddress: otherOwner?.address,
      tokenId: Utils.numberToHex(otherTokenId),
      paymentToken,
      price: cost,
      priceString: cost.toString(),
      approved: true,
      creationDate: (new Date()).getTime().toString()
    })

    // Sell Domain
    await processor(event)

    const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(createdEvent).to.be.eql(null)
    const soldEvent = await SoldDomain.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
    expect(soldEvent).to.be.instanceOf(SoldDomain)
    expect(soldEvent?.paymentToken).to.be.eql(offer?.paymentToken)
    expect(soldEvent?.priceString).to.be.eql(offer?.priceString)
    expect(soldServiceEmitSpy).to.have.been.calledWith('created', { ownerAddress: owner?.address, tokenId: tokenId })
    expect(offersServiceEmitSpy).to.have.been.calledWith('removed', { tokenId: tokenId })

    // Sell second Domain in the same Transaction
    await processor(newEvent)

    const newCreatedEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(otherTokenId) } })
    expect(newCreatedEvent).to.be.eql(null)
    const newSoldEvent = await SoldDomain.findOne({ where: { tokenId: Utils.numberToHex(otherTokenId) } })
    expect(newSoldEvent).to.be.instanceOf(SoldDomain)
    expect(newSoldEvent?.paymentToken).to.be.eql(newOffer?.paymentToken)
    expect(newSoldEvent?.priceString).to.be.eql(newOffer?.priceString)
    expect(soldServiceEmitSpy).to.have.been.calledWith('created', { ownerAddress: otherOwner?.address, tokenId: otherTokenId })
    expect(offersServiceEmitSpy).to.have.been.calledWith('removed', { tokenId: otherTokenId })
  })
})
