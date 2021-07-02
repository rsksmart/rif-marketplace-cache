import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { literal, Op } from 'sequelize'
import NotifierChannelModel from '../models/notifier-channel.model'
import PlanModel from '../models/plan.model'
import ProviderModel from '../models/provider.model'
import SubscriptionModel from '../models/subscription.model'
import { updateSubscriptionsBy } from '../utils/updaterUtils'

type HashesByProviderAndConsumer = Record<string, Record<string, string[]>>

export default {
  before: {
    all: [
      (context: HookContext): HookContext => {
        context.params.sequelize = {
          raw: false
        }
        return context
      }
    ],
    find: [
      async (context: HookContext): Promise<HookContext> => {
        // we don't relay on status, notificationBalance and paid properties, they don't mirror their values on the notifier provider
        // so we ignore them in the original query, update them and then run the original query
        const { query } = context.params
        const tmpQuery = { ...query }

        if (tmpQuery) {
          delete tmpQuery.status
          delete tmpQuery.notificationBalance
          delete tmpQuery.paid
        }

        // run query ignoring non-reliable fields
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
        return context
      },
      (context: HookContext): void => {
        const { query, sequelize } = context.params

        if (query?.status) {
          const { $ne } = query.status

          if ($ne) {
            sequelize.where = {
              ...sequelize.where,
              ...query,
              status: {
                [Op.notLike]: `%${$ne}%`
              }
            }
          }
        }

        context.params.sequelize = {
          ...sequelize,
          raw: false,
          nest: true,
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
              attributes: ['url'],
              required: true
            }
          ],
          attributes: { exclude: ['subscriptionPlanId'] }
        }
      }
    ],
    get: [],
    create: disallow('external'),
    update: disallow('external'),
    patch: disallow('external'),
    remove: disallow('external')
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
