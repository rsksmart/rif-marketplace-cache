import PlanModel from '../models/plan.model'
import { SubscriptionPlanDTO } from '../notifierService/provider'

export function deactivateDeletedPlans (currentPlans:Array<PlanModel>, incomingPlans:Array<SubscriptionPlanDTO>):void {
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
        currentName === incomingName &&
        currentPlanStatus === incomingPlanStatus &&
        currentQuantity === incomingNotificationQuantity &&
        currentValidity === incomingValidity &&
        JSON.stringify(channels.map(channel => channel.name)) === JSON.stringify(incomingNotificationPreferences)
    )
    ))

    if (deletedPlans.length) {
      const ids:Array<number> = deletedPlans.map(deletedPlan => deletedPlan.id)
      PlanModel.update({ planStatus: 'INACTIVE', id: ids }, { where: { id: ids } })
    }
  }
}
