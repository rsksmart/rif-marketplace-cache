import notifierManagerContract from '@rsksmart/rif-marketplace-notifier/build/contracts/NotifierManager.json'
import stakingContract from '@rsksmart/rif-marketplace-notifier/build/contracts/Staking.json'
import { REORG_OUT_OF_RANGE_EVENT_NAME, Web3Events } from '@rsksmart/web3-events'
import config from 'config'
import { getEndPromise } from 'sequelize-store'
import Eth from 'web3-eth'
import type { AbiItem } from 'web3-utils'
import { eventTransformerFactory } from '../../blockchain/event-transformer'
import {
  getEventsEmitterForService,
  isServiceInitialized,
  purgeBlockTrackerData
} from '../../blockchain/utils'
import {
  Application,
  CachedService,
  ServiceAddresses
} from '../../definitions'
import { loggingFactory } from '../../logger'
import { errorHandler, waitForReadyApp } from '../../utils'
import notifierChannels from './channels'
import providerHooks from './hooks/providers.hook'
import stakeHooks from './hooks/stakes.hook'
import subscriptionsHook from './hooks/subscriptions.hook'
import ProviderModel from './models/provider.model'
import NotifierStakeModel from './models/notifierStake.model'
import eventProcessor from './processor'
import {
  PlansService,
  ProviderService,
  SubscriptionsService
  NotifierStakeService as StakeService
} from './services'
import { updater } from './update'
import precache from './precache'
import plansHook from './hooks/plans.hook'
import PlanModel from './models/plan.model'
import SubscriptionModel from './models/subscription.model'

export interface NotifierServices {
  providerService: ProviderService
  stakeService: StakeService
  subscriptionService: SubscriptionsService
}

export const NOTIFICATIONS_MANAGER = 'notifier.notifierManager'
export const STAKING = 'notifier.staking'

export const notifierLogger = loggingFactory('notifier')
export const notifierManagerLogger = loggingFactory(NOTIFICATIONS_MANAGER)
export const stakingLogger = loggingFactory(STAKING)

const CONFIG_UPDATE_PERIOD = 'notifier.refresh'

const notifier: CachedService = {
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>('notifier.enabled')) {
      notifierLogger.info('Notifier service: disabled')
      return { stop: () => undefined }
    }
    notifierLogger.info('Notifier service: enabled')

    await waitForReadyApp(app)

    // We require services to be precached before running server
    if (!isServiceInitialized(NOTIFICATIONS_MANAGER) || !isServiceInitialized(STAKING)) {
      return notifierLogger.critical('Notifier service is not initialized! Run precache command.')
    }

    // Initialize Provider service
    app.use(ServiceAddresses.TRIGGERS_PROVIDERS, new ProviderService({ Model: ProviderModel }))
    const providerService = app.service(ServiceAddresses.TRIGGERS_PROVIDERS)
    providerService.hooks(providerHooks)

    // Initialize Plans service
    app.use(ServiceAddresses.TRIGGERS_OFFERS, new PlansService({ Model: PlanModel }))
    const plansService = app.service(ServiceAddresses.TRIGGERS_OFFERS)
    plansService.hooks(plansHook)

    // Initialize Subscriptions service
    app.use(ServiceAddresses.TRIGGERS_SUBSCRIPTIONS, new SubscriptionsService({ Model: SubscriptionModel }))
    const subscriptionService = app.service(ServiceAddresses.TRIGGERS_SUBSCRIPTIONS)
    subscriptionService.hooks(subscriptionsHook)

    const sequelize = app.get('sequelize')

    // Initialize Staking service
    app.use(ServiceAddresses.TRIGGERS_STAKES, new StakeService({ Model: NotifierStakeModel }))
    const stakeService = app.service(ServiceAddresses.TRIGGERS_STAKES)
    stakeService.hooks(stakeHooks)

    app.configure(notifierChannels)

    const eth = app.get('eth') as Eth
    const web3events = app.get('web3events') as Web3Events
    const confirmationService = app.service(ServiceAddresses.CONFIRMATIONS)
    const reorgEmitterService = app.service(ServiceAddresses.REORG_EMITTER)
    const services = { providerService, stakeService, subscriptionService }

    // Notification Manager watcher
    const notifierManagerEventsEmitter = getEventsEmitterForService(NOTIFICATIONS_MANAGER, web3events, notifierManagerContract.abi as AbiItem[])
    const notificationsEventParser = eventTransformerFactory(notifierManagerContract.abi as AbiItem[])
    notifierManagerEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, { eth, eventParser: notificationsEventParser }), notifierManagerLogger))
    notifierManagerEventsEmitter.on('error', (e) => {
      notifierManagerLogger.error(`There was unknown error in Events Emitter for ${NOTIFICATIONS_MANAGER}! ${e}`)
    })
    notifierManagerEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    notifierManagerEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    notifierManagerEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'notifierManager'))

    // Staking watcher
    const stakingEventsEmitter = getEventsEmitterForService(STAKING, web3events, stakingContract.abi as AbiItem[])
    const stakingEventParser = eventTransformerFactory(stakingContract.abi as AbiItem[])
    stakingEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, { eth, eventParser: stakingEventParser }), stakingLogger))
    stakingEventsEmitter.on('error', (e) => {
      stakingLogger.error(`There was unknown error in Events Emitter for ${STAKING}! ${e}`)
    })
    stakingEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    stakingEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    stakingEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'staking'))

    // Start periodical refresh
    const updatePeriod = (config.get<number>(CONFIG_UPDATE_PERIOD) ?? 3600) * 1000 // Converting seconds to ms
    const intervalId = setInterval(() => updater(sequelize).catch(notifierLogger.error), updatePeriod)

    return {
      stop: () => {
        confirmationService.removeAllListeners()
        stakingEventsEmitter.stop()
        notifierManagerEventsEmitter.stop()
        clearInterval(intervalId)
      }
    }
  },

  async purge (): Promise<void> {
    const providerCount = await ProviderModel.destroy({ where: {}, truncate: true, cascade: true })
    const stakeCount = await NotifierStakeModel.destroy({ where: {}, truncate: true, cascade: true })
    notifierLogger.info(`Removed ${providerCount} provider entries, ${stakeCount} stakes`)

    purgeBlockTrackerData(NOTIFICATIONS_MANAGER)
    purgeBlockTrackerData(STAKING)

    await getEndPromise()
  },

  precache
}

export default notifier
