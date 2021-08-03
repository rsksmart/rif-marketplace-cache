import { Sema } from 'async-sema/lib'

import { loggingFactory } from '../../logger'
import NotifierSvcProvider, { NotifierChannel, NOTIFIER_RESOURCES, PlanPriceDTO } from './api/notifierSvcProvider'
import PlanModel from './models/plan.model'
import ProviderModel from './models/provider.model'
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
    const rateId = getTokenSymbol(tokenAddress, SupportedServices.NOTIFIER).toLowerCase()
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

export async function updateProvider (provider: ProviderModel, sequelize: Sequelize):Promise<void> {
  logger.info(`Updating ${provider.provider}'s subscription plans.`)

  const [host, port] = provider.url.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })

  try {
    const incomingPlans = await svcProvider.getSubscriptionPlans()

    const availableChannels = await svcProvider[NOTIFIER_RESOURCES.availableNotificationPreferences]()

    const plans = await Promise.all(incomingPlans.map(async ({
      id, name,
      planStatus, validity,
      notificationPreferences,
      notificationQuantity,
      subscriptionPriceList
    }) => {
      const dbTx = await sequelize.transaction({ autocommit: false })

<<<<<<< HEAD
      const [plan, created] = await PlanModel.findOrCreate({
=======
      const channels = availableChannels.filter(({ type }) => notificationPreferences.includes(type))

      let plan = await PlanModel.findOne({
>>>>>>> e21ace6 (feat(notifier): adds source to notifier channels)
        where: {
          planId: String(id),
          name,
          planStatus,
          daysLeft: validity,
          quantity: notificationQuantity,
          providerId: provider.provider
        },
        transaction: dbTx
      })
        .catch((error) => {
          logger.error('Plan update error. Rolling back...' + error)
          dbTx.rollback()
          throw error
        })

<<<<<<< HEAD
      if (created) {
        logger.info(`Added new plan "${name}"`)
      }

      const channels = await updateChannels(notificationPreferences, plan.id, dbTx)
      const prices = await updatePrices(subscriptionPriceList, plan.id, dbTx)

      await plan.update({
        channels,
        prices
      }, { transaction: dbTx })
=======
      if (!plan) {
        plan = await PlanModel.create(
          {
            planId: String(id),
            planStatus,
            name,
            channels,
            daysLeft: validity,
            quantity: notificationQuantity,
            providerId: provider.provider

          }, {
            transaction: dbTx
          })
          .catch((error) => {
            logger.error('Plan creation error. Rolling back...' + error)
            dbTx.rollback()
            throw error
          })

        logger.info(`Added new plan "${name}"`)
      } else {
        plan.set('planStatus', planStatus)
        plan.set('channels', channels)
      }
      const prices = await updatePrices(subscriptionPriceList, plan.id, dbTx)

      plan.set({ prices })
      await plan.save({ transaction: dbTx })
>>>>>>> e21ace6 (feat(notifier): adds source to notifier channels)
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
