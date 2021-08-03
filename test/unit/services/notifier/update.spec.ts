import { BigNumber } from 'bignumber.js'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import { Op, Sequelize } from 'sequelize'
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
          planDTO.id += 1
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
          [Op.or]: [
            { providerId: provider1.provider },
            { providerId: provider2.provider }
          ]
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
          [Op.or]: [
            { providerId: provider1.provider },
            { providerId: provider2.provider }
          ]
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
  })
})
