import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import { EventData } from 'web3-eth-contract'
import Utils, { asciiToHex, soliditySha3 } from 'web3-utils'

import Eth from 'web3-eth'
import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize-typescript'
import { loggingFactory } from '../../../src/logger'

import eventProcessor from '../../../src/services/rns/rns.processor'
import { RnsBaseService, RnsServices } from '../../../src/services/rns'
import { sequelizeFactory } from '../../../src/sequelize'
import Domain from '../../../src/services/rns/models/domain.model'
import DomainOwner from '../../../src/services/rns/models/owner.model'
import DomainExpiration from '../../../src/services/rns/models/expiration.model'
import DomainOffer from '../../../src/services/rns/models/domain-offer.model'
import SoldDomain from '../../../src/services/rns/models/sold-domain.model'

import { eventMock } from '../../utils'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const logger = loggingFactory('rns')

describe('RNS services: Events Processor', () => {
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>

  before(() => {
    sequelize = sequelizeFactory()
    eth = Substitute.for<Eth>()
  })

  describe('Domain events', () => {
    let processor: (event: EventData) => Promise<void>
    let domainService: RnsBaseService
    let domainServiceEmitSpy: sinon.SinonSpy

    const label = 'domain'
    const name = 'domain.rsk'
    const tokenId = Utils.sha3(label) as string
    const from = 'from_addr'
    const to = 'to_addr'
    const other = 'other_addr'
    const expirationTime = (new Date()).getTime().toString()

    before(() => {
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
        transactionHash: 'tx_hash',
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
        transactionHash: 'tx_hash',
        returnValues: { tokenId, from, to }
      })

      // Create domain with owner
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)

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
        transactionHash: 'tx_hash',
        returnValues: { tokenId, from, to }
      })
      const newEvent = eventMock({
        event: 'Transfer',
        transactionHash: 'tx_hash',
        returnValues: { tokenId, from: to, to: other }
      })

      // Create domain with owner
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)

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
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)

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
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)

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
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      expect(domain).to.be.instanceOf(Domain)

      await processor(event)

      const createdEvent = await Domain.findByPk(Utils.numberToHex(tokenId))

      expect(createdEvent).to.be.instanceOf(Domain)
      expect(createdEvent?.name).to.be.eql(event.returnValues.name)
    })
  })

  describe('Offer events', () => {
    let processor: (event: EventData) => Promise<void>
    let offersService: RnsBaseService
    let offersServiceEmitSpy: sinon.SinonSpy

    const label = 'domain'
    const tokenId = Utils.sha3(label) as string
    const otherTokenId = Utils.sha3('other') as string
    const from = 'from_addr'
    const paymentToken = 'default_payment'
    const cost = 10000

    before(() => {
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
        transactionHash: 'tx_hash',
        blockNumber: 1,
        returnValues: { tokenId, paymentToken, cost }
      })

      // Create domain with owner
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)

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
        transactionHash: 'tx_hash',
        blockNumber: 1,
        returnValues: { tokenId, paymentToken, cost }
      })

      // Create domain with owner
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)

      // Process first offer
      await processor(event)

      const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
      expect(createdEvent).to.be.instanceOf(DomainOffer)
      expect(createdEvent?.tokenId).to.be.eql(Utils.numberToHex(event.returnValues.tokenId))
      expect(createdEvent?.ownerAddress).to.be.eql(owner?.address)
      expect(createdEvent?.paymentToken).to.be.eql(event.returnValues.paymentToken)
      expect(createdEvent?.priceString).to.be.eql(event.returnValues.cost.toString())

      // Update offer
      const newPaymentToken = 'other_payment'
      const newCost = 50000
      const newEvent = eventMock({
        event: 'TokenPlaced',
        transactionHash: 'tx_hash',
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
    })

    it('should handle multiple Offers in same transaction', async () => {
      const event = eventMock({
        event: 'TokenPlaced',
        transactionHash: 'tx_hash',
        blockNumber: 1,
        returnValues: { tokenId, paymentToken, cost }
      })

      const newEvent = eventMock({
        event: 'TokenPlaced',
        transactionHash: 'tx_hash',
        blockNumber: 1,
        returnValues: { tokenId: otherTokenId, paymentToken, cost }
      })

      // Create first domain with owner
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)

      // Create second domain with owner
      const otherDomain = await Domain.create({ tokenId: Utils.numberToHex(otherTokenId) })
      const otherOwner = await DomainOwner.create({ tokenId: Utils.numberToHex(otherTokenId), address: from })

      expect(otherDomain).to.be.instanceOf(Domain)
      expect(otherDomain?.tokenId).to.be.eql(Utils.numberToHex(otherTokenId))
      expect(otherOwner).to.be.instanceOf(DomainOwner)
      expect(otherOwner?.address).to.be.eql(from)

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
        txHash: 'tx_hash',
        ownerAddress: owner?.address,
        tokenId: Utils.numberToHex(tokenId),
        paymentToken,
        price: cost,
        priceString: cost.toString(),
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
    })
  })

  describe('Sold events', () => {
    let processor: (event: EventData) => Promise<void>
    let soldService: RnsBaseService
    let soldServiceEmitSpy: sinon.SinonSpy

    const label = 'domain'
    const tokenId = Utils.sha3(label) as string
    const otherTokenId = Utils.sha3('othtoer') as string
    const from = 'from_addr'
    const to = 'to_addr'
    const paymentToken = 'default_payment'
    const cost = 10000

    before(() => {
      soldService = new RnsBaseService({ Model: DomainOffer })
      processor = eventProcessor(logger, eth, { sold: soldService } as RnsServices)
      soldServiceEmitSpy = sinon.spy()
      soldService.emit = soldServiceEmitSpy
    })
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      soldServiceEmitSpy.resetHistory()
    })

    it('should sell a Domain', async () => {
      const event = eventMock({
        event: 'TokenSold',
        returnValues: { tokenId, newOwner: to }
      })

      // Create domain, owner and offer
      const domain = await Domain.create({ tokenId: Utils.numberToHex(tokenId) })
      const owner = await DomainOwner.create({ tokenId: Utils.numberToHex(tokenId), address: from })
      const offer = await DomainOffer.create({
        txHash: 'tx_hash',
        ownerAddress: owner?.address,
        tokenId: Utils.numberToHex(tokenId),
        paymentToken,
        price: cost,
        priceString: cost.toString(),
        creationDate: (new Date()).getTime().toString()
      })

      expect(domain).to.be.instanceOf(Domain)
      expect(domain?.tokenId).to.be.eql(Utils.numberToHex(tokenId))
      expect(owner).to.be.instanceOf(DomainOwner)
      expect(owner?.address).to.be.eql(from)
      expect(offer).to.be.instanceOf(DomainOffer)
      
      await processor(event)

      const createdEvent = await DomainOffer.findOne({ where: { tokenId: Utils.numberToHex(tokenId) } })
      expect(createdEvent).to.be.instanceOf(DomainOffer)
      expect(createdEvent?.tokenId).to.be.eql(Utils.numberToHex(event.returnValues.tokenId))
      expect(createdEvent?.ownerAddress).to.be.eql(owner?.address)
      expect(createdEvent?.paymentToken).to.be.eql(event.returnValues.paymentToken)
      expect(createdEvent?.priceString).to.be.eql(event.returnValues.cost.toString())
    })
  })
})
