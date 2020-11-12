import { services } from '../app'
import Listr from 'listr'
import { getEndPromise as awaitStoreToEndProcessing } from 'sequelize-store'
import type { Observable } from 'rxjs'

import { sequelizeFactory } from '../sequelize'
import { BaseCLICommand, capitalizeFirstLetter, validateServices } from '../utils'
import { initStore } from '../store'
import { SupportedServices } from '../definitions'
import DbMigration from '../migrations'
import { ethFactory, web3eventsFactory } from '../blockchain'

export default class PreCache extends BaseCLICommand {
  static get description () {
    const formattedServices = Object.values(SupportedServices).map(service => ` - ${service}`).join('\n')
    return `precache past data for a service

Command will fetch data from blockchain and process them prior turning on the API server.
Currently supported services:
 - all
${formattedServices}`
  }

  static examples = [
    '$ rif-marketplace-cache precache all',
    '$ rif-marketplace-cache precache storage rns'
  ]

  static flags = BaseCLICommand.flags

  static args = [{ name: 'service' }]

  static strict = false

  async run (): Promise<void> {
    const { argv } = this.parse(PreCache)

    let servicesToPreCache
    try {
      servicesToPreCache = validateServices(argv, true)
    } catch (e) {
      this.error(e.message)
    }

    // Init required components
    const sequelize = sequelizeFactory()
    const migration = new DbMigration(sequelize)

    if ((await migration.pending()).length) {
      throw new Error('DB Migration required. Please use \'db-migration\' command to proceed')
    }

    // Init Store
    await initStore(sequelize)

    const eth = ethFactory()
    const web3events = await web3eventsFactory(eth, sequelize)

    const tasksDefinition = servicesToPreCache.map(
      serviceName => {
        return {
          title: capitalizeFirstLetter(serviceName),
          task: (): Observable<string> => services[serviceName].precache(eth, web3events)
        }
      }
    )

    this.log('Pre caching data for service:')
    const tasks = new Listr(tasksDefinition)
    await tasks.run()
    await awaitStoreToEndProcessing()
    this.exit(0)
  }
}
