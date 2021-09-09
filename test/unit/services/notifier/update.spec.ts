import { BigNumber } from 'bignumber.js'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import { Sequelize } from 'sequelize'
import sinon, { SinonStub } from 'sinon'
import sinonChai from 'sinon-chai'
import { ZERO_ADDRESS } from '../../../../src/definitions'
import { sequelizeFactory } from '../../../../src/sequelize'
import NotifierSvcProvider, { NotifierChannel, NOTIFIER_RESOURCES, SubscriptionPlanDTO } from '../../../../src/services/notifier/api/notifierSvcProvider'
import PlanModel from '../../../../src/services/notifier/models/plan.model'
import PriceModel from '../../../../src/services/notifier/models/price.model'
import ProviderModel from '../../../../src/services/notifier/models/provider.model'
import { updater } from '../../../../src/services/notifier/update'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const sandbox = sinon.createSandbox()

describe('Notifier services: Periodic Update', () => {
  let sequelize: Sequelize

  const tokenAddress = ZERO_ADDRESS
  const tokenSymbol = 'rbtc'

  const mockChannel: NotifierChannel = {
    type: 'API',
    origin: 'http://nowhere.here'
  }

  const planDTO: SubscriptionPlanDTO = {
    id: 1,
    name: 'mock_plan_1',
    planStatus: 'ACTIVE',
    validity: 99,
    notificationQuantity: 666,
    notificationPreferences: [mockChannel.type],
    subscriptionPriceList: [
      {
        currency: {
          address: {
            value: tokenAddress,
            typeAsString: 'address'
          },
          name: tokenSymbol
        },
        price: '2000'
      }
    ]
  }

  const plan2DTO: SubscriptionPlanDTO = {
    id: 2,
    name: 'mock_plan_2',
    planStatus: 'ACTIVE',
    validity: 33,
    notificationQuantity: 222,
    notificationPreferences: [mockChannel.type],
    subscriptionPriceList: [
      {
        currency: {
          address: {
            value: tokenAddress,
            typeAsString: 'address'
          },
          name: tokenSymbol
        },
        price: '1000'
      }
    ]
  }

  before(() => {
    sequelize = sequelizeFactory()
  })

  describe('Update providers', () => {
    const provider1 = {
      provider: '0xPROVIDER_1',
      url: 'http://provider1.url'
    }
    const provider2 = {
      provider: '0xPROVIDER_2',
      url: 'http://provider2.url'
    }

    let getSubscriptionPlansSpy: SinonStub
    let availableNotificationPreferencesSpy: SinonStub

    beforeEach(async () => {
      await sequelize.sync({ force: true })

      getSubscriptionPlansSpy = sandbox.stub(NotifierSvcProvider.prototype, NOTIFIER_RESOURCES.getSubscriptionPlans)
        .callsFake((): ReturnType<typeof NotifierSvcProvider.prototype.getSubscriptionPlans> => {
          return Promise.resolve([planDTO])
        })

      availableNotificationPreferencesSpy = sandbox.stub(NotifierSvcProvider.prototype, NOTIFIER_RESOURCES.availableNotificationPreferences)
        .callsFake((): Promise<NotifierChannel[]> => {
          return Promise.resolve([mockChannel])
        })
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('should get subscription plans', async () => {
      const provider = await ProviderModel.create(provider1)
      expect(provider).to.be.instanceOf(ProviderModel)

      await updater(sequelize)
      sandbox.assert.calledOnce(getSubscriptionPlansSpy)
    })

    it('should update providers\' plans', async () => {
      const existingProviders = await ProviderModel.findAll()
      expect(existingProviders.length).to.be.equal(0)
      const existingPlans = await PlanModel.findAll()
      expect(existingPlans.length).to.be.equal(0)

      const providers = await ProviderModel.bulkCreate([provider1, provider2])
      providers.forEach((provider) => expect(provider).to.be.instanceOf(ProviderModel))

      await updater(sequelize)

      const providerPlans = await PlanModel.findAll({
        where: {
          providerId: [provider1.provider, provider2.provider]
        }
      })

      expect(providerPlans.length).to.be.equal(2)
    })

    it('should update only singe provider\'s plans when given url', async () => {
      const existingProviders = await ProviderModel.findAll()
      expect(existingProviders.length).to.be.equal(0)
      const existingPlans = await PlanModel.findAll()
      expect(existingPlans.length).to.be.equal(0)

      const providers = await ProviderModel.bulkCreate([provider1, provider2])
      providers.forEach((provider) => expect(provider).to.be.instanceOf(ProviderModel))

      await updater(sequelize, provider1.url)

      const providerPlans = await PlanModel.findAll({
        where: {
          providerId: [provider1.provider, provider2.provider]
        }
      })

      expect(providerPlans.length).to.be.equal(1)
    })

    it('should add channels to new plan', async () => {
      const provider = await ProviderModel.create(provider1)
      expect(provider).to.be.instanceOf(ProviderModel)
      expect((await PlanModel.findAll({ where: { providerId: provider.provider } })).length).to.be.equal(0)

      await updater(sequelize)
      sandbox.assert.calledOnce(availableNotificationPreferencesSpy)

      const plan = await PlanModel.findOne({ where: { providerId: provider1.provider } })

      expect(plan).to.be.instanceOf(PlanModel)
      const [actualChannel] = plan?.channels ?? []
      expect(actualChannel).to.deep.equal(mockChannel)
    })

    it('should update prices', async () => {
      const existingProviders = await ProviderModel.findAll()
      expect(existingProviders.length).to.be.equal(0)
      const exitingPrices = await PriceModel.findAll()
      expect(exitingPrices.length).to.be.equal(0)

      const provider = await ProviderModel.create(provider1)
      expect(provider).to.be.instanceOf(ProviderModel)

      await updater(sequelize)

      const plan = await PlanModel.findOne({ where: { providerId: provider1.provider } })
      expect(plan).to.be.instanceOf(PlanModel)

      const prices = await PriceModel.findOne({ where: { planId: plan?.id } })

      expect(prices).to.be.instanceOf(PriceModel)
      expect(prices?.price).to.be.deep.equal(new BigNumber(planDTO.subscriptionPriceList[0].price))
      expect(prices?.rateId).to.equal(planDTO.subscriptionPriceList[0].currency.name)
    })

    it('should mark plans, that are no longer present on the provider, as inactive', async () => {
      await ProviderModel.bulkCreate([provider1])

      await updater(sequelize, provider1.url)

      const [prepPlan] = await PlanModel.findAll({
        where: {
          providerId: provider1.provider
        }
      })

      expect(prepPlan.planId).to.be.equal(planDTO.id)
      expect(prepPlan.planStatus).to.be.equal('ACTIVE')

      getSubscriptionPlansSpy.callsFake((): ReturnType<typeof NotifierSvcProvider.prototype.getSubscriptionPlans> => {
        return Promise.resolve([plan2DTO])
      })
      await updater(sequelize, provider1.url)

      const plans = await PlanModel.findAll({
        where: {
          providerId: provider1.provider,
          planId: planDTO.id
        }
      })
      expect(plans.length).to.equal(1)
      const [expectedInactivePlan] = plans

      expect(expectedInactivePlan.planId).to.be.equal(planDTO.id)
      expect(expectedInactivePlan.planStatus).to.be.equal('INACTIVE')
    })

    it('should mark all plans of a provider as inactive if plans cannot be retrieved', async () => {
      await ProviderModel.bulkCreate([provider1])

      await updater(sequelize, provider1.url)

      const [prepPlan] = await PlanModel.findAll({
        where: {
          providerId: provider1.provider
        }
      })

      expect(prepPlan.planId).to.be.equal(planDTO.id)
      expect(prepPlan.planStatus).to.be.equal('ACTIVE')

      getSubscriptionPlansSpy.callsFake((): ReturnType<typeof NotifierSvcProvider.prototype.getSubscriptionPlans> => {
        return Promise.reject(Error('Meh'))
      })
      await updater(sequelize, provider1.url)

      const plans = await PlanModel.findAll({
        where: {
          providerId: provider1.provider,
          planId: planDTO.id
        }
      })
      expect(plans.length).to.equal(1)
      const [expectedInactivePlan] = plans

      expect(expectedInactivePlan.planId).to.be.equal(planDTO.id)
      expect(expectedInactivePlan.planStatus).to.be.equal('INACTIVE')
    })

    it('should reactivate plans when provider is back with same plans', async () => {
      await ProviderModel.bulkCreate([provider1])

      await updater(sequelize, provider1.url)

      const [prepPlan] = await PlanModel.findAll({
        where: {
          providerId: provider1.provider
        }
      })

      expect(prepPlan.planId).to.be.equal(planDTO.id)
      expect(prepPlan.planStatus).to.be.equal('ACTIVE')

      getSubscriptionPlansSpy.callsFake((): ReturnType<typeof NotifierSvcProvider.prototype.getSubscriptionPlans> => {
        return Promise.reject(Error('Meh'))
      })
      await updater(sequelize, provider1.url)

      getSubscriptionPlansSpy.callsFake((): ReturnType<typeof NotifierSvcProvider.prototype.getSubscriptionPlans> => {
        return Promise.resolve([planDTO])
      })
      await updater(sequelize, provider1.url)

      const plans = await PlanModel.findAll({
        where: {
          providerId: provider1.provider,
          planId: planDTO.id
        }
      })
      expect(plans.length).to.equal(1)
      const [expectedInactivePlan] = plans

      expect(expectedInactivePlan.planId).to.be.equal(planDTO.id)
      expect(expectedInactivePlan.planStatus).to.be.equal('ACTIVE')
    })
  })
})
