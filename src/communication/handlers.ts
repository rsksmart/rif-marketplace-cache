import config from 'config'
import NotificationModel from '../notification/notification.model'
import { CommsMessage, CommsPayloads, MessageCodesEnum, NotificationType } from '../definitions'
import Agreement from '../services/storage/models/agreement.model'
import { NotificationService } from '../notification'
import { loggingFactory } from '../logger'
import { asyncRetry } from '../utils'
import { AsyncRetryError } from '../errors'

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
    // Provider
    case MessageCodesEnum.I_AGREEMENT_NEW:
      return {
        accounts: [agreement.offerId],
        ...notification
      }
    // Provider and Consumer
    case MessageCodesEnum.E_GENERAL:
    case MessageCodesEnum.E_AGREEMENT_SIZE_LIMIT_EXCEEDED:
    case MessageCodesEnum.I_AGREEMENT_EXPIRED:
      return {
        accounts: [agreement.consumer, agreement.offerId],
        ...notification
      }
    // Consumer
    case MessageCodesEnum.I_HASH_PINNED:
      return {
        accounts: [agreement.consumer],
        ...notification
      }
    default:
      return undefined
  }
}

function getAgreementWithRetry (
  agreementRef: string,
  retriesCount: number,
  retryInterval: number
): Promise<Agreement | void> {
  function getAgreement (): Promise<Agreement> {
    logger.info('Trying to get agreement ' + agreementRef)
    return Agreement
      .findOne({ where: { agreementReference: agreementRef } })
      .then(agreement => {
        if (!agreement) {
          throw new Error('Agreement not found')
        }
        return agreement
      })
  }
  return asyncRetry<Agreement>(
    getAgreement,
    retriesCount,
    retryInterval
  ).catch(e => {
    if (e.code === AsyncRetryError.code) {
      return
    }
    throw e
  })
}

/**
 * Storage messages handler
 * @param notificationService
 */
export function messageHandler (
  notificationService?: NotificationService
): (message: CommsMessage<CommsPayloads>) => Promise<void> {
  return async function (message: CommsMessage<CommsPayloads>): Promise<void> {
    const agreement = await getAgreementWithRetry(
      message.payload.agreementReference,
      config.get<number>('notification.retriesCount'),
      config.get<number>('notification.retryInterval')
    )

    if (!agreement) {
      logger.error(`Agreement ${message.payload.agreementReference} for message not found`)
      return
    }
    const notificationData = buildNotification(agreement, message)

    if (!notificationData) {
      return
    }
    logger.debug('Build Notification: ', notificationData)

    await NotificationModel.create(notificationData)

    if (notificationService && notificationService.emit) {
      notificationService.emit('created', notificationData)
    }

    // GC storage notifications
    await gcStorageNotifications(agreement.agreementReference)
  }
}
