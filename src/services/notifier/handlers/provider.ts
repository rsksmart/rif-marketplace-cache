import { Eth } from 'web3-eth'
import { ProviderRegistered, SubscriptionCreated } from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/NotifierManager'

import { loggingFactory } from '../../../logger'
import { Handler, NotificationManagerEvents, SupportedServices } from '../../../definitions'
import { wrapEvent } from '../../../utils'

import { NotifierServices } from '../index'
import ProviderModel from '../models/provider.model'
import { updater } from '../update'
import { NotifierSvcProvider } from '../notifierService/provider'
import SubscriptionModel from '../models/subscription.model'
import { getTokenSymbol } from '../../utils'
import BigNumber from 'bignumber.js'
import { NotifierProviderError } from '../../../errors'
import PlanModel from '../models/plan.model'
import NotifierChannelModel from '../models/notifier-channel.model'
import PriceModel from '../models/price.model'
import { deactivateDeletedPlans } from '../utils/updaterUtils'

const logger = loggingFactory('notifier:handler:provider')

export const handlers = {

  async ProviderRegistered (event: ProviderRegistered, { providerService }: NotifierServices): Promise<void> {
    const { provider, url } = event.returnValues

    try {
      await providerService.update(provider, { provider, url })
      try {
        const currentPlans = await PlanModel.findAll({
          where: { providerId: provider },
          include: [{ model: NotifierChannelModel }, { model: PriceModel }]
        })
        const [host, port] = url.split(/(?::)(\d*)$/, 2)
        const svcProvider = new NotifierSvcProvider({ host, port })
        const { content: incomingPlans } = await svcProvider.getSubscriptionPlans() || {}
        deactivateDeletedPlans(currentPlans, incomingPlans)
      } catch (error) {
        logger.error('error finding or deactivating deleted plans ' + error)
      }

      if (providerService.emit) providerService.emit('updated', wrapEvent('ProviderRegistered', { provider, url }))
      logger.info(`Updated Provider ${provider} with url ${url}`)
    } catch {
      await providerService.create({ provider, url })

      if (providerService.emit) providerService.emit('created', wrapEvent('ProviderRegistered', { provider, url }))
      logger.info(`Created new Provider with address ${provider} and url  ${url}`)
    }

    const sequelize = (await ProviderModel.findOne({ where: { provider } }))?.sequelize

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
    const [subscriptionDTO] = await notifierService.getSubscriptions(consumer, [hash])

    if (!subscriptionDTO) throw new Error(`Subscription ${hash} not found on provider's service at ${host}:${port} for consumer ${consumer}`)

    const {
      currency: {
        address: {
          value: tokenAddress
        }
      },
      price,
      expirationDate,
      id: subscriptionId,
      paid,
      status,
      notificationBalance,
      subscriptionPlanId,
      previousSubscription,
      topics
    } = subscriptionDTO

    const tokenSymbol = getTokenSymbol(tokenAddress, SupportedServices.NOTIFIER).toLowerCase()

    const subscription = {
      providerId: provider,
      price: new BigNumber(price),
      rateId: tokenSymbol,
      expirationDate: new Date(expirationDate),
      hash,
      consumer,
      subscriptionId,
      paid,
      status,
      notificationBalance,
      subscriptionPlanId,
      previousSubscription,
      topics
    }

    await SubscriptionModel.create(subscription)

    if (subscriptionService.emit) subscriptionService.emit('created', wrapEvent('SubscriptionCreated', subscription))
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
