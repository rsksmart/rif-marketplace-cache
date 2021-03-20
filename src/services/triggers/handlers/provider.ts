import { Eth } from 'web3-eth'
import { ProviderRegistered } from '@rsksmart/rif-marketplace-notifications/types/web3-v1-contracts/NotificationsManager'

import { loggingFactory } from '../../../logger'
import { Handler, NotificationManagerEvents } from '../../../definitions'
import { wrapEvent } from '../../../utils'

import { TriggersServices } from '../index'
import ProviderModel from '../models/provider.model'

const logger = loggingFactory('triggers:handler:provider')

export const handlers = {
  async ProviderRegistered (event: ProviderRegistered, { providerService }: TriggersServices): Promise<void> {
    const { provider, url } = event.returnValues

    const providerIns = await ProviderModel.findOne({ where: { provider } })

    if (providerIns) {
      await providerService.update(provider, { provider, url })
    } else {
      await providerService.create({ provider, url })
    }

    if (providerService.emit) providerService.emit('created', wrapEvent('ProviderRegistered', { provider, url }))
    logger.info(`Created new Provider with address ${provider} and url  ${url}`)
  }
}

function isValidEvent (eventName: string): eventName is keyof typeof handlers {
  return eventName in handlers
}

const handler: Handler<NotificationManagerEvents, TriggersServices> = {
  events: ['ProviderRegistered'],
  process (event: NotificationManagerEvents, services: TriggersServices, { eth }): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    // @ts-ignore: we had strict types for each handler(A & B) and one type for all of event TriggersEvents(A | B)
    return handlers[event.event](event, services, eth as Eth)
  }
}
export default handler
