import { services } from '../app'
import Listr from 'listr'
import { getEndPromise as awaitStoreToEndProcessing } from 'sequelize-store'
import { Event } from '@rsksmart/web3-events'

import rate from '../rates/index'
import { sequelizeFactory } from '../sequelize'
import { BaseCLICommand, capitalizeFirstLetter, validateServices } from '../utils'
import { initStore } from '../store'
import { SupportedServices } from '../definitions'

export default class Purge extends BaseCLICommand {
  static get description () {
    const formattedServices = Object.values(SupportedServices).map(service => ` - ${service}`).join('\n')
    return `purge cached data

Can purge all data or for specific service.
Currently supported services:
 - all
${formattedServices}`
  }

  static examples = [
    '$ rif-marketplace-cache purge all',
    '$ rif-marketplace-cache purge storage rns notifier'
  ]

  static flags = BaseCLICommand.flags

  static args = [{ name: 'service' }]

  static strict = false

  async run (): Promise<void> {
    const { argv } = this.parse(Purge)

    let servicesToPurge
    try {
      servicesToPurge = validateServices(argv)
    } catch (e) {
      this.error(e.message)
    }

    // Init database connection
    const sequelize = sequelizeFactory()

    // Init Store
    await initStore(sequelize)

    const tasksDefinition = servicesToPurge.map(
      serviceName => {
        return {
          title: capitalizeFirstLetter(serviceName),
          task: services[serviceName].purge
        }
      }
    )

    tasksDefinition.push({
      title: 'Events',
      task: async () => {
        await Event.destroy({ where: {}, truncate: true, cascade: true })
      }
    })
    tasksDefinition.push({
      title: 'Rates',
      task: async () => {
        await rate.purge()
      }
    })

    this.log('Removing cached data for service:')
    const tasks = new Listr(tasksDefinition)
    await tasks.run()
    await awaitStoreToEndProcessing()
    this.exit(0)
  }
}
