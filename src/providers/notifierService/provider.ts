import { ServiceProvider } from '../serviceProvider'
import { FetchError } from 'node-fetch'
import { NotifierProviderError } from '../../errors'

type PlanStatusDTO =
    | 'ACTIVE'

type PlanPriceDTO = {
    price: string
    currency: {
        name: string
        address: {
            value: string
            typeAsString: string
        }
    }
}

export type SubscriptionPlanDTO = {
    id: number
    name: string
    validity: number
    planStatus: PlanStatusDTO
    notificationPreferences: string[]
    notificationQuantity: number
    subscriptionPriceList: PlanPriceDTO[]
}

export type NotifierResult = {
    message: | 'OK'
    content: SubscriptionPlanDTO[]
}

interface NotifierServiceProvider {
    getSubscriptionPlans: () => Promise<NotifierResult>
}

export class NotifierSvcProvider extends ServiceProvider<NotifierResult> implements NotifierServiceProvider {
  constructor (host: string) {
    super()

    this.defaultOptions = { host }
  }

  async getSubscriptionPlans () {
    const {
      success,
      message,
      code,
      data
    } = await this._fetch({
      path: '/getSubscriptionPlans'
    })
      .catch((error: FetchError) => {
        throw new NotifierProviderError('Notifier failed to fetch subscription plans', error)
      })

    if (!success) {
      throw new NotifierProviderError(
        NotifierProviderError.buildMessage(
          'Notifier failed to fetch subscription plans',
          code?.toString() ?? '',
          message ?? ''
        ))
    }

    return data
  }
}
