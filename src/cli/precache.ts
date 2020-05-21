import { services, SupportedServices } from '../app'
import Listr from 'listr'
import { sequelizeFactory } from '../sequelize'
import { BaseCLICommand, capitalizeFirstLetter, validateServices } from '../utils'
import { initStore } from '../store'

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
      servicesToPreCache = validateServices(argv)
    } catch (e) {
      this.error(e.message)
    }

    // Init database connection
    const sequelize = sequelizeFactory()

    // Init Store
    await initStore(sequelize)

    const tasksDefinition = servicesToPreCache.map(
      serviceName => {
        return {
          title: capitalizeFirstLetter(serviceName),
          task: (): Promise<void> => services[serviceName].precache()
        }
      }
    )

    this.log('Pre caching data for service:')
    const tasks = new Listr(tasksDefinition)
    await tasks.run()
    this.exit(0)
  }
}
