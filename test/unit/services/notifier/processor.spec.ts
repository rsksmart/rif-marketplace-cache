import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import {
  ProviderRegistered, SubscriptionCreated
} from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/NotifierManager'
import { Staked, Unstaked } from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/Staking'
import BigNumber from 'bignumber.js'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import { Sequelize } from 'sequelize'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { Eth } from 'web3-eth'
import { NotifierEvents, NotifierStakeEvents, SupportedServices, ZERO_ADDRESS } from '../../../../src/definitions'
import Rate from '../../../../src/rates/rates.model'
import { sequelizeFactory } from '../../../../src/sequelize'
import { NotifierServices } from '../../../../src/services/notifier'
import NotifierSvcProvider, { NotificationServiceTypeDTO, NOTIFIER_RESOURCES, PlanPriceDTO, SubscriptionDTO, SubscriptionPlanDTO } from '../../../../src/services/notifier/api/notifierSvcProvider'
import StakeModel from '../../../../src/services/notifier/models/notifier-stake.model'
import PlanModel from '../../../../src/services/notifier/models/plan.model'
import ProviderModel from '../../../../src/services/notifier/models/provider.model'
import SubscriptionModel from '../../../../src/services/notifier/models/subscription.model'
import eventProcessor from '../../../../src/services/notifier/processor'
import { NotifierStakeService, ProviderService, SubscriptionsService } from '../../../../src/services/notifier/services'
import { getTokenSymbol } from '../../../../src/services/utils'
import { wrapEvent } from '../../../../src/utils'
import { eventMock } from '../../../utils'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Notifier services: Events Processor', () => {
  const provider = '0x7357ADD6355'
  const url = 'http://notifier.com'
  let sequelize: Sequelize
  let eth: SubstituteOf<Eth>
  let getPlansStub: sinon.SinonStub

  const mockPriceDto: PlanPriceDTO = {
    price: '10000000000000000000',
    currency: {
      address: {
        value: '0x12345',
        typeAsString: 'string'
      },
      name: 'rif'
    }
  }

  const mockAvailableChannelDto: NotificationServiceTypeDTO = {
    notificationServiceType: 'API',
    origin: 'http://no.where'
  }

  const mockSubscriptionPlanDto: SubscriptionPlanDTO = {
    id: 99,
    name: 'plan_1',
    planStatus: 'ACTIVE',
    validity: 100,
    notificationQuantity: 100,
    notificationPreferences: [mockAvailableChannelDto.notificationServiceType],
    subscriptionPriceList: [mockPriceDto]
  }

  const mockSubscriptionDto: SubscriptionDTO = {
    id: 4,
    hash:
    '0x889a36f68d9a498fba3cdf29e14452d2ec48b2040f4c0be0970be1e5102cfc48',
    notificationBalance: 100,
    status: 'PENDING',
    expirationDate: '2021-05-01T00:00:00.000+00:00',
    paid: false,
    subscriptionPayments: [],
    subscriptionPlanId: mockSubscriptionPlanDto.id,
    price: mockPriceDto.price,
    currency: mockPriceDto.currency,
    topics:
    [
      {
        notificationPreferences: mockAvailableChannelDto.notificationServiceType,
        type: 'NEW_BLOCK',
        topicParams: []
      }
    ],
    userAddress: '0x9E0bA64907411ae6245e76b08Fda1C716aa98De7',
    signature: '0x8bcf2775c3b6321cd76e93a608770fe419a2b9407caee5a48179e746e02768d01d634a5c7c2ba0af13aea71ba690c3af91c1b381e2a0e2aa483e2e01fdd85afa1b'
  }

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
      expect(providerServiceEmitSpy).to.have.been.calledOnceWith('updated', wrapEvent('ProviderRegistered', { provider, url }))
    })

    it('should create subscriptions', async () => {
      const planTemplate = {
        planId: String(mockSubscriptionPlanDto.id),
        planStatus: mockSubscriptionPlanDto.planStatus,
        name: mockSubscriptionPlanDto.name,
        channels: [
          {
            name: mockAvailableChannelDto.notificationServiceType,
            source: mockAvailableChannelDto.origin
          }
        ],
        daysLeft: mockSubscriptionPlanDto.validity,
        quantity: mockSubscriptionPlanDto.notificationQuantity,
        providerId: provider
      }
      const consumer = mockSubscriptionDto.userAddress
      const hash = mockSubscriptionDto.hash
      const sandbox = sinon.createSandbox()
      const getSubscriptionsSpy = sandbox.stub(NotifierSvcProvider.prototype, NOTIFIER_RESOURCES.getSubscriptions)
        .callsFake((): ReturnType<typeof NotifierSvcProvider.prototype.getSubscriptions> => {
          return Promise.resolve([mockSubscriptionDto])
        })
      await ProviderModel.create({ provider, url })
      const event = eventMock<SubscriptionCreated>({
        event: 'SubscriptionCreated',
        returnValues: { consumer, provider, hash }
      })

      const plan = await PlanModel.create(planTemplate)
      await processor(event)

      const createdSubscription = await SubscriptionModel.findOne({ where: { hash } })
      const expectedDate = new Date(mockSubscriptionDto.expirationDate)
      const expectedPrice = new BigNumber(mockSubscriptionDto.price)
      const expectedCurrency = getTokenSymbol(mockSubscriptionDto.currency.address.value, SupportedServices.NOTIFIER).toLowerCase()

      const subscriptionEmitted = {
        hash,
        providerId: provider,
        consumer,
        subscriptionId: mockSubscriptionDto.id,
        previousSubscription: undefined,
        expirationDate: expectedDate,
        price: expectedPrice,
        rateId: expectedCurrency,
        notificationBalance: mockSubscriptionDto.notificationBalance,
        status: mockSubscriptionDto.status,
        paid: mockSubscriptionDto.paid,
        topics: mockSubscriptionDto.topics,
        subscriptionPlanId: plan.id,
        signature: mockSubscriptionDto.signature
      }

      sandbox.assert.calledOnce(getSubscriptionsSpy)
      expect(createdSubscription).to.be.instanceOf(SubscriptionModel)
      expect(createdSubscription?.consumer).to.be.eql(mockSubscriptionDto.userAddress)
      expect(createdSubscription?.hash).to.be.eql(mockSubscriptionDto.hash)
      expect(createdSubscription?.status).to.be.eql(mockSubscriptionDto.status)
      expect(createdSubscription?.topics).to.be.eql(mockSubscriptionDto.topics)
      expect(createdSubscription?.subscriptionId).to.be.eql(mockSubscriptionDto.id)
      expect(createdSubscription?.subscriptionPlanId).to.be.eql(plan.id)
      expect(createdSubscription?.notificationBalance).to.be.eql(mockSubscriptionDto.notificationBalance)
      expect(createdSubscription?.expirationDate).to.be.eql(expectedDate)
      expect(createdSubscription?.paid).to.be.eql(mockSubscriptionDto.paid)
      expect(createdSubscription?.price).to.be.eql(expectedPrice)
      expect(createdSubscription?.rateId).to.be.eql(expectedCurrency)
      expect(createdSubscription?.providerId).to.be.eql(provider)
      expect(subscriptionsServiceEmitSpy).to.have.been.calledOnceWith('created', wrapEvent('SubscriptionCreated', subscriptionEmitted))
      sandbox.reset()
    })
  })

  describe('Staking events', () => {
    const token = ZERO_ADDRESS
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
