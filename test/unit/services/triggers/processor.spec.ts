import BigNumber from 'bignumber.js'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import dirtyChai from 'dirty-chai'
import sinon from 'sinon'
import Eth from 'web3-eth'
import { Substitute, SubstituteOf } from '@fluffy-spoon/substitute'
import { Sequelize } from 'sequelize'

import eventProcessor from '../../../../src/services/triggers/processor'
import { TriggersServices } from '../../../../src/services/triggers'
import { ProviderService, TriggersStakeService } from '../../../../src/services/triggers/services'
import { sequelizeFactory } from '../../../../src/sequelize'
import { eventMock } from '../../../utils'
import ProviderModel from '../../../../src/services/triggers/models/provider.model'
import StakeModel from '../../../../src/services/triggers/models/triggersStake.model'
import { TriggersStakeEvents, TriggersEvents } from '../../../../src/definitions'
import {
  ProviderRegistered
} from '@rsksmart/rif-marketplace-notifications/types/web3-v1-contracts/NotificationsManager'
import { Staked, Unstaked } from '@rsksmart/rif-marketplace-notifications/types/web3-v1-contracts/Staking'
import Rate from '../../../../src/rates/rates.model'
import { wrapEvent } from '../../../../src/utils'
import { NotifierSvcProvider } from '../../../../src/services/triggers/notifierService/provider'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Triggers services: Events Processor', () => {
  const provider = 'TestAddress'
  const url = 'triggers.com'
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
    let processor: (event: TriggersEvents) => Promise<void>
    let providerService: ProviderService
    let providerServiceEmitSpy: sinon.SinonSpy

    before(() => {
      providerService = new ProviderService({ Model: ProviderModel })
      processor = eventProcessor({ providerService } as TriggersServices, { eth })
      providerServiceEmitSpy = sinon.spy()
      providerService.emit = providerServiceEmitSpy
    })
    beforeEach(async () => {
      await sequelize.sync({ force: true })
      providerServiceEmitSpy.resetHistory()
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
  })

  describe('Staking events', () => {
    const token = '0x0000000000000000000000000000000000000000'
    const account = provider.toLowerCase()
    let processor: (event: TriggersStakeEvents) => Promise<void>
    let stakeService: TriggersStakeService
    let stakeServiceEmitSpy: sinon.SinonSpy

    before(() => {
      stakeService = new TriggersStakeService({ Model: StakeModel })
      processor = eventProcessor({ stakeService } as TriggersServices, { eth })
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
