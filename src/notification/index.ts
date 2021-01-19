import { Service } from 'feathers-sequelize'

import { Application, ServiceAddresses } from '../definitions'
import type { EmitFn } from '../definitions'
import notificationHooks from './notification.hooks'
import notificationChannels from './notification.channels'
import NotificationModel from './notification.model'

export class NotificationService extends Service {
  emit?: EmitFn
}

export default function (app: Application): void {
  // Initialize Notification service
  app.use(ServiceAddresses.NOTIFICATION, new NotificationService({ Model: NotificationModel }))
  const notificationService = app.service(ServiceAddresses.NOTIFICATION)
  notificationService.hooks(notificationHooks)
  app.configure(notificationChannels)
}
