import config from 'config'
import { flags } from '@oclif/command'

import { appFactory } from '../app'
import { loggingFactory } from '../logger'
import { Flags, Config, SupportedServices, isSupportedServices } from '../definitions'
import { BaseCLICommand } from '../utils'
import { DbBackUpJob } from '../db-backup'
import preflightCheck from '../utils/preflightCheck'

const logger = loggingFactory('cli:start')

export default class StartServer extends BaseCLICommand {
  private disablePreflightCheck = false
  static requirePrecache = false
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
    db: flags.string({ description: 'database connection URI' }),
    provider: flags.string({ description: 'blockchain provider connection URI' }),
    enable: flags.string({ char: 'e', multiple: true, description: 'enable specific service' }),
    disable: flags.string({ char: 'd', multiple: true, description: 'disable specific service' }),
    disablePreflightCheck: flags.boolean({ char: 'C', name: 'disablePreflightCheck', description: 'runs the app without the preflight check (not recommended).' })
  }

  private buildConfigObject (flags: Flags<typeof StartServer>): Record<any, any> {
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

  async run (): Promise<void> {
    const { flags } = this.parse(StartServer)

    const configOverrides = this.buildConfigObject(flags)
    config.util.extendDeep(config, configOverrides)

    // check system status:
    // - check if precache is required and update starting blocks in config
    if (!flags.disablePreflightCheck) await preflightCheck()

    // An infinite loop which you can exit only with SIGINT/SIGKILL
    while (true) {
      let stopCallback: () => Promise<void> = () => Promise.reject(new Error('No stop callback was assigned!'))
      let backUpJob: DbBackUpJob

      // Promise that resolves when reset callback is called
      const resetPromise = new Promise<void>(resolve => {
        appFactory({
          requirePrecache: StartServer.requirePrecache,
          appResetCallBack: () => resolve()
        }).then(({ app, stop, backups }) => {
          // Lets save the function that stops the app
          stopCallback = stop
          backUpJob = backups

          // Start server
          const port = config.get('port')
          const server = app.listen(port)

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
      await stopCallback()

      // Restore DB from backup
      await backUpJob!.restoreDb().catch(e => {
        // TODO send notification to devops
        logger.error(e)
      })

      StartServer.requirePrecache = true

      logger.info('Restarting the app')
    }
  }
}
