import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import { literal } from 'sequelize'
import NotifierChannelModel from '../models/notifier-channel.model'
import PlanModel from '../models/plan.model'
import ProviderModel from '../models/provider.model'

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
