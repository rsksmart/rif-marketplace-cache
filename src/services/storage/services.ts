import { Service } from 'feathers-sequelize'
import config from 'config'
import { getAvgMinMaxBillingPriceQuery, getMinMaxAvailableSizeQuery } from './utils'
import { QueryTypes } from 'sequelize'
import StakeModel, { getStakesForAccount } from './models/stake.model'
import BigNumber from 'bignumber.js'

export class AvgBillingPriceService extends Service {
  emit?: Function

  async get (): Promise<{ min: number, max: number }> {
    if (!config.get('storage.tokens')) {
      throw new Error('"storage.tokens" not exist in config')
    }
    const sequelize = this.Model.sequelize

    const avgMin = await sequelize.query(getAvgMinMaxBillingPriceQuery(-1), { type: QueryTypes.SELECT, raw: true })
    const avgMax = await sequelize.query(getAvgMinMaxBillingPriceQuery(1), { type: QueryTypes.SELECT, raw: true })
    return {
      min: avgMin[0]?.avgPrice || 0,
      max: avgMax[0]?.avgPrice || 0
    }
  }
}

export class OfferService extends Service {
  emit?: Function
}

export class AgreementService extends Service {
  emit?: Function
}

export class StakeService extends Service {
  emit?: Function

  async get (account: string): Promise<{ totalStakedFiat: string, stakes: Array<StakeModel> }> {
    const sequelize = this.Model.sequelize

    const query = getStakesForAccount(sequelize, account)
    const [{ totalStakedFiat }] = await sequelize.query(query, { type: QueryTypes.SELECT, raw: true })
    return {
      totalStakedFiat: new BigNumber(totalStakedFiat || 0).toFixed(2),
      stakes: await StakeModel.findAll({ where: { account } })
    }
  }
}

export class AvailableSizeService extends Service {
  emit?: Function

  async get (): Promise<{ min: number, max: number }> {
    const sequelize = this.Model.sequelize

    const sizeMin = await sequelize.query(getMinMaxAvailableSizeQuery(-1), { type: QueryTypes.SELECT, raw: true })
    const sizeMax = await sequelize.query(getMinMaxAvailableSizeQuery(1), { type: QueryTypes.SELECT, raw: true })

    return {
      min: sizeMin[0]?.availableSize || 0,
      max: sizeMax[0]?.availableSize || 0
    }
  }
}
