import notificationManagerContract from '@rsksmart/rif-marketplace-notifications/build/contracts/NotificationsManager.json'
import stakingContract from '@rsksmart/rif-marketplace-notifications/build/contracts/Staking.json'
import { EventsFetcher, Web3Events } from '@rsksmart/web3-events'
import { Observable } from 'rxjs'
import Eth from 'web3-eth'
import type { AbiItem } from 'web3-utils'
import { notificationsManagerLogger, NOTIFICATIONS_MANAGER, STAKING, stakingLogger, triggersLogger, TriggersServices } from '.'
import { EventTransformer, eventTransformerFactory } from '../../blockchain/event-transformer'
import {
  getEventsEmitterForService,
  ProgressCb,
  reportProgress
} from '../../blockchain/utils'
import {
  Logger,
  NotificationManagerEvents, TriggersEvents, TriggersStakeEvents
} from '../../definitions'
import ProviderModel from './models/provider.model'
import TriggersStakeModel from './models/triggersStake.model'
import eventProcessor from './processor'
import {
  ProviderService, TriggersStakeService as StakeService
} from './services'

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

export default function precache (eth: Eth, web3events: Web3Events): Observable<string> {
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
      // Precache Notifications Manager
      await precacheContract(
        notificationMangerEventsEmitter,
        services,
        eth,
        notificationsManagerLogger,
        progressCb,
        'NotificationsManager',
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
