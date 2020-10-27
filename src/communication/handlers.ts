import config from 'config'
import NotificationModel from '../notification/notification.model'
import { CommsMessage, CommsPayloads, MessageCodesEnum, NotificationType } from '../definitions'
import Agreement from '../services/storage/models/agreement.model'
import { NotificationService } from '../notification'
import { loggingFactory } from '../logger'

const logger = loggingFactory('communication:handlers')

type NotificationData = {
  accounts: string[]
  type: string
  payload: CommsPayloads
}

/**
 * GC for Storage notifications
 * @param agreementReference
 */
async function gcStorageNotifications (agreementReference: string): Promise<void> {
  // Remove old notifications for specific agreement
  const messageLimit = config.get<number>('notification.countOfNotificationPersistedPerAgreement')
  const notificationToDelete = await NotificationModel.findAll({
    offset: messageLimit,
    order: [['id', 'DESC']],
    where: {
      payload: {
        agreementReference: agreementReference
      },
      type: NotificationType.STORAGE
    }
  })
  await Promise.all(notificationToDelete.map(n => n.destroy()))
}

/**
 * Build notification for storage messages
 * @param agreement
 * @param message
 */
function buildNotification (agreement: Agreement, message: CommsMessage<CommsPayloads>): NotificationData | undefined {
  const notification = {
    type: NotificationType.STORAGE,
    payload: { ...message.payload, code: message.code, timestamp: message.timestamp }
  }
  switch (message.code) {
    case MessageCodesEnum.I_AGREEMENT_NEW:
      return {
        accounts: [agreement.offerId],
        ...notification
      }
    case MessageCodesEnum.I_AGREEMENT_EXPIRED:
      return {
        accounts: [agreement.consumer, agreement.offerId],
        ...notification
      }
    case MessageCodesEnum.I_HASH_PINNED:
    case MessageCodesEnum.E_AGREEMENT_SIZE_LIMIT_EXCEEDED:
      return {
        accounts: [agreement.consumer],
        ...notification
      }
    default:
      return undefined
  }
}

/**
 * Storage messages handler
 * @param notificationService
 */
export function messageHandler (
  notificationService?: NotificationService
): (message: CommsMessage<CommsPayloads>) => Promise<void> {
  return async function (message: CommsMessage<CommsPayloads>): Promise<void> {
    const agreement = await Agreement.findOne({ where: { agreementReference: message.payload.agreementReference } })

    if (!agreement) {
      logger.verbose(`Agreement ${message.payload.agreementReference} for message not found`)
      return
    }
    const notificationData = buildNotification(agreement, message)
    logger.debug('Build Notification: ', notificationData)

    if (!notificationData) {
      return
    }

    if (!notificationService) {
      NotificationModel.create(notificationData)
    } else {
      await notificationService.create(notificationData)
    }

    // GC storage notifications
    await gcStorageNotifications(agreement.agreementReference)
  }
}
