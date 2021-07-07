import BigNumber from 'bignumber.js'
import { SupportedServices } from '../../../definitions'
import { loggingFactory } from '../../../logger'
import { getTokenSymbol } from '../../utils'
import NotifierChannelModel from '../models/notifier-channel.model'
import PlanModel from '../models/plan.model'
import PriceModel from '../models/price.model'
import ProviderModel from '../models/provider.model'
import SubscriptionModel from '../models/subscription.model'
import { NotifierSvcProvider, SubscriptionPlanDTO } from '../notifierService/provider'

const logger = loggingFactory('notifier:updaterUtils')

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
      JSON.stringify(channels.map(channel => channel.name)) === JSON.stringify(incomingNotificationPreferences)
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
    include: [{ model: NotifierChannelModel }, { model: PriceModel }]
  })
  const [host, port] = url.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })
  const { content: incomingPlans } = await svcProvider.getSubscriptionPlans() || {}
  deactivateDeletedPlans(currentPlans, incomingPlans)
}

const findOrCreateSubscription = async (subscriptionDTO:any, url:string) => {
  const {
    hash,
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
    previousSubscription: previousSubscriptionModel,
    topics,
    signature,
    userAddress: consumer
  } = subscriptionDTO

  const found = await SubscriptionModel.findOne({ where: { hash } })

  if (found) {
    return SubscriptionModel.update(
      { status, paid, notificationBalance, expirationDate },
      { where: { hash } })
  }

  const tokenSymbol = getTokenSymbol(tokenAddress, SupportedServices.NOTIFIER).toLowerCase()
  const previousSubscriptionHash = previousSubscriptionModel?.hash
  const providerModel = await ProviderModel.findOne({ where: { url } })
  const { provider } = providerModel?.id

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
    previousSubscription: previousSubscriptionHash,
    topics,
    signature
  }
  SubscriptionModel.create(subscription)
}

export const updateSubscriptionsBy = async (
  providerUrl: string, consumerAddress: string, subsHashesToUpdate: string[]
): Promise<void> => {
  const [host, port] = providerUrl.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })
  try {
    const subscriptionsDTO = await svcProvider.getSubscriptions(consumerAddress, subsHashesToUpdate)
    /* await Promise.all(subscriptionsDTO.map(({
      hash,
      status,
      paid,
      notificationBalance,
      expirationDate
    }) => {
      SubscriptionModel.update(
        { status, paid, notificationBalance, expirationDate },
        { where: { hash } }
      ).catch(error => logger.warn(`Unable to update subscription with hash ${hash} in the database`, error))
    }
    )) */
    await subscriptionsDTO.forEach((subscriptionDTO:any) => findOrCreateSubscription(subscriptionDTO, providerUrl))
  } catch (error) {
    logger.warn('Unable to update subscriptions from notifier service provider', error)
  }
}
