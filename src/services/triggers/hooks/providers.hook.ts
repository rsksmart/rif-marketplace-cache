import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import PlanModel from '../models/plan.model'
import TriggersChannelModel from '../models/triggersChannel.model'
import PriceModel from '../models/price.model'
// import { lowerCaseAddressesQueryParamsHook } from '../../utils'

// const ADDRESSES_FIELDS = ['token', 'account']

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false
        }
      }
      // lowerCaseAddressesQueryParamsHook(ADDRESSES_FIELDS)
    ],
    find: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false,
          nest: true,
          include: [
            {
              model: PlanModel,
              as: 'plans',
              include: [
                {
                  model: TriggersChannelModel,
                  as: 'channels'
                },
                {
                  model: PriceModel,
                  as: 'prices'
                }
              ]
            }
          ]
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
