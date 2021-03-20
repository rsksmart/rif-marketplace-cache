
import { Sema } from 'async-sema/lib'

import { loggingFactory } from '../../logger'
import { NotifierSvcProvider } from './notifierService/provider'
import PlanModel from './models/plan.model'
import ProviderModel from './models/provider.model'
import TriggersChannelModel from './models/triggersChannel.model'
import PriceModel from './models/price.model'
import { getTokenSymbol } from '../utils'
import { Application, SupportedServices } from '../../definitions'
import { Sequelize } from 'sequelize'

const logger = loggingFactory('triggers:updater')

const semaphore = new Sema(1)

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
      const channels = await Promise.all(notificationPreferences.map(async (name) => {
        const [channel, created] = await TriggersChannelModel.findOrCreate({
          where: { name },
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

      const prices = await Promise.all(subscriptionPriceList.map(async ({
        currency: { address: { value: tokenAddress } },
        price
      }) => {
        const rateId = getTokenSymbol(tokenAddress, SupportedServices.TRIGGERS).toLowerCase()
        const [priceModel] = await PriceModel.findOrCreate({
          where: { rateId, price },
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

      const [plan, created] = await PlanModel.findOrCreate({
        where: {
          id: String(id),
          name,
          planStatus,
          daysLeft: validity,
          quantity: notificationQuantity
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
  logger.debug('Acquiring lock for update')
  await semaphore.acquire()

  try {
    logger.info('Fetching notifications providers')
    const options = url && { where: { url } }
    const providers = await ProviderModel.findAll({ ...options })

    providers.forEach(async (provider) => await updateProvider(provider, sequelize))
  } finally {
    semaphore.release()
  }
}
