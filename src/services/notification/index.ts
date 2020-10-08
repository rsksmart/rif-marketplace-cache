export enum NotificationTypes {
  Global,
  Offer,
  Agreement
}

export interface AgreementNotificationPayload {
  offerId: string
  agreementReference: string
}

export interface OfferNotificationPayload {
  offerId: string
}

export type NotificationPayloads = OfferNotificationPayload | AgreementNotificationPayload

export interface Notification<T extends NotificationPayloads> {
  title: string
  message: string
  type: NotificationTypes
  payload: T
}
