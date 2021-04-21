import { ServiceProvider } from '../../../httpClient'
import { FetchError } from 'node-fetch'
import { NotifierProviderError } from '../../../errors'
import { ClientRequestArgs } from 'http'

export type PlanStatusDTO =
    | 'ACTIVE'

export type PlanPriceDTO = {
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

export type NotifierResult<T> = {
    message: | 'OK'
    status: | 'OK'
    content: T
}

interface NotifierServiceProvider {
  getSubscriptionPlans: () => Promise<NotifierResult<any>>
  getSubscriptions: (address: string, hashes: string[]) => Promise<NotifierResult<SubscriptionPlanDTO[]>>
}

export class NotifierSvcProvider extends ServiceProvider<NotifierResult<any>> implements NotifierServiceProvider {
  constructor ({ host, port = '8080' }: Partial<ClientRequestArgs>) {
    super()

    this.defaultOptions = { host, port }
  }

  async getSubscriptions (address: string, hashes: string[]) {
    const {
      success,
      message,
      code,
      data
    } = await this._fetch({
      path: `/getSubscriptions/${hashes.toString()}`,
      headers: {
        userAddress: address
      }
    })
      .catch((error: FetchError) => {
        throw new NotifierProviderError('Notifier failed to fetch subscriptions', error)
      })

    if (!success) {
      throw new NotifierProviderError(
        NotifierProviderError.buildMessage(
          'Notifier failed to fetch subscriptions:',
          code?.toString() ?? '',
          message ?? ''
        ))
    }

    const {
      content,
      status,
      message: nMessage
    } = data

    if (nMessage !== 'OK' || status !== 'OK') {
      throw new NotifierProviderError(
        NotifierProviderError.buildMessage(
          'Notifier failed to fetch subscriptions:',
          status?.toString() ?? '',
          nMessage ?? ''
        ))
    }

    return content
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

    return data as NotifierResult<SubscriptionPlanDTO[]>
  }
}
