import PlanModel from '../models/plan.model'
import { SubscriptionPlanDTO } from '../notifierService/provider'

export function deactivateDeletedPlans (currentPlans:Array<PlanModel>, incomingPlans:Array<SubscriptionPlanDTO>):void {
  const deletedPlans:Array<PlanModel> = currentPlans.filter(({
    id: currentId
  }) => !incomingPlans.some(({
    id: incomingId
  }) => (currentId === incomingId)
  ))

  if (deletedPlans.length) {
    const ids:Array<number> = deletedPlans.map(deletedPlan => deletedPlan.id)
    PlanModel.update({ planStatus: 'INACTIVE', id: ids }, { where: { id: ids } })
  }
}
