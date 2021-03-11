import { Service } from 'feathers-sequelize'
import { QueryTypes } from 'sequelize'
import BigNumber from 'bignumber.js'

import type { EmitFn } from '../../definitions'
import StakeModel, { getStakesForAccount } from './models/stake.model'

export class ProviderService extends Service {
  emit?: EmitFn
}

export class TriggersStakeService extends Service {
  emit?: EmitFn

  async get (account: string): Promise<{ totalStakedFiat: string, stakes: Array<StakeModel> }> {
    const sequelize = this.Model.sequelize

    const query = getStakesForAccount(sequelize, account.toLowerCase())
    const [{ totalStakedFiat }] = await sequelize.query(query, { type: QueryTypes.SELECT, raw: true })
    return {
      totalStakedFiat: new BigNumber(totalStakedFiat || 0).toFixed(2),
      stakes: await StakeModel.findAll({ where: { account: account.toLowerCase() } })
    }
  }
}
