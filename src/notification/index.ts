import { Service } from 'feathers-sequelize'

import { Application, CommsMessage, CommsPayloads, MessageHandler, ServiceAddresses } from '../definitions'
import notificationHooks from './notification.hooks'
import notificationChannels from './notification.channels'
import NotificationModel from './notification.model'
import { messageHandler } from '../communication/handlers'
import Offer from '../services/storage/models/offer.model'

type CacheIncomingNotification = { signature: Buffer, offerId: string, publicKey: string }

export class NotificationService extends Service {
  emit?: Function
  messageHandler: MessageHandler

  constructor (config, notificationService: NotificationService) {
    super(config)
    this.messageHandler = messageHandler(notificationService)
  }

  async create (message: CacheIncomingNotification & CommsMessage<CommsPayloads>): Promise<void> {
    const { offerId, peerId } = message
    const offer = await Offer.findOne({ where: { provider: message.offerId } })

    if (!offer) {
      throw new Error(`Offer for provider ${offerId} not found`)
    }

    // TODO check somehow that message come from the correct pinner
    // Maybe add some message encryption using libp2p keys

    await this.messageHandler(message)
    return true
  }
}

export default function (app: Application): void {
  // Initialize Notification service
  app.use(ServiceAddresses.NOTIFICATION, new NotificationService({ Model: NotificationModel }))
  const notificationService = app.service(ServiceAddresses.NOTIFICATION)
  notificationService.hooks(notificationHooks)
  app.configure(notificationChannels)
}
