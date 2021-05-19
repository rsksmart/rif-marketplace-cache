import chaiAsPromised from 'chai-as-promised'
import chai from 'chai'
import config from 'config'
import dirtyChai from 'dirty-chai'
import { Op, Sequelize } from 'sequelize'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { sequelizeFactory } from '../../../../src/sequelize'
import ProviderModel from '../../../../src/services/notifier/models/provider.model'
import { NotifierSvcProvider, SubscriptionPlanDTO } from '../../../../src/services/notifier/notifierService/provider'
import { updater } from '../../../../src/services/notifier/update'
import PlanModel from '../../../../src/services/notifier/models/plan.model'
import NotifierChannelModel from '../../../../src/services/notifier/models/notifier-channel.model'
import PriceModel from '../../../../src/services/notifier/models/price.model'
import { BigNumber } from 'bignumber.js'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const sandbox = sinon.createSandbox()

describe('Notifier services: Periodic Update', () => {
  let sequelize: Sequelize

  const supportedTokenAddress = 'mock_token_address'
  const supportedTokenSymbol = 'mock_token'

  const planDTO: SubscriptionPlanDTO = {
    id: 1,
    name: 'mock_plan_1',
    planStatus: 'ACTIVE',
    validity: 99,
    notificationQuantity: 666,
    notificationPreferences: ['mock_channel'],
    subscriptionPriceList: [
      {
        currency: {
          address: {
            value: supportedTokenAddress,
            typeAsString: 'address'
          },
          name: supportedTokenSymbol
        },
        price: '2000'
      }
    ]
  }

  before(() => {
    (config as any).notifier.tokens = {
      [supportedTokenAddress]: supportedTokenSymbol
    }
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

    let getSubscriptionPlansSpy: sinon.SinonSpy

    beforeEach(async () => {
      await sequelize.sync({ force: true })

      getSubscriptionPlansSpy = sandbox.stub(NotifierSvcProvider.prototype, 'getSubscriptionPlans')
        .callsFake(() => {
          planDTO.id += 1
          return Promise.resolve({
            message: 'OK',
            content: [planDTO],
            status: 'OK'
          })
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

    it('should update channels', async () => {
      const existingProviders = await ProviderModel.findAll()
      expect(existingProviders.length).to.be.equal(0)
      const exitingChannels = await NotifierChannelModel.findAll()
      expect(exitingChannels.length).to.be.equal(0)

      const provider = await ProviderModel.create(provider1)
      expect(provider).to.be.instanceOf(ProviderModel)

      await updater(sequelize)

      const plan = await PlanModel.findOne({ where: { providerId: provider1.provider } })
      expect(plan).to.be.instanceOf(PlanModel)

      const channel = await NotifierChannelModel.findOne({ where: { planId: plan?.id } })

      expect(channel).to.be.instanceOf(NotifierChannelModel)
      expect(channel?.name).to.equal(planDTO.notificationPreferences[0])
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
