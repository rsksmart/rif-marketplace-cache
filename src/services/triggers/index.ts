import notificationManagerContract from '@rsksmart/rif-marketplace-notifications/build/contracts/NotificationsManager.json'
import stakingContract from '@rsksmart/rif-marketplace-notifications/build/contracts/Staking.json'
import config from 'config'
import { getEndPromise } from 'sequelize-store'
import Eth from 'web3-eth'
import type { AbiItem } from 'web3-utils'
import { Web3Events, REORG_OUT_OF_RANGE_EVENT_NAME, EventsFetcher } from '@rsksmart/web3-events'
import { Observable } from 'rxjs'

import {
  getEventsEmitterForService,
  isServiceInitialized,
  ProgressCb,
  purgeBlockTrackerData,
  reportProgress
} from '../../blockchain/utils'
import {
  Application,
  CachedService,
  Logger,
  ServiceAddresses,
  TriggersStakeEvents,
  TriggersEvents,
  NotificationManagerEvents
} from '../../definitions'
import { loggingFactory } from '../../logger'
import { errorHandler, waitForReadyApp } from '../../utils'
import ProviderModel from './models/provider.model'
import TriggersStakeModel from './models/triggersStake.model'
import providerHooks from './hooks/providers.hook'
import stakeHooks from './hooks/stakes.hook'
import eventProcessor from './processor'
import triggersChannels from './channels'
import {
  TriggersStakeService as StakeService,
  ProviderService
} from './services'
import { EventTransformer, eventTransformerFactory } from '../../blockchain/event-transformer'

export interface TriggersServices {
  providerService: ProviderService
  stakeService: StakeService
}

export const NOTIFICATIONS_MANAGER = 'triggers.notificationsManager'
const STAKING = 'triggers.staking'

const triggersLogger = loggingFactory('triggers')
const notificationsManagerLogger = loggingFactory(NOTIFICATIONS_MANAGER)
const stakingLogger = loggingFactory(STAKING)

async function precacheContract (
  eventsEmitter: EventsFetcher<TriggersEvents>,
  services: TriggersServices,
  eth: Eth,
  logger: Logger,
  progressCb: ProgressCb,
  contractName: string,
  eventParser: EventTransformer
): Promise<void> {
  const processor = eventProcessor(services, { eth, eventParser })
  for await (const batch of eventsEmitter.fetch()) {
    for (const event of batch.events) {
      await processor(event)
    }
    progressCb(batch, contractName)
  }
}

function precache (eth: Eth, web3events: Web3Events): Observable<string> {
  return reportProgress(triggersLogger,
    async (progressCb): Promise<void> => {
      const notificationMangerEventsEmitter = getEventsEmitterForService<NotificationManagerEvents>(NOTIFICATIONS_MANAGER, web3events, notificationManagerContract.abi as AbiItem[])
      const notificationMangerEventParser = eventTransformerFactory(notificationManagerContract.abi as AbiItem[])
      const stakingEventsEmitter = getEventsEmitterForService<TriggersStakeEvents>(STAKING, web3events, stakingContract.abi as AbiItem[])
      const stakingEventParser = eventTransformerFactory(stakingContract.abi as AbiItem[])

      const services: TriggersServices = {
        stakeService: new StakeService({ Model: TriggersStakeModel }),
        providerService: new ProviderService({ Model: ProviderModel })
      }

      // TODO: Can be processed in parallel
      // Precache Storage Manager
      await precacheContract(
        notificationMangerEventsEmitter,
        services,
        eth,
        notificationsManagerLogger,
        progressCb,
        'NotificationManager',
        notificationMangerEventParser
      )

      // Precache Staking
      await precacheContract(
        stakingEventsEmitter,
        services,
        eth,
        stakingLogger,
        progressCb,
        'Staking',
        stakingEventParser
      )

      web3events.removeEventsEmitter(notificationMangerEventsEmitter)
      web3events.removeEventsEmitter(stakingEventsEmitter)
    }
  )
}

const storage: CachedService = {
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
    const storageManagerEventsEmitter = getEventsEmitterForService(NOTIFICATIONS_MANAGER, web3events, notificationManagerContract.abi as AbiItem[])
    const storageEventParser = eventTransformerFactory(notificationManagerContract.abi as AbiItem[])
    storageManagerEventsEmitter.on('newEvent', errorHandler(eventProcessor(services, { eth, eventParser: storageEventParser }), notificationsManagerLogger))
    storageManagerEventsEmitter.on('error', (e) => {
      notificationsManagerLogger.error(`There was unknown error in Events Emitter for ${NOTIFICATIONS_MANAGER}! ${e}`)
    })
    storageManagerEventsEmitter.on('newConfirmation', (data) => confirmationService.emit('newConfirmation', data))
    storageManagerEventsEmitter.on('invalidConfirmation', (data) => confirmationService.emit('invalidConfirmation', data))
    storageManagerEventsEmitter.on(REORG_OUT_OF_RANGE_EVENT_NAME, (blockNumber: number) => reorgEmitterService.emitReorg(blockNumber, 'storage'))

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

    return {
      stop: () => {
        confirmationService.removeAllListeners()
        stakingEventsEmitter.stop()
        storageManagerEventsEmitter.stop()
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

export default storage
