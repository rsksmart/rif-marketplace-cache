import { ReturnObject, ServiceProvider } from '../../../httpClient'
import { FetchError } from 'node-fetch'
import { NotifierProviderError } from '../../../errors'
import { ClientRequestArgs } from 'http'
import { Status, Topic } from '../models/subscription.model'

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

export type NotificationServiceTypeDTO = {
  notificationServiceType: string
  origin: string
}

export type NotifierChannel = Pick<NotificationServiceTypeDTO, 'origin'> & {
  type: string
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

export type SubscriptionDTO = {
    hash: string
    currency: {
      address: {
        value: string
      }
    }
    price: string
    expirationDate: string
    id: number
    paid: boolean
    status: Status
    notificationBalance: number
    subscriptionPlanId: number
    previousSubscription?: SubscriptionDTO
    topics: Array<Topic>
    signature: string
    userAddress: string
    subscriptionPayments: any[]
}

export type NotifierResult<T> = {
    message: | 'OK' // TODO: add the rest of the options
    status: | 'OK' // TODO: add the rest of the options
    content: T
}

export type ChannelMapper = (value: NotificationServiceTypeDTO, index: number, array: NotificationServiceTypeDTO[]) => NotifierChannel

const ERROR_MSG_PFX = 'Notifier failed at endpoint'

const RESOURCES = {
  getSubscriptions: 'getSubscriptions',
  getSubscriptionPlans: 'getSubscriptionPlans',
  availableNotificationPreferences: 'info/availableNotificationPreferences'
} as const

export const NOTIFIER_RESOURCES = RESOURCES

const getVerifiedContentFor = <T>(resourceName: string, {
  success,
  message,
  code,
  data
}: ReturnObject<NotifierResult<T>>): T => {
  if (!success) {
    throw new NotifierProviderError(`${ERROR_MSG_PFX} ${resourceName}: ${code?.toString() ?? ''}:: ${message ?? ''}`)
  }

  const {
    content,
    status,
    message: dataMessage
  } = data

  if (dataMessage !== 'OK' || status !== 'OK') {
    throw new NotifierProviderError(`${ERROR_MSG_PFX} ${resourceName}: ${status?.toString() ?? ''}:: ${dataMessage}`)
  }

  return content
}

interface NotifierServiceProvider {
  [RESOURCES.getSubscriptions]: (address: string, hashes: string[]) => Promise<SubscriptionDTO[]>
  [RESOURCES.getSubscriptionPlans]: () => Promise<SubscriptionPlanDTO[]>
  [RESOURCES.availableNotificationPreferences]: () => Promise<NotifierChannel[]>
}

export default class NotifierSvcProvider extends ServiceProvider implements NotifierServiceProvider {
  constructor ({ host, port }: Partial<ClientRequestArgs>) {
    super()

    this.defaultOptions = { host, port }
  }

  static defaultChannelMapper: ChannelMapper = ({ notificationServiceType: type, origin }) => ({ type, origin })

  async getSubscriptions (address: string, hashes?: string[]) {
    const response = await this._fetch<NotifierResult<SubscriptionDTO[]>>({
      path: `/${RESOURCES.getSubscriptions}/${hashes?.toString() ?? ''}`,
      headers: {
        userAddress: address
      }
    })
      .catch((error: FetchError) => {
        throw new NotifierProviderError(`${ERROR_MSG_PFX} ${RESOURCES.getSubscriptions}`, error)
      })

    return getVerifiedContentFor(RESOURCES.getSubscriptions, response)
  }

  async getSubscriptionPlans () {
    const response = await this._fetch<NotifierResult<SubscriptionPlanDTO[]>>({
      path: `/${RESOURCES.getSubscriptionPlans}`
    })
      .catch((error: FetchError) => {
        throw new NotifierProviderError(`${ERROR_MSG_PFX} ${RESOURCES.getSubscriptionPlans}`, error)
      })

    return getVerifiedContentFor(RESOURCES.getSubscriptions, response)
  }

  async [RESOURCES.availableNotificationPreferences] (mapper: ChannelMapper = NotifierSvcProvider.defaultChannelMapper): Promise<NotifierChannel[]> {
    const response = await this._fetch<NotifierResult<NotificationServiceTypeDTO[]>>({
      path: `/${RESOURCES.availableNotificationPreferences}`
    })
      .catch((error: FetchError) => {
        throw new NotifierProviderError(`${ERROR_MSG_PFX} ${RESOURCES.availableNotificationPreferences}`, error)
      })

    const content = getVerifiedContentFor(RESOURCES.availableNotificationPreferences, response)
    return content.map<NotifierChannel>(mapper)
  }
}
