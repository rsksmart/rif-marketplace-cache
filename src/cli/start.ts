import config from 'config'
import { flags } from '@oclif/command'

import { appFactory, services } from '../app'
import { loggingFactory } from '../logger'
import { Flags, Config, SupportedServices, isSupportedServices, Application } from '../definitions'
import { BaseCLICommand } from '../utils'
import DbBackUpJob from '../db-backup'
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

  public async precache () {
    const toBePrecache = (Object.keys(services) as Array<keyof typeof services>)
      .filter(service => config.get<boolean>(`${service}.enabled`))
    await Promise.all(
      toBePrecache.map((service) => services[service].precache(ethFactory()))
    )
  }

  async run (): Promise<void> {
    const { flags } = this.parse(StartServer)

    const configOverrides = this.buildConfigObject(flags)
    config.util.extendDeep(config, configOverrides)

    const backUpJob = new DbBackUpJob(ethFactory())
    // An infinite loop which you can exit only with SIGINT/SIGKILL
    while (true) {
      let stopCallback: () => void = () => {
        throw new Error('No stop callback was assigned!')
      }

      // Run backup job
      backUpJob.run()

      // Promise that resolves when reset callback is called
      const resetPromise = new Promise(resolve => {
        appFactory({
          appResetCallBack: () => resolve()
        }).then((application: { app: Application, stop: () => void }) => {
          // Lets save the function that stops the app
          stopCallback = application.stop

          // Start server
          const port = config.get('port')
          const server = application.app.listen(port)

          server.on('listening', () =>
            logger.info(`Server started on port ${port}`)
          )

          process.on('unhandledRejection', err =>
            logger.error(`Unhandled Rejection at: ${err}`)
          )
        })
      })

      // Let see if we have to restart the app at some point most probably because
      // reorgs outside of confirmation range.
      await resetPromise

      logger.warn('Reorg detected outside of confirmation range. Rebuilding the service\'s state!')
      logger.info('Stopping the app')
      stopCallback()
      backUpJob.stop()

      // Restore DB from backup
      await backUpJob.restoreDb().catch(e => {
        // TODO send notification to devops
        logger.error(e)
      })

      // Run pre-cache
      await this.precache()

      logger.info('Restarting the app')
    }
  }
}
