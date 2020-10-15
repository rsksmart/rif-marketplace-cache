import { init } from 'sequelize-store'
import { Application } from './definitions'
import type { Sequelize } from 'sequelize'

export function initStore (sequelize: Sequelize): Promise<void> {
  return init(sequelize, {
    'blockchain.lastFetchedBlock': 'json',
    'web3events.storage.storageManager.lastFetchedBlockNumber': 'int',
    'web3events.storage.storageManager.lastFetchedBlockHash': 'string',
    'web3events.storage.storageManager.lastProcessedBlockNumber': 'int',
    'web3events.storage.storageManager.lastProcessedBlockHash': 'string',
    'web3events.storage.staking.lastFetchedBlockNumber': 'int',
    'web3events.storage.staking.lastFetchedBlockHash': 'string',
    'web3events.storage.staking.lastProcessedBlockNumber': 'int',
    'web3events.storage.staking.lastProcessedBlockHash': 'string',
    'rates.lastUpdate': 'int',
    'web3events.rns.owner.lastFetchedBlockNumber': 'int',
    'web3events.rns.owner.lastFetchedBlockHash': 'string',
    'web3events.rns.reverse.lastFetchedBlockNumber': 'int',
    'web3events.rns.reverse.lastFetchedBlockHash': 'string',
    'web3events.rns.placement.lastFetchedBlockNumber': 'int',
    'web3events.rns.placement.lastFetchedBlockHash': 'string',
    'web3events.rns.owner.lastProcessedBlockNumber': 'int',
    'web3events.rns.owner.lastProcessedBlockHash': 'string',
    'web3events.rns.reverse.lastProcessedBlockNumber': 'int',
    'web3events.rns.reverse.lastProcessedBlockHash': 'string',
    'web3events.rns.placement.lastProcessedBlockNumber': 'int',
    'web3events.rns.placement.lastProcessedBlockHash': 'string'
  })
}

export function configureStore (app: Application): void {
  app.set('storeInit', initStore(app.get('sequelize')))
}
