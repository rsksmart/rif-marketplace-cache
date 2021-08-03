<<<<<<< HEAD
import NotifierChannelModel from '../models/notifier-channel.model'
import PlanModel from '../models/plan.model'
import PriceModel from '../models/price.model'
import { NotifierSvcProvider, SubscriptionPlanDTO } from '../notifierService/provider'
=======
import BigNumber from 'bignumber.js'
import { SupportedServices } from '../../../definitions'
import { loggingFactory } from '../../../logger'
import { getTokenSymbol } from '../../utils'
import PlanModel from '../models/plan.model'
import PriceModel from '../models/price.model'
import ProviderModel from '../models/provider.model'
import SubscriptionModel from '../models/subscription.model'
import NotifierSvcProvider, { SubscriptionDTO, SubscriptionPlanDTO } from '../api/notifierSvcProvider'
>>>>>>> e21ace6 (feat(notifier): adds source to notifier channels)

function deactivateDeletedPlans (currentPlans:Array<PlanModel>, incomingPlans:Array<SubscriptionPlanDTO>):void {
  if (currentPlans && incomingPlans) {
    const deletedPlans:Array<PlanModel> = currentPlans.filter(({
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
<<<<<<< HEAD
        currentName === incomingName &&
        currentPlanStatus === incomingPlanStatus &&
        currentQuantity === incomingNotificationQuantity &&
        currentValidity === incomingValidity &&
        JSON.stringify(channels.map(channel => channel.name)) === JSON.stringify(incomingNotificationPreferences)
=======
      currentName === incomingName &&
      currentPlanStatus === incomingPlanStatus &&
      currentQuantity === incomingNotificationQuantity &&
      currentValidity === incomingValidity &&
      JSON.stringify(channels.map(({ type }) => type)) === JSON.stringify(incomingNotificationPreferences)
>>>>>>> e21ace6 (feat(notifier): adds source to notifier channels)
    )
    ))

    if (deletedPlans.length) {
      const ids:Array<number> = deletedPlans.map(deletedPlan => deletedPlan.id)
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
