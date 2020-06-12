import { init } from 'sequelize-store'
import { Application } from './definitions'
import type { Sequelize } from 'sequelize'

export function initStore (sequelize: Sequelize): Promise<void> {
  return init(sequelize, {
    'storage.lastFetchedBlock': 'json',
    'rates.lastUpdate': 'int',
    'rns.owner.lastFetchedBlock': 'json',
    'rns.reverse.lastFetchedBlock': 'json',
    'rns.placement.lastFetchedBlock': 'json'
  })
}

export function configureStore (app: Application): void {
  app.set('storeInit', initStore(app.get('sequelize')))
}
