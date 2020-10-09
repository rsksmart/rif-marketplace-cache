import config from 'config'
import { Service } from 'feathers-sequelize'
import Eth from 'web3-eth'

import { Application, CachedService, ServiceAddresses } from '../../definitions'
import notificationHooks from './notification.hooks'
import notificationChannels from './notification.channels'
import { loggingFactory } from '../../logger'
import { waitForReadyApp } from '../../utils'
import NotificationModel from './notification.model'
import initCommunication, { getRooms } from '../storage/communication'
import { sleep } from '../../../test/utils'

export class NotificationService extends Service {
  emit?: Function
}

const NOTIFICATION = 'notification'

const logger = loggingFactory(NOTIFICATION)

const notification: CachedService = {
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>(`${NOTIFICATION}.enabled`)) {
      logger.info('Notification service: disabled')
      return { stop: () => undefined }
    }
    logger.info('Notification service: enabled')

    await waitForReadyApp(app)

    // Initialize Notification service
    app.use(ServiceAddresses.NOTIFICATION, new NotificationService({ Model: NotificationModel }))
    const notificationService = app.service(ServiceAddresses.NOTIFICATION)
    notificationService.hooks(notificationHooks)
    app.configure(notificationChannels)

    // Init comms
    await initCommunication(app)

    // TODO Pre-populate latest messages using rebroadcast feature
    // await this.precache()

    return {
      stop: () => {
        for (const [, room] of getRooms()) {
          room.clearListeners()
        }
      }
    }
  },

  async purge (): Promise<void> {
    const count = await NotificationModel.destroy({ where: {} })
    logger.info(`Removed ${count} notification entries`)

    await sleep(1000)
  },

  async precache (eth?: Eth): Promise<void> {
    return await Promise.resolve()
  }
}

export default notification
