import { Service } from 'feathers-sequelize'
import config from 'config'
import { getAvgMinMaxBillingPriceQuery, getMinMaxAvailableCapacityQuery } from './utils'
import { QueryTypes } from 'sequelize'
import BigNumber from 'bignumber.js'

import type { EmitFn } from '../../definitions'
import StakeModel, { getStakesForAccount } from './models/stake.model'

export class AvgBillingPriceService extends Service {
  emit?: EmitFn

  async get (): Promise<{ min: number, max: number }> {
    if (!config.get('storage.tokens')) {
      throw new Error('"storage.tokens" not exist in config')
    }
    const sequelize = this.Model.sequelize

    const avgMin = await sequelize.query(getAvgMinMaxBillingPriceQuery(-1), { type: QueryTypes.SELECT, raw: true })
    const avgMax = await sequelize.query(getAvgMinMaxBillingPriceQuery(1), { type: QueryTypes.SELECT, raw: true })
    return {
      min: avgMin[0]?.avgPrice || 0,
      max: avgMax[0]?.avgPrice + 1 || 0
    }
  }
}

export class OfferService extends Service {
  emit?: EmitFn
}

export class AgreementService extends Service {
  emit?: EmitFn
}

export class StakeService extends Service {
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

export class AvailableCapacityService extends Service {
  emit?: EmitFn

  async get (): Promise<{ min: number, max: number }> {
    const sequelize = this.Model.sequelize

    const capacityMin = await sequelize.query(
      getMinMaxAvailableCapacityQuery(-1),
      { type: QueryTypes.SELECT, raw: true }
    )
    const capacityMax = await sequelize.query(
      getMinMaxAvailableCapacityQuery(1),
      { type: QueryTypes.SELECT, raw: true }
    )

    return {
      min: capacityMin[0]?.availableCapacity || 0,
      max: capacityMax[0]?.availableCapacity || 0
    }
  }
}
