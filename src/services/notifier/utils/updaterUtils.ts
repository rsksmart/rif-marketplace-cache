import BigNumber from 'bignumber.js'
import { SupportedServices } from '../../../definitions'
import { loggingFactory } from '../../../logger'
import { getTokenSymbol } from '../../utils'
import PlanModel from '../models/plan.model'
import PriceModel from '../models/price.model'
import ProviderModel from '../models/provider.model'
import SubscriptionModel from '../models/subscription.model'
import NotifierSvcProvider, { SubscriptionDTO, SubscriptionPlanDTO } from '../api/notifierSvcProvider'

const logger = loggingFactory('notifier:updaterUtils')

const SUBSCRIPTION_PAYMENT_STATUS = {
  RECEIVED: 'RECEIVED',
  WITHDRAWN: 'WITHDRAWN'
} as const

function deactivateDeletedPlans (currentPlans: Array<PlanModel>, incomingPlans: Array<SubscriptionPlanDTO>): void {
  if (currentPlans && incomingPlans) {
    const deletedPlans: Array<PlanModel> = currentPlans.filter(({
      planId: currentId,
      name: currentName,
      planStatus: currentPlanStatus,
      quantity: currentQuantity,
      daysLeft: currentValidity,
      channels
    }) => !incomingPlans.some(({
      id: incomingId,
      name: incomingName,
      validity: incomingValidity,
      planStatus: incomingPlanStatus,
      notificationPreferences: incomingNotificationPreferences,
      notificationQuantity: incomingNotificationQuantity
    }) => (currentId === incomingId &&
      currentName === incomingName &&
      currentPlanStatus === incomingPlanStatus &&
      currentQuantity === incomingNotificationQuantity &&
      currentValidity === incomingValidity &&
      JSON.stringify(channels.map(({ type }) => type)) === JSON.stringify(incomingNotificationPreferences)
    )
    ))

    if (deletedPlans.length) {
      const ids: Array<number> = deletedPlans.map(deletedPlan => deletedPlan.id)
      PlanModel.update({ planStatus: 'INACTIVE' }, { where: { id: ids } })
    }
  }
}

export async function deactivateDeletedPlansForProvider (provider: string, url: string): Promise<void> {
  const currentPlans = await PlanModel.findAll({
    where: { providerId: provider },
    include: [{ model: PriceModel }]
  })
  const [host, port] = url.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })
  const incomingPlans = await svcProvider.getSubscriptionPlans()
  deactivateDeletedPlans(currentPlans, incomingPlans)
}

export const buildSubscriptionFromDTO = async (subscriptionDTO: SubscriptionDTO, provider: string): Promise<any> => {
  const {
    currency: {
      address: {
        value: tokenAddress
      }
    },
    price,
    expirationDate,
    id: subscriptionId,
    subscriptionPlanId,
    previousSubscription: previousSubscriptionModel,
    userAddress: consumer,
    hash,
    notificationBalance,
    paid,
    signature,
    status,
    topics
  } = subscriptionDTO

  const rateId = getTokenSymbol(tokenAddress, SupportedServices.NOTIFIER).toLowerCase()

  const plan = await PlanModel.findOne({
    where: {
      planId: subscriptionPlanId,
      planStatus: 'ACTIVE',
      providerId: provider
    }
  })

  if (!(plan && rateId)) throw new Error('Bad SubscriptioDTO object')

  return {
    rateId,
    providerId: provider,
    subscriptionId,
    subscriptionPlanId: plan.id,
    price: new BigNumber(price),
    expirationDate: new Date(expirationDate),
    previousSubscription: previousSubscriptionModel?.hash,
    consumer,
    hash,
    notificationBalance,
    paid,
    signature,
    status,
    topics
  }
}

const findOrCreateSubscription = async (subscriptionDTO: SubscriptionDTO, url: string) => {
  const {
    hash,
    status,
    paid,
    notificationBalance,
    expirationDate,
    subscriptionPayments
  } = subscriptionDTO

  const balance = {
    paid: new BigNumber(0),
    withdrawn: new BigNumber(0)
  }

  subscriptionPayments.reduce((acc, curr) => {
    const { status, amount } = curr
    const bnAmount = new BigNumber(amount)

    if (status === SUBSCRIPTION_PAYMENT_STATUS.RECEIVED) {
      acc.paid = acc.paid.plus(bnAmount)
    } else if (status === SUBSCRIPTION_PAYMENT_STATUS.WITHDRAWN) {
      acc.withdrawn = acc.withdrawn.plus(bnAmount)
    }
    return acc
  }, balance)

  const withdrawableFunds = balance.paid.minus(balance.withdrawn)
  const found = await SubscriptionModel.findOne({ where: { hash } })

  if (found) {
    return SubscriptionModel.update(
      { status, paid, notificationBalance, expirationDate, withdrawableFunds },
      { where: { hash } })
  }
  const providerModel = await ProviderModel.findOne({ where: { url } })
  const provider = providerModel?.provider

  if (!provider) {
    throw new Error(`Provider model with url ${url} not found.`)
  }

  const subscription = await buildSubscriptionFromDTO(subscriptionDTO, provider)
  return SubscriptionModel.create({ ...subscription, withdrawableFunds })
}

export const updateSubscriptionsBy = async (
  providerUrl: string, consumerAddress: string): Promise<void> => {
  const [host, port] = providerUrl.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })
  try {
    const subscriptionsDTO: Array<SubscriptionDTO> = await svcProvider.getSubscriptions(consumerAddress)

    await Promise.all(
      subscriptionsDTO.map(
        (subscription) => findOrCreateSubscription(
          subscription, providerUrl
        ).catch(
          error => logger.warn(`Unable to update or create subscription with hash ${subscription.hash} in the database`, error)
        )
      )
    )
  } catch (error) {
    logger.warn('Unable to update subscriptions from notifier service provider', error)
  }
}
