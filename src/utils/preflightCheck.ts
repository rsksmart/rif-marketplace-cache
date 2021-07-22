import config from 'config'
import Listr from 'listr'
import { getEndPromise } from 'sequelize-store'
import { ethFactory } from '../blockchain'
import StartServer from '../cli/start'
import { SupportedServices } from '../definitions'
import { loggingFactory } from '../logger'
import Migration from '../migrations'
import { sequelizeFactory } from '../sequelize'
import { initStore } from '../store'
import { CacheSynchCheck } from './cacheSyncCheck'

const RNS_SERVICES = ['owner', 'reverse', 'placement', 'registrar', 'fifsAddrRegistrar']
const STORAGE_SERVICES = ['storageManager', 'staking']
const NOTIFIER_SERVICES = ['notifierManager', 'staking']
export const SERVICES: Record<SupportedServices, string[]> = {
  rns: RNS_SERVICES,
  storage: STORAGE_SERVICES,
  notifier: NOTIFIER_SERVICES
}

export const logger = loggingFactory('preflight')

const preflightCheck = async () => {
  process.env.ALLOW_CONFIG_MUTATIONS = 'true'
  const eth = await ethFactory()

  const sequelize = sequelizeFactory()
  const migration = new Migration(sequelize)
  await migration.up()
  await initStore(sequelize)
  await getEndPromise()

  const precacheCheck = new CacheSynchCheck(SERVICES, eth, sequelize, logger)

  const tasksDefinition = [...precacheCheck.tasks]

  const tasks = new Listr(tasksDefinition)
  await tasks.run()

  logger.info('Preflight check finished with status:')

  logger.info(`requirePrecache: ${StartServer.requirePrecache &&
    `[${Object.keys(SERVICES).filter(service => config.has(`${service}.requirePrecache`) && config.get(`${service}.requirePrecache`))}]`}`)

  config.util.makeImmutable(config)
}

export default preflightCheck
