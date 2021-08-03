import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
<<<<<<< HEAD
import { literal } from 'sequelize'
import NotifierChannelModel from '../models/notifier-channel.model'
=======
import { literal, Op } from 'sequelize'
>>>>>>> e21ace6 (feat(notifier): adds source to notifier channels)
import PlanModel from '../models/plan.model'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false
        }
        return context
      }
    ],
    find: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [
            {
              model: PlanModel,
              as: 'plan',
<<<<<<< HEAD
              where: literal('plan.id = subscriptionPlanId'),
              include: [
                {
                  model: NotifierChannelModel,
                  as: 'channels',
                  attributes: ['name'],
                  required: true
                }
              ]
=======
              where: literal('plan.id = subscriptionPlanId') // Subscription model references plan.id as subscriptionPlanId
            },
            {
              model: ProviderModel,
              as: 'provider',
              attributes: ['url'],
              required: true
>>>>>>> e21ace6 (feat(notifier): adds source to notifier channels)
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
