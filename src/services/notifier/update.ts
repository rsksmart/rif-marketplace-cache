import { Sema } from 'async-sema/lib'

import { loggingFactory } from '../../logger'
import { NotifierSvcProvider, PlanPriceDTO } from './notifierService/provider'
import PlanModel from './models/plan.model'
import ProviderModel from './models/provider.model'
import NotifierChannelModel from './models/notifier-channel.model'
import PriceModel from './models/price.model'
import { getTokenSymbol } from '../utils'
import { SupportedServices } from '../../definitions'
import { Sequelize, Transaction } from 'sequelize'

const logger = loggingFactory('notifier:updater')

const semaphore = new Sema(1)

function updatePrices (prices: PlanPriceDTO[], planId: number, dbTx: Transaction) {
  return Promise.all(prices.map(async ({
    currency: { address: { value: tokenAddress } },
    price
  }) => {
    const rateId = getTokenSymbol(tokenAddress, SupportedServices.TRIGGERS).toLowerCase()
    const [priceModel] = await PriceModel.findOrCreate({
      where: { rateId, price, planId },
      transaction: dbTx
    })
      .catch((error) => {
        throw error
      })

    return priceModel
  }))
    .catch((error) => {
      logger.error('Prices update error. Rolling back...')
      dbTx.rollback()
      throw error
    })
}

function updateChannels (channels: string[], planId: number, dbTx: Transaction) {
  return Promise.all(channels.map(async (name) => {
    const [channel, created] = await NotifierChannelModel.findOrCreate({
      where: { name, planId },
      transaction: dbTx
    })
      .catch((error) => {
        throw error
      })

    if (created) {
      logger.info(`Added new channel "${name}"`)
    }

    return channel
  }))
    .catch((error) => {
      logger.error('Channels update error. Rolling back...')
      dbTx.rollback()
      throw error
    })
}

export async function updateProvider (provider: ProviderModel, sequelize: Sequelize) {
  logger.info(`Updating ${provider.provider}'s subscription plans.`)

  const [host, port] = provider.url.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })

  try {
    const {
      content: incomingPlans
    } = await svcProvider.getSubscriptionPlans()

    const plans = await Promise.all(incomingPlans.map(async ({
      id, name,
      planStatus, validity,
      notificationPreferences,
      notificationQuantity,
      subscriptionPriceList
    }) => {
      const dbTx = await sequelize.transaction({ autocommit: false })

      const [plan, created] = await PlanModel.findOrCreate({
        where: {
          id: String(id),
          name,
          planStatus,
          daysLeft: validity,
          quantity: notificationQuantity,
          providerId: provider.provider
        },
        transaction: dbTx
      })
        .catch((error) => {
          logger.error('Plan update error. Rolling back...')
          dbTx.rollback()
          throw error
        })

      if (created) {
        logger.info(`Added new plan "${name}"`)
      }

      const channels = await updateChannels(notificationPreferences, plan.id, dbTx)
      const prices = await updatePrices(subscriptionPriceList, plan.id, dbTx)

      await plan.update({
        channels,
        prices
      })
        .catch((error) => {
          logger.error('Plan update error. Rolling back...')
          dbTx.rollback()
          throw error
        })

      dbTx.commit()
      return plan
    }))
      .catch((error) => {
        throw error
      })

    if (plans) { await provider.update('plans', plans) }
  } catch (error) {
    logger.error(error)
  }
}

export async function updater (sequelize: Sequelize, url?: string): Promise<void> {
  logger.info('Acquiring lock for update')
  await semaphore.acquire()

  try {
    logger.info('Fetching notifications providers')
    const options = url && { where: { url } }
    const providers = await ProviderModel.findAll({ ...options })

    for (const provider of providers) {
      await updateProvider(provider, sequelize).catch(logger.error)
    }
  } finally {
    semaphore.release()
  }
}
