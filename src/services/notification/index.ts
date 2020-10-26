import config from 'config'
import { Service } from 'feathers-sequelize'

import { Application, CachedService, ServiceAddresses } from '../../definitions'
import notificationHooks from './notification.hooks'
import notificationChannels from './notification.channels'
import { loggingFactory } from '../../logger'
import { waitForReadyApp } from '../../utils'
import NotificationModel from './notification.model'
import { setMessageHandler } from '../../communication'
import { messageHandler } from '../../communication/handlers'
import { sleep } from '../../../test/utils'

export class NotificationService extends Service {
  emit?: Function
}

const NOTIFICATION = 'notification'

const logger = loggingFactory(NOTIFICATION)

const stop = () => undefined

const notification: CachedService = {
  async initialize (app: Application): Promise<{ stop: () => void }> {
    if (!config.get<boolean>(`${NOTIFICATION}.enabled`)) {
      logger.info('Notification service: disabled')
      return { stop }
    }
    logger.info('Notification service: enabled')

    await waitForReadyApp(app)

    // Initialize Notification service
    app.use(ServiceAddresses.NOTIFICATION, new NotificationService({ Model: NotificationModel }))
    const notificationService = app.service(ServiceAddresses.NOTIFICATION)
    notificationService.hooks(notificationHooks)
    app.configure(notificationChannels)

    // Set message handler for comms
    setMessageHandler(messageHandler(notificationService))

    return { stop }
  },

  async purge (): Promise<void> {
    const count = await NotificationModel.destroy({ where: {} })
    logger.info(`Removed ${count} notification entries`)

    await sleep(1000)
  },

  precache (): Promise<void> {
    return Promise.resolve()
  }
}

export default notification
