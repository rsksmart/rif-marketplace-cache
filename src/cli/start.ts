import config from 'config'
import { flags } from '@oclif/command'

import { appFactory, services } from '../app'
import { loggingFactory } from '../logger'
import { Flags, Config, SupportedServices, isSupportedServices } from '../definitions'
import { BaseCLICommand, DbBackUpJob } from '../utils'
import Event from '../blockchain/event.model'
import { ethFactory } from '../blockchain'

const logger = loggingFactory('cli:start')

export default class StartServer extends BaseCLICommand {
  static get description () {
    const formattedServices = Object.values(SupportedServices).map(service => ` - ${service}`).join('\n')
    return `start the caching server

Currently supported services:
${formattedServices}`
  }

  static examples = ['$ rif-marketplace-cache start --disable service1 --disable service2 --enable service3']

  static flags = {
    ...BaseCLICommand.flags,
    port: flags.integer({ char: 'p', description: 'port to attach the server to' }),
    db: flags.string({ description: 'database connection URI', env: 'RIFM_DB' }),
    provider: flags.string({ description: 'blockchain provider connection URI', env: 'RIFM_PROVIDER' }),
    purge: flags.boolean({
      char: 'u',
      description: 'will purge services that should be lunched (eq. enable/disable is applied)'
    }),
    enable: flags.string({ char: 'e', multiple: true, description: 'enable specific service' }),
    disable: flags.string({ char: 'd', multiple: true, description: 'disable specific service' })
  }

  private buildConfigObject (flags: Flags<typeof StartServer>): object {
    const output: Config = {}

    if (flags.db) {
      output.db = flags.db
    }

    if (flags.provider) {
      output.blockchain = { provider: flags.provider }
    }

    if (flags.port) {
      output.port = flags.port
    }

    if (flags.enable) {
      for (const enableService of flags.enable) {
        if (!isSupportedServices(enableService)) {
          this.error(`${enableService} is unknown service!`)
        }

        if (!output[enableService]) {
          output[enableService] = {}
        }

        output[enableService]!.enabled = true
      }
    }

    if (flags.disable) {
      for (const disableService of flags.disable) {
        if (!isSupportedServices(disableService)) {
          this.error(`${disableService} is unknown service!`)
        }

        if (flags.enable && flags.enable.includes(disableService)) {
          this.error(`${disableService} is already enabled in your other parameter!`)
        }

        if (!output[disableService]) {
          output[disableService] = {}
        }

        output[disableService]!.enabled = false
      }
    }

    return output
  }

  private async purge (): Promise<void> {
    const toBePurgedServices = (Object.keys(services) as Array<keyof typeof services>)
      .filter(service => config.get<boolean>(`${service}.enabled`))

    logger.info(`Purging services: ${toBePurgedServices.join(', ')}`)

    await Promise.all(
      toBePurgedServices.map((service) => services[service].purge())
    )

    await Event.destroy({ where: {}, truncate: true, cascade: true })
  }

  async run (): Promise<void> {
    const { flags } = this.parse(StartServer)

    const configOverrides = this.buildConfigObject(flags)
    config.util.extendDeep(config, configOverrides)

    // An infinite loop which you can exit only with SIGINT/SIGKILL
    while (true) {
      let stopCallback = (() => { throw new Error('No stop callback was assigned!') }) as () => void

      // Run backup job
      const backUpJob = new DbBackUpJob(ethFactory())
      backUpJob.run()

      // Promise that resolves when reset callback is called
      const resetPromise = new Promise(resolve => {
        appFactory({
          appResetCallBack: () => resolve()
        }).then(value => {
          // Lets save the function that stops the app
          stopCallback = value.stop
        })
      })

      // Let see if we have to restart the app at some point most probably because
      // reorgs outside of confirmation range.
      await resetPromise

      logger.warn('Reorg detected outside of confirmation range. Rebuilding the service\'s state!')
      logger.info('Stopping service')
      stopCallback()
      backUpJob.stop()

      // Restore DB from backup
      await backUpJob.restoreDb(() => undefined)

      logger.info('Restarting the app')
    }
  }
}
