import { Sema } from 'async-sema/lib'

import { loggingFactory } from '../../logger'
import NotifierSvcProvider, { NOTIFIER_RESOURCES, PlanPriceDTO } from './api/notifierSvcProvider'
import PlanModel from './models/plan.model'
import ProviderModel from './models/provider.model'
import PriceModel from './models/price.model'
import { getTokenSymbol } from '../utils'
import { SupportedServices } from '../../definitions'
import { Sequelize, Transaction, Op } from 'sequelize'

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
  const { provider: providerId } = provider
  logger.info(`Updating ${providerId}'s subscription plans.`)

  const [host, port] = provider.url.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })

  try {
    const incomingPlans = await svcProvider.getSubscriptionPlans().catch(async (error: Error) => {
      logger.error(error)
      await PlanModel.update({
        planStatus: 'INACTIVE'
      }, { where: { providerId } })
    })

    if (!incomingPlans) return

    const availableChannels = await svcProvider[NOTIFIER_RESOURCES.availableNotificationPreferences]()

    const plans = await Promise.all(incomingPlans.map(async ({
      id, name,
      planStatus, validity,
      notificationPreferences,
      notificationQuantity,
      subscriptionPriceList
    }) => {
      const dbTx = await sequelize.transaction({ autocommit: false })

      const channels = availableChannels
        .filter(({ type }) => notificationPreferences.includes(type))

      let plan = await PlanModel.findOne({
        where: {
          planId: String(id),
          name,
          daysLeft: validity,
          quantity: notificationQuantity,
          providerId
        }
      })

      if (!plan) {
        plan = await PlanModel.create(
          {
            planId: String(id),
            planStatus,
            name,
            channels,
            daysLeft: validity,
            quantity: notificationQuantity,
            providerId

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
        .catch((error) => {
          logger.error('Plan channels & prices error. Rolling back...')
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

    const idsToBeDeactivated = (await PlanModel.findAll({ where: { providerId } }))
      .filter((plan) => !incomingPlans.some(({
        id, name, validity, notificationQuantity, planStatus
      }) => {
        return plan.planId === id &&
          plan.name === name &&
          plan.daysLeft === validity &&
          plan.quantity === notificationQuantity &&
          plan.planStatus === planStatus
      }))
      .map(({ id }) => id)

    await PlanModel.update({
      planStatus: 'INACTIVE'
    }, {
      where: {
        id: idsToBeDeactivated
      }
    })
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
