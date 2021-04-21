import { Service } from 'feathers-sequelize'
import { QueryTypes } from 'sequelize'
import BigNumber from 'bignumber.js'

import type { EmitFn } from '../../definitions'
import TriggersStakeModel, { getStakesForAccount } from './models/triggersStake.model'

export class ProviderService extends Service {
  emit?: EmitFn
}
export class PlansService extends Service {
  emit?: EmitFn
}

export class SubscriptionsService extends Service {
  emit?: EmitFn
}

export class TriggersStakeService extends Service {
  emit?: EmitFn

  async get (account: string): Promise<{ totalStakedFiat: string, stakes: Array<TriggersStakeModel> }> {
    const sequelize = this.Model.sequelize

    const query = getStakesForAccount(sequelize, account.toLowerCase())
    const [{ totalStakedFiat }] = await sequelize.query(query, { type: QueryTypes.SELECT, raw: true })
    return {
      totalStakedFiat: new BigNumber(totalStakedFiat || 0).toFixed(2),
      stakes: await TriggersStakeModel.findAll({ where: { account: account.toLowerCase() } })
    }
  }
}
