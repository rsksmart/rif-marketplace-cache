import { Service } from 'feathers-sequelize'
import { QueryTypes, Op } from 'sequelize'
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

type HashesByProviderAndConsumer = Record<string, Record<string, string[]>>

export class SubscriptionsService extends Service {
  emit?: EmitFn

  async find(params: any): Promise<SubscriptionModel[]> {
    console.log('entro!');

    const { query } = params
    // we don't relay on status, notificationBalance and paid properties as they might be out of date
    // so we ignore them in the original query, update them and then run the original query
    const tmpQuery = { ...query }
    delete query.status
    delete query.notificationBalance
    delete query.paid

    console.log({ tmpQuery })

    // run query ignoring outdated fields
    const accountSubscriptions = await SubscriptionModel.findAll({
      where: tmpQuery,
      include: [
        {
          model: ProviderModel,
          as: 'provider',
          attributes: ['url']
        }
      ]
    })

    console.log('hashes by provider and consumer')

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

    console.log({ hashesByProviderAndConsumer })
    console.log('before fetching from svc')

    // updates DB fetching the involved subscriptions directly from notifier service
    const updateDataPromises: Promise<any>[] = []
    Object.keys(hashesByProviderAndConsumer).forEach(providerUrl => {
      const providerSubscriptions = hashesByProviderAndConsumer[providerUrl]
      Object.keys(providerSubscriptions).forEach(consumerAddress => {
        const hashes = providerSubscriptions[consumerAddress]
        updateDataPromises.push(updateSubscriptionsBy(providerUrl, consumerAddress, hashes))
      })
    })

    await Promise.all(updateDataPromises)
    console.log('all svc done')
    console.log({ query })

    return SubscriptionModel.findAll({
      where: query,
      include: [
        {
          model: ProviderModel,
          as: 'provider',
          attributes: ['url']
        }
      ]
    })

    // return updatedResult
  }

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

    // group them by provider url
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
      updateSubscriptionsBy(providerUrl, consumer, subsByProvider[providerUrl].map(subs => subs.hash))
    ))
    await Promise.all(promises)
    // query DB with updated data
    return SubscriptionModel.findAll({
      where: {
        consumer: consumer.toLowerCase(),
        status: { [Op.notLike]: 'PENDING' }
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
