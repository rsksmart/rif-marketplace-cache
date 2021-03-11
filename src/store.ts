import { init, Schema } from 'sequelize-store'
import { Application } from './definitions'
import type { Sequelize } from 'sequelize'

function addBlockTrackerDefinitionFor (service: string, obj: Schema): void {
  obj[`web3events.${service}.lastFetchedBlockNumber`] = 'int'
  obj[`web3events.${service}.lastFetchedBlockHash`] = 'string'
  obj[`web3events.${service}.lastProcessedBlockNumber`] = 'int'
  obj[`web3events.${service}.lastProcessedBlockHash`] = 'string'
}

export function initStore (sequelize: Sequelize): Promise<void> {
  const schema = {
    'blockchain.lastFetchedBlock': 'json',
    'rates.lastUpdate': 'int'
  } as Schema

  addBlockTrackerDefinitionFor('storage.storageManager', schema)
  addBlockTrackerDefinitionFor('storage.staking', schema)
  addBlockTrackerDefinitionFor('triggers.notificationsManager', schema)
  addBlockTrackerDefinitionFor('triggers.staking', schema)
  addBlockTrackerDefinitionFor('rns.owner', schema)
  addBlockTrackerDefinitionFor('rns.reverse', schema)
  addBlockTrackerDefinitionFor('rns.placement', schema)

  return init(sequelize, schema)
}

export function configureStore (app: Application): void {
  app.set('storeInit', initStore(app.get('sequelize')))
}
