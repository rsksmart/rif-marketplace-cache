import { Eth } from 'web3-eth'
import { ProviderRegistered, SubscriptionCreated } from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/NotifierManager'

import { loggingFactory } from '../../../logger'
import { Handler, NotificationManagerEvents } from '../../../definitions'
import { wrapEvent } from '../../../utils'

import { NotifierServices } from '../index'
import ProviderModel from '../models/provider.model'
import { updater } from '../update'
import { NotifierSvcProvider } from '../notifierService/provider'
import SubscriptionModel from '../models/subscription.model'

const logger = loggingFactory('notifier:handler:provider')

export const handlers = {
  async ProviderRegistered (event: ProviderRegistered, { providerService }: NotifierServices): Promise<void> {
    const { provider, url } = event.returnValues

    const providerIns = await ProviderModel.findOne({ where: { provider } })

    if (providerIns) {
      await providerService.update(provider, { provider, url })
    } else {
      await providerService.create({ provider, url })
    }

    if (providerService.emit) providerService.emit('created', wrapEvent('ProviderRegistered', { provider, url }))
    logger.info(`Created new Provider with address ${provider} and url  ${url}`)

    const sequelize = providerIns?.sequelize

    if (sequelize) {
      logger.info(`Updating ${provider}'s plans from url...`)
      await updater(sequelize, url).catch(logger.error)
    } else {
      logger.error(`Sequelize instance not found. Cannot update ${provider}'s plans.`)
    }
  },
  async SubscriptionCreated (event: SubscriptionCreated, { subscriptionService }: NotifierServices): Promise<void> {
    const { provider, hash, consumer } = event.returnValues

    const providerIns = await ProviderModel.findOne({ where: { provider } })

    if (!providerIns) throw new Error(`Provider ${provider} not found`)

    const [host, port] = providerIns.url.split(/(?::)(\d*)$/, 2)
    const notifierService = new NotifierSvcProvider({ host, port })

    const subscriptionInfo = await notifierService.getSubscriptions([hash])

    logger.info('Subscriptions from notifier: ', subscriptionInfo)
    await SubscriptionModel.create({
      hash,
      providerId: provider,
      consumer,
      ...subscriptionInfo
    })

    if (subscriptionService.emit) subscriptionService.emit('created', wrapEvent('SubscriptionCreated', { provider, consumer, hash }))
    logger.info(`Created new Subscription ${hash} by Consumer ${consumer} for Provider ${provider}`)
  }
}

function isValidEvent (eventName: string): eventName is keyof typeof handlers {
  return eventName in handlers
}

const handler: Handler<NotificationManagerEvents, NotifierServices> = {
  events: ['ProviderRegistered', 'SubscriptionCreated'],
  process (event: NotificationManagerEvents, services: NotifierServices, { eth }): Promise<void> {
    if (!isValidEvent(event.event)) {
      return Promise.reject(new Error(`Unknown event ${event.event}`))
    }

    // @ts-ignore: we had strict types for each handler(A & B) and one type for all of event NotifierEvents(A | B)
    return handlers[event.event](event, services, eth as Eth)
  }
}

export default handler
