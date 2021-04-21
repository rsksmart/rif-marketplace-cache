import notifierManagerContract from '@rsksmart/rif-marketplace-notifier/build/contracts/NotifierManager.json'
import stakingContract from '@rsksmart/rif-marketplace-notifier/build/contracts/Staking.json'
import { EventsFetcher, Web3Events } from '@rsksmart/web3-events'
import { Observable } from 'rxjs'
import Eth from 'web3-eth'
import type { AbiItem } from 'web3-utils'
import { notifierManagerLogger, NOTIFICATIONS_MANAGER, STAKING, stakingLogger, notifierLogger, NotifierServices } from '.'
import { EventTransformer, eventTransformerFactory } from '../../blockchain/event-transformer'
import {
  getEventsEmitterForService,
  ProgressCb,
  reportProgress
} from '../../blockchain/utils'
import {
  Logger,
  NotificationManagerEvents, NotifierEvents, NotifierStakeEvents
} from '../../definitions'
import ProviderModel from './models/provider.model'
import NotifierStakeModel from './models/notifier-stake.model'
import eventProcessor from './processor'
import {
  ProviderService, NotifierStakeService as StakeService, SubscriptionsService
} from './services'
import SubscriptionModel from './models/subscription.model'

async function precacheContract (
  eventsEmitter: EventsFetcher<NotifierEvents>,
  services: NotifierServices,
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
  return reportProgress(notifierLogger,
    async (progressCb): Promise<void> => {
      const notifierMangerEventsEmitter = getEventsEmitterForService<NotificationManagerEvents>(NOTIFICATIONS_MANAGER, web3events, notifierManagerContract.abi as AbiItem[])
      const notifierMangerEventParser = eventTransformerFactory(notifierManagerContract.abi as AbiItem[])
      const stakingEventsEmitter = getEventsEmitterForService<NotifierStakeEvents>(STAKING, web3events, stakingContract.abi as AbiItem[])
      const stakingEventParser = eventTransformerFactory(stakingContract.abi as AbiItem[])

      const services: NotifierServices = {
        stakeService: new StakeService({ Model: NotifierStakeModel }),
        providerService: new ProviderService({ Model: ProviderModel }),
        subscriptionService: new SubscriptionsService({ Model: SubscriptionModel })
      }

      // TODO: Can be processed in parallel
      // Precache Notifier Manager
      await precacheContract(
        notifierMangerEventsEmitter,
        services,
        eth,
        notifierManagerLogger,
        progressCb,
        'NotifierManager',
        notifierMangerEventParser
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

      web3events.removeEventsEmitter(notifierMangerEventsEmitter)
      web3events.removeEventsEmitter(stakingEventsEmitter)
    }
  )
}
