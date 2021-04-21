import { Service } from 'feathers-sequelize'
import { QueryTypes } from 'sequelize'
import BigNumber from 'bignumber.js'

import type { EmitFn } from '../../definitions'
import NotifierStakeModel, { getStakesForAccount } from './models/notifierStake.model'

export class ProviderService extends Service {
  emit?: EmitFn
}
export class PlansService extends Service {
  emit?: EmitFn
}

export class SubscriptionsService extends Service {
  emit?: EmitFn
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
