import { init } from 'sequelize-store'
import { Application } from './definitions'
import type { Sequelize } from 'sequelize'

export function initStore (sequelize: Sequelize): Promise<void> {
  return init(sequelize, {
    'blockchain.lastFetchedBlockNumber': 'int',
    'storage.lastFetchedBlockNumber': 'int',
    'storage.lastFetchedBlockHash': 'string',
    'storage.lastProcessedBlockNumber': 'int',
    'storage.lastProcessedBlockHash': 'string',
    'rates.lastUpdate': 'int',
    'rns.owner.lastFetchedBlockNumber': 'int',
    'rns.owner.lastFetchedBlockHash': 'string',
    'rns.reverse.lastFetchedBlockNumber': 'int',
    'rns.reverse.lastFetchedBlockHash': 'string',
    'rns.placement.lastFetchedBlockNumber': 'int',
    'rns.placement.lastFetchedBlockHash': 'string',
    'rns.owner.lastProcessedBlockNumber': 'int',
    'rns.owner.lastProcessedBlockHash': 'string',
    'rns.reverse.lastProcessedBlockNumber': 'int',
    'rns.reverse.lastProcessedBlockHash': 'string',
    'rns.placement.lastProcessedBlockNumber': 'int',
    'rns.placement.lastProcessedBlockHash': 'string'
  })
}

export function configureStore (app: Application): void {
  app.set('storeInit', initStore(app.get('sequelize')))
}
