import BigNumber from 'bignumber.js'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import Eth from 'web3-eth'
import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize'

import eventProcessor from '../../../../src/services/notifier/processor'
import { NotifierServices } from '../../../../src/services/notifier'
import { ProviderService, NotifierStakeService, SubscriptionsService } from '../../../../src/services/notifier/services'
import { sequelizeFactory } from '../../../../src/sequelize'
import { eventMock } from '../../../utils'
import ProviderModel from '../../../../src/services/notifier/models/provider.model'
import StakeModel from '../../../../src/services/notifier/models/notifier-stake.model'
import { NotifierStakeEvents, NotifierEvents } from '../../../../src/definitions'
import {
  ProviderRegistered
} from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/NotifierManager'
import { Staked, Unstaked } from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/Staking'
import Rate from '../../../../src/rates/rates.model'
import { wrapEvent } from '../../../../src/utils'
import { NotifierSvcProvider } from '../../../../src/services/notifier/notifierService/provider'
import SubscriptionModel from '../../../../src/services/notifier/models/subscription.model'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const subscriptionMock = {
  id: 4,
  hash:
    '0x889a36f68d9a498fba3cdf29e14452d2ec48b2040f4c0be0970be1e5102cfc48',
  notificationBalance: 100,
  status: 'PENDING',
  expirationDate: '2021-05-01T00:00:00.000+00:00',
  paid: false,
  subscriptionPayments: [],
  subscriptionPlanId: 1,
  price: '10',
  currency: 'RBTC',
  topics:
    [
      {
        notificationPreferences: 'API',
        type: 'NEW_BLOCK',
        topicParams: []
      }
    ],
  userAddress: '0x9E0bA64907411ae6245e76b08Fda1C716aa98De7',
  providerAddress:
    {
      value: '0xc0246e727ecc35b961102dc03839e5306d2b5b21',
      typeAsString: 'address'
    }
}

describe('Notifier services: Events Processor', () => {
  const provider = 'TestAddress'
  const url = 'http://notifier.com'
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>
  let getPlansStub: sinon.SinonStub

  before(() => {
    sequelize = sequelizeFactory()
    eth = Substitute.for<Eth>()
    getPlansStub = sinon.stub(NotifierSvcProvider.prototype, 'getSubscriptionPlans')
  })

  after(() => {
    getPlansStub.restore()
  })

  describe('Provider events', () => {
    let processor: (event: NotifierEvents) => Promise<void>
    let providerService: ProviderService
    let subscriptionService: SubscriptionsService
    let providerServiceEmitSpy: sinon.SinonSpy
    let subscriptionsServiceEmitSpy: sinon.SinonSpy

    before(() => {
      providerService = new ProviderService({ Model: ProviderModel })
      subscriptionService = new SubscriptionsService({ Model: SubscriptionModel })
      processor = eventProcessor({ providerService, subscriptionService } as NotifierServices, { eth })
      providerServiceEmitSpy = sinon.spy()
      subscriptionsServiceEmitSpy = sinon.spy()
      providerService.emit = providerServiceEmitSpy
      subscriptionService.emit = subscriptionsServiceEmitSpy
    })
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      providerServiceEmitSpy.resetHistory()
      subscriptionsServiceEmitSpy.resetHistory()
    })

    it('should create new Provider', async () => {
      const event = eventMock<ProviderRegistered>({
        event: 'ProviderRegistered',
        returnValues: { provider, url }
      })
      await processor(event)
      const createdEvent = await ProviderModel.findOne({ where: { provider: event.returnValues.provider } })

      expect(createdEvent).to.be.instanceOf(ProviderModel)
      expect(providerServiceEmitSpy).to.have.been.calledOnceWith('created', wrapEvent('ProviderRegistered', { provider, url }))
    })
    it('should update existed Provider', async () => {
      const event = eventMock<ProviderRegistered>({
        event: 'ProviderRegistered',
        returnValues: { provider, url }
      })
      const existedProvider = await ProviderModel.create({ provider, url: 'test.com' })
      expect(existedProvider.url).to.be.eql('test.com')

      await processor(event)
      const updatedProvider = await ProviderModel.findOne({ where: { provider: event.returnValues.provider } })

      expect(updatedProvider).to.be.instanceOf(ProviderModel)
      expect(updatedProvider?.url).to.be.eql(url)
      expect(providerServiceEmitSpy).to.have.been.calledOnceWith('created', wrapEvent('ProviderRegistered', { provider, url }))
    })
    it('should create subscriptions', async () => {
      const provider = subscriptionMock.providerAddress.value
      const consumer = subscriptionMock.userAddress
      const hash = subscriptionMock.hash
      const sandbox = sinon.createSandbox()
      const getSubscriptionsSpy = sandbox.stub(NotifierSvcProvider.prototype, 'getSubscriptions')
        .callsFake(() => {
          return Promise.resolve([subscriptionMock])
        })
      await ProviderModel.create({ provider, url })
      const event = eventMock<ProviderRegistered>({
        event: 'SubscriptionCreated',
        returnValues: { consumer, provider, hash }
      })
      await processor(event)

      const createdSubscription = await SubscriptionModel.findOne({ where: { hash } })
      const subscriptionEmitted = {
        hash,
        providerId: provider,
        consumer,
        subscriptionId: subscriptionMock.id,
        notificationBalance: subscriptionMock.notificationBalance,
        status: subscriptionMock.status,
        subscriptionPlanId: subscriptionMock.subscriptionPlanId,
        previousSubscription: undefined,
        expirationDate: new Date(subscriptionMock.expirationDate),
        topics: subscriptionMock.topics
      }

      sandbox.assert.calledOnce(getSubscriptionsSpy)
      expect(createdSubscription).to.be.instanceOf(SubscriptionModel)
      expect(createdSubscription?.consumer).to.be.eql(subscriptionMock.userAddress)
      expect(createdSubscription?.hash).to.be.eql(subscriptionMock.hash)
      expect(createdSubscription?.status).to.be.eql(subscriptionMock.status)
      expect(createdSubscription?.topics).to.be.eql(subscriptionMock.topics)
      expect(createdSubscription?.subscriptionId).to.be.eql(subscriptionMock.id)
      expect(createdSubscription?.subscriptionPlanId).to.be.eql(subscriptionMock.subscriptionPlanId)
      expect(createdSubscription?.notificationBalance).to.be.eql(subscriptionMock.notificationBalance)
      expect(createdSubscription?.expirationDate).to.be.eql(new Date(subscriptionMock.expirationDate))
      expect(createdSubscription?.providerId).to.be.eql(subscriptionMock.providerAddress.value)
      expect(subscriptionsServiceEmitSpy).to.have.been.calledOnceWith('created', wrapEvent('SubscriptionCreated', subscriptionEmitted))
      sandbox.reset()
    })
  })

  describe('Staking events', () => {
    const token = '0x0000000000000000000000000000000000000000'
    const account = provider.toLowerCase()
    let processor: (event: NotifierStakeEvents) => Promise<void>
    let stakeService: NotifierStakeService
    let stakeServiceEmitSpy: sinon.SinonSpy

    before(() => {
      stakeService = new NotifierStakeService({ Model: StakeModel })
      processor = eventProcessor({ stakeService } as NotifierServices, { eth })
      stakeServiceEmitSpy = sinon.spy()
      stakeService.emit = stakeServiceEmitSpy
    })

    beforeEach(async () => {
      await sequelize.sync({ force: true })
      stakeServiceEmitSpy.resetHistory()
    })

    it('should create new Stake if not existed', async () => {
      const total = 1000
      const event = eventMock<Staked>({
        event: 'Staked',
        returnValues: { user: account, total, token, amount: 1000 }
      })
      await processor(event)
      const createdStake = await StakeModel.findOne({ where: { token, account } })

      expect(createdStake).to.be.instanceOf(StakeModel)
      expect(createdStake?.account).to.be.eql(account)
      expect(createdStake?.token).to.be.eql(token)
      expect(createdStake?.symbol).to.be.eql('rbtc')
      expect(stakeServiceEmitSpy).to.have.been.calledWith('updated')
    })

    describe('Staked', () => {
      it('should update stake', async () => {
        const amount = new BigNumber(1e18).toString()
        const total = amount
        const event = eventMock<Staked>({
          event: 'Staked',
          returnValues: {
            amount,
            total,
            user: account,
            token
          }
        })
        await Rate.create({ token: 'rbtc', usd: 1000 })

        await processor(event)
        const updatedStake = await StakeModel.findOne({ where: { token, account } })
        expect(updatedStake?.total).to.be.eql(new BigNumber(event.returnValues.total))
        expect(stakeServiceEmitSpy).to.have.been.calledWith('updated', { stakes: await StakeModel.findAll({ where: { account } }), totalStakedFiat: '1000.00' })
      })
    })
    describe('Unstaked', () => {
      it('should update total', async () => {
        const total = 0
        const amount = new BigNumber(1e18)
        const event = eventMock<Unstaked>({
          event: 'Unstaked',
          returnValues: {
            amount,
            total,
            user: account,
            token
          }
        })
        await Rate.create({ token: 'rbtc', usd: 1000 })
        await StakeModel.create({ token, total: amount, account })

        await processor(event)
        const updatedStake = await StakeModel.findOne({ where: { token, account } })

        expect(stakeServiceEmitSpy).to.have.been.calledWith('updated', { stakes: await StakeModel.findAll({ where: { account } }), totalStakedFiat: '0.00' })
        expect(updatedStake?.total).to.be.eql(new BigNumber(event.returnValues.total))
      })
      it('should throw if unstake without stake', async () => {
        const total = 0
        const amount = 1000
        const event = eventMock<Unstaked>({
          event: 'Unstaked',
          returnValues: {
            amount,
            total,
            user: account,
            token
          }
        })

        await expect(processor(event)).to.be.eventually.rejectedWith(
          Error,
          `Stake for account ${account}, token ${token} not exist`
        )
      })
    })
  })
})
