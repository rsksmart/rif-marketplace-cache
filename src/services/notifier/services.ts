import { Service } from 'feathers-sequelize'
import { QueryTypes, Op, literal } from 'sequelize'
import BigNumber from 'bignumber.js'

import type { EmitFn } from '../../definitions'
import NotifierStakeModel, { getStakesForAccount } from './models/notifier-stake.model'
import SubscriptionModel from './models/subscription.model'
import ProviderModel from './models/provider.model'
import { updateSubscriptionsBy } from './utils/updaterUtils'
import PlanModel from './models/plan.model'
import NotifierChannelModel from './models/notifier-channel.model'
import { Params } from '@feathersjs/feathers'

export class ProviderService extends Service {
  emit?: EmitFn
}
export class PlansService extends Service {
  emit?: EmitFn
}

type HashesByProviderAndConsumer = Record<string, Record<string, string[]>>

export class SubscriptionsService extends Service {
  emit?: EmitFn

  async find ({ query }: Params): Promise<SubscriptionModel[]> {
    await new Promise(resolve => setTimeout(resolve, 3000))

    // we don't relay on status, notificationBalance and paid properties, they don't mirror their values on the notifier provider
    // so we ignore them in the original query, update them and then run the original query
    const tmpQuery = { ...query }

    if (tmpQuery) {
      delete tmpQuery.status
      delete tmpQuery.notificationBalance
      delete tmpQuery.paid
    }

    // run query ignoring non-relayable fields
    const accountSubscriptions = await SubscriptionModel.findAll({
      raw: false,
      nest: true,
      where: tmpQuery,
      include: [
        {
          model: ProviderModel,
          as: 'provider',
          attributes: ['url']
        }
      ]
    })

    // provider -> {consumer} -> [hashes]
    const hashesByProviderAndConsumer = accountSubscriptions.reduce(
      (acc: HashesByProviderAndConsumer, current: SubscriptionModel) => {
        const { consumer, hash, provider: { url } } = current

        if (!acc[url]) {
          acc[url] = {}
          acc[url][consumer] = [hash]
        } else {
          acc[url][consumer] = [...acc[url][consumer], hash]
        }
        return acc
      }, {}
    )

    // updates DB fetching the involved subscriptions directly from the notifier service
    const updateDataPromises: Promise<void>[] = []
    Object.keys(hashesByProviderAndConsumer).forEach(providerUrl => {
      const providerSubscriptions = hashesByProviderAndConsumer[providerUrl]
      Object.keys(providerSubscriptions).forEach(consumerAddress => {
        const hashes = providerSubscriptions[consumerAddress]
        updateDataPromises.push(updateSubscriptionsBy(providerUrl, consumerAddress, hashes))
      })
    })

    await Promise.all(updateDataPromises)

    if (query?.status) {
      const { $ne } = query.status
      query.status = {
        [Op.notLike]: `%${$ne}%`
      }
    }

    return SubscriptionModel.findAll({
      raw: false,
      nest: true,
      where: query,
      include: [
        {
          model: PlanModel,
          as: 'plan',
          where: literal('plan.id = subscriptionPlanId'),
          include: [
            {
              model: NotifierChannelModel,
              as: 'channels',
              attributes: ['name'],
              required: true
            }
          ]
        },
        {
          model: ProviderModel,
          as: 'provider',
          attributes: ['url']
        }
      ],
      attributes: { exclude: ['subscriptionPlanId'] }
    })
  }
}

export class NotifierStakeService extends Service {
  emit?: EmitFn

  async get (account: string): Promise<{ totalStakedFiat: string, stakes: Array<NotifierStakeModel> }> {
    const sequelize = this.Model.sequelize

    const query = getStakesForAccount(sequelize, account.toLowerCase())
    const [{ totalStakedFiat }] = await sequelize.query(query, { type: QueryTypes.SELECT, raw: true })
    return {
      totalStakedFiat: new BigNumber(totalStakedFiat || 0).toFixed(2),
      stakes: await NotifierStakeModel.findAll({ where: { account: account.toLowerCase() } })
    }
  }
}
