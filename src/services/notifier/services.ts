import { Service } from 'feathers-sequelize'
import { QueryTypes } from 'sequelize'
import BigNumber from 'bignumber.js'

import type { EmitFn } from '../../definitions'
import NotifierStakeModel, { getStakesForAccount } from './models/notifier-stake.model'
import SubscriptionModel from './models/subscription.model'
import ProviderModel from './models/provider.model'
import { loggingFactory } from '../../logger'
import { updateSubscriptionsBy } from './utils/updaterUtils'

const logger = loggingFactory('notifier:service')

export class ProviderService extends Service {
  emit?: EmitFn
}
export class PlansService extends Service {
  emit?: EmitFn
}

export class SubscriptionsService extends Service {
  emit?: EmitFn

  async get(consumer: string): Promise<SubscriptionModel[]> {
    // find all subscriptions by consumer
    const accountSubscriptions = await SubscriptionModel.findAll({
      where: {
        consumer: consumer.toLowerCase()
      },
      include: [
        {
          model: ProviderModel,
          as: 'provider',
          attributes: ['url']
        }
      ]
    })

    // group them by provider url - assumes url of provider is unique
    const subsByProvider = accountSubscriptions.reduce(
      (acc: Record<string, SubscriptionModel[]>, current: SubscriptionModel) => {
        const { provider: { url } } = current

        if (!acc[url]) {
          acc[url] = [current]
        } else {
          acc[url] = [...acc[url], current]
        }
        return acc
      }, {}
    )

    // update all subscriptions with latest provider status
    const promises: Promise<any>[] = []
    Object.keys(subsByProvider).forEach(providerUrl => promises.push(
      updateSubscriptionsBy(providerUrl, consumer, subsByProvider[providerUrl])
    ))
    await Promise.all(promises)
    // query DB with updated data
    return SubscriptionModel.findAll({
      where: {
        consumer: consumer.toLowerCase()
      },
      include: [
        {
          model: ProviderModel,
          as: 'provider',
          attributes: ['url']
        }
      ]
    })
  }
}

export class NotifierStakeService extends Service {
  emit?: EmitFn

  async get(account: string): Promise<{ totalStakedFiat: string, stakes: Array<NotifierStakeModel> }> {
    const sequelize = this.Model.sequelize

    const query = getStakesForAccount(sequelize, account.toLowerCase())
    const [{ totalStakedFiat }] = await sequelize.query(query, { type: QueryTypes.SELECT, raw: true })
    return {
      totalStakedFiat: new BigNumber(totalStakedFiat || 0).toFixed(2),
      stakes: await NotifierStakeModel.findAll({ where: { account: account.toLowerCase() } })
    }
  }
}
