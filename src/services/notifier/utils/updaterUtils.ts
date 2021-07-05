import { loggingFactory } from '../../../logger'
import NotifierChannelModel from '../models/notifier-channel.model'
import PlanModel from '../models/plan.model'
import PriceModel from '../models/price.model'
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

export const updateSubscriptionsBy = async (
  providerUrl: string, consumerAddress: string, subsHashesToUpdate: string[]
): Promise<void> => {
  const [host, port] = providerUrl.split(/(?::)(\d*)$/, 2)
  const svcProvider = new NotifierSvcProvider({ host, port })
  try {
    const subscriptionsDTO: any[] = await svcProvider.getSubscriptions(consumerAddress, subsHashesToUpdate)
    await Promise.all(subscriptionsDTO.map(({
      hash,
      status,
      paid,
      notificationBalance,
      expirationDate
    }) =>
      SubscriptionModel.update(
        { status, paid, notificationBalance, expirationDate },
        { where: { hash } }
      ).catch(error => logger.warn(`Unable to update subscription with hash ${hash} in the database`, error))
    ))
  } catch (error) {
    logger.warn('Unable to update subscriptions from notifier service provider', error)
  }
}
