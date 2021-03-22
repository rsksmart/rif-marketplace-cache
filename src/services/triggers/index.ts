import notificationManagerContract from '@rsksmart/rif-marketplace-notifications/build/contracts/NotificationsManager.json'
import stakingContract from '@rsksmart/rif-marketplace-notifications/build/contracts/Staking.json'
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
import triggersChannels from './channels'
import providerHooks from './hooks/providers.hook'
import stakeHooks from './hooks/stakes.hook'
import ProviderModel from './models/provider.model'
import TriggersStakeModel from './models/triggersStake.model'
import eventProcessor from './processor'
import {
  ProviderService, TriggersStakeService as StakeService
} from './services'
import { updater } from './update'
import precache from './precache'

export interface TriggersServices {
  providerService: ProviderService
  stakeService: StakeService
}

export const NOTIFICATIONS_MANAGER = 'triggers.notificationsManager'
export const STAKING = 'triggers.staking'

export const triggersLogger = loggingFactory('triggers')
export const notificationsManagerLogger = loggingFactory(NOTIFICATIONS_MANAGER)
export const stakingLogger = loggingFactory(STAKING)

const CONFIG_UPDATE_PERIOD = 'triggers.refresh'

const triggers: CachedService = {
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>('triggers.enabled')) {
      triggersLogger.info('Triggers service: disabled')
      return { stop: () => undefined }
    }
    triggersLogger.info('Triggers service: enabled')

    await waitForReadyApp(app)

    // We require services to be precached before running server
    if (!isServiceInitialized(NOTIFICATIONS_MANAGER) || !isServiceInitialized(STAKING)) {
      return triggersLogger.critical('Triggers service is not initialized! Run precache command.')
    }

    // Initialize Provider service
    app.use(ServiceAddresses.TRIGGERS_PROVIDERS, new ProviderService({ Model: ProviderModel }))
    const providerService = app.service(ServiceAddresses.TRIGGERS_PROVIDERS)
    providerService.hooks(providerHooks)

    const sequelize = app.get('sequelize')

    // Initialize Staking service
    app.use(ServiceAddresses.TRIGGERS_STAKES, new StakeService({ Model: TriggersStakeModel }))
    const stakeService = app.service(ServiceAddresses.TRIGGERS_STAKES)
    stakeService.hooks(stakeHooks)

    app.configure(triggersChannels)

    const eth = app.get('eth') as Eth
    const web3events = app.get('web3events') as Web3Events
    const confirmationService = app.service(ServiceAddresses.CONFIRMATIONS)
    const reorgEmitterService = app.service(ServiceAddresses.REORG_EMITTER)
    const services = { providerService, stakeService }

    // Notification Manager watcher
    const notificationsManagerEventsEmitter = getEventsEmitterForService(NOTIFICATIONS_MANAGER, web3events, notificationManagerContract.abi as AbiItem[])
    const notificationsEventParser = eventTransformerFactory(notificationManagerContract.abi as AbiItem[])
    notificationsManagerEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, { eth, eventParser: notificationsEventParser }), notificationsManagerLogger))
    notificationsManagerEventsEmitter.on('error', (e) => {
      notificationsManagerLogger.error(`There was unknown error in Events Emitter for ${NOTIFICATIONS_MANAGER}! ${e}`)
    })
    notificationsManagerEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    notificationsManagerEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    notificationsManagerEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'notificationsManager'))

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
    const intervalId = setInterval(() => updater(sequelize).catch(triggersLogger.error), updatePeriod)

    return {
      stop: () => {
        confirmationService.removeAllListeners()
        stakingEventsEmitter.stop()
        notificationsManagerEventsEmitter.stop()
        clearInterval(intervalId)
      }
    }
  },

  async purge (): Promise<void> {
    const providerCount = await ProviderModel.destroy({ where: {}, truncate: true, cascade: true })
    const stakeCount = await TriggersStakeModel.destroy({ where: {}, truncate: true, cascade: true })
    triggersLogger.info(`Removed ${providerCount} provider entries, ${stakeCount} stakes`)

    purgeBlockTrackerData(NOTIFICATIONS_MANAGER)
    purgeBlockTrackerData(STAKING)

    await getEndPromise()
  },

  precache
}

export default triggers
