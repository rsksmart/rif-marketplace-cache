import { HookContext } from '@feathersjs/feathers'
import { disallow } from 'feathers-hooks-common'
import PlanModel from '../models/plan.model'
import NotifierChannelModel from '../models/notifier-channel.model'
import PriceModel from '../models/price.model'
import { literal, Op, Sequelize } from 'sequelize'

export default {
  before: {
    all: [
      (context: HookContext) => {
        context.params.sequelize = {
          raw: false
        }
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
              as: 'plans',
              include: [
                {
                  model: NotifierChannelModel,
                  as: 'channels'
                },
                {
                  model: PriceModel,
                  as: 'prices'
                }
              ]
            }
          ],
          where: {}
        }
        return context
      },
      (context: HookContext) => {
        if (!context.params.query) return context
        const paramsSeq = context.params.sequelize
        const sequelize: Sequelize = context.app.get('sequelize')
        const { ...query } = context.params.query
        const { url } = query

        if (url) {
          const escapedHost = sequelize.escape(`%${url}%`)
          paramsSeq.where[Op.and] = [
            ...paramsSeq.where[Op.and] || [],
            literal(`lower(url) LIKE lower(${escapedHost})`)
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
