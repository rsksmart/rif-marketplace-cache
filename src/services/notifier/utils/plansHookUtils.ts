import { HookContext } from '@feathersjs/feathers'
import { QueryTypes, Sequelize } from 'sequelize'
import PlanModel from '../models/plan.model'

function queryPriceLimits (sequelize: Sequelize, fiatSymbol: any): Promise<{pMin: number, pMax: number}[]> {
  return sequelize.query(`
    SELECT 
      MIN(fiat) as pMin, 
      MAX(fiat) as pMax
    FROM
    ( 
      SELECT planId,
      CAST(
        CAST(prices.price as REAL) / 1000000000000000000 * COALESCE(rates.${sequelize.escape(fiatSymbol)}, 0) as REAL
      ) AS fiat
      FROM notifier_plan
      INNER JOIN notifier_price AS prices ON notifier_plan.id = prices.planId
      INNER JOIN rates AS rates ON prices.rateId = rates.token
      ORDER BY fiat
    )
  `, { type: QueryTypes.SELECT, raw: true })
}

export async function findLimits (limits: any, context: HookContext) {
  const sequelize: Sequelize = context.app.get('sequelize')
  const { size, price } = limits

  if (size) {
    const sizeLimits = {
      min: await PlanModel.min('quantity') || 0,
      max: await PlanModel.max('quantity') || 0
    }
    context.result = {
      ...context.result,
      size: sizeLimits
    }
  }

  if (price) {
    const {
      fiatSymbol
    } = price

    const [limitsResult] = await queryPriceLimits(sequelize, fiatSymbol)
    const priceLimits = {
      min: limitsResult.pMin || 0,
      max: limitsResult.pMax || 0,
      fiatSymbol
    }
    context.result = {
      ...context.result,
      price: priceLimits
    }
  }
  return context
}
