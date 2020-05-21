import { init } from 'sequelize-store'
import { Application } from './definitions'
import type { Sequelize } from 'sequelize'

export function initStore (sequelize: Sequelize): Promise<void> {
  return init(sequelize, {
    'storage.lastProcessedBlock': 'int',
    'rates.lastUpdate': 'int',
    'rns.owner.lastProcessedBlock': 'int',
    'rns.reverse.lastProcessedBlock': 'int',
    'rns.placement.lastProcessedBlock': 'int'
  })
}

export function configureStore (app: Application): void {
  app.set('storeInit', initStore(app.get('sequelize')))
}
