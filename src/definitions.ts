import { Application as ExpressFeathers } from '@feathersjs/express'
import { ServiceAddons } from '@feathersjs/feathers'
import * as Parser from '@oclif/parser'
import { EventData } from 'web3-eth-contract'
import { Eth } from 'web3-eth'
import type { Options as Libp2pOptions } from 'libp2p'

import type { AvgBillingPriceService, AgreementService, OfferService, StakeService } from './services/storage'
import type { RatesService } from './services/rates'
import type { RnsBaseService } from './services/rns'
import { ConfirmatorService } from './blockchain/confirmator'
import { NewBlockEmitterService } from './blockchain/new-block-emitters'
import { ReorgEmitterService } from './blockchain/reorg-emitter'
import { NotificationService } from './services/notification'

export enum SupportedServices {
  STORAGE = 'storage',
  RATES = 'rates',
  RNS = 'rns',
  NOTIFICATION = 'notification',
}

export type SupportedTokens = 'rif' | 'rbtc'

export function isSupportedServices (value: any): value is SupportedServices {
  return Object.values(SupportedServices).includes(value)
}

export enum ServiceAddresses {
  NOTIFICATION = '/notification',
  RNS_DOMAINS = '/rns/v0/domains',
  RNS_SOLD = '/rns/v0/sold',
  RNS_OFFERS = '/rns/v0/offers',
  STORAGE_OFFERS = '/storage/v0/offers',
  AVG_BILLING_PRICE = '/storage/v0/avgBillingPrice',
  STORAGE_AGREEMENTS = '/storage/v0/agreements',
  STORAGE_STAKES = '/storage/v0/stakes',
  XR = '/rates/v0/',
  CONFIRMATIONS = '/confirmations',
  NEW_BLOCK_EMITTER = '/new-block',
  REORG_EMITTER = '/reorg'
}

// A mapping of service names to types. Will be extended in service files.
interface ServiceTypes {
  [ServiceAddresses.STORAGE_OFFERS]: OfferService & ServiceAddons<any>
  [ServiceAddresses.AVG_BILLING_PRICE]: AvgBillingPriceService & ServiceAddons<any>
  [ServiceAddresses.STORAGE_AGREEMENTS]: AgreementService & ServiceAddons<any>
  [ServiceAddresses.STORAGE_STAKES]: StakeService & ServiceAddons<any>
  [ServiceAddresses.XR]: RatesService & ServiceAddons<any>
  [ServiceAddresses.RNS_DOMAINS]: RnsBaseService & ServiceAddons<any>
  [ServiceAddresses.RNS_SOLD]: RnsBaseService & ServiceAddons<any>
  [ServiceAddresses.RNS_OFFERS]: RnsBaseService & ServiceAddons<any>
  [ServiceAddresses.CONFIRMATIONS]: ConfirmatorService & ServiceAddons<any>
  [ServiceAddresses.NOTIFICATION]: NotificationService & ServiceAddons<any>
  [ServiceAddresses.NEW_BLOCK_EMITTER]: NewBlockEmitterService & ServiceAddons<any>
  [ServiceAddresses.REORG_EMITTER]: ReorgEmitterService & ServiceAddons<any>
}

// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;

export interface CachedService {
  precache (eth?: Eth): Promise<void>
  purge (): Promise<void>
  initialize (app: Application): Promise<{ stop: () => void }>
}

export enum RatesProvider {
  coingecko = 'coingecko'
}

export function isRatesProvider (value: any): value is RatesProvider {
  return Object.values(RatesProvider).includes(value)
}

export type ToSymbols = 'usd' | 'eur' | 'btc' | 'ars' | 'cny' | 'krw' | 'jpy'
export const SupportedToSymbols: ToSymbols[] = ['usd', 'eur', 'btc', 'ars', 'cny', 'krw', 'jpy']

export type FromSymbols = 'rbtc' | 'rif'
export const SupportedFromSymbols: FromSymbols[] = ['rbtc', 'rif']

export type FetchedRates = Record<FromSymbols, Record<ToSymbols, number>>

export interface EventsEmitterOptions {
  // If to use polling strategy, if false then listening is used.
  polling?: boolean

  // Interval in milliseconds, how often is blockchain checked.
  pollingInterval?: number

  // Starting block that upon first start of the service, will the blockchain be crawled for the past events.
  startingBlock?: string

  // Number of blocks that will be waited before passing an event for further processing.
  confirmations?: number
}

export interface NewBlockEmitterOptions {
  // If to use polling strategy, if false then listening is used.
  polling?: boolean

  // Interval in milliseconds, how often is blockchain checked.
  pollingInterval?: number
}

export interface BlockchainServiceOptions {
  // Address of deployed  contract
  contractAddress?: string

  // Topics that will be listened to, if specified than has priority over "events" configuration
  topics?: string[]

  // Events that will be listened to
  events?: string[]

  // Specify behavior of EventsEmitter, that retrieves events from blockchain and pass them onwards for further processing.
  eventsEmitter?: EventsEmitterOptions

  // Specify behavior of NewBlockEmitter, that detects new blocks on blockchain.
  newBlockEmitter?: NewBlockEmitterOptions
}

export interface DbBackUpConfig {
  blocks: number
  path: string
}

export interface Config {
  host?: string
  port?: number

  // DB URI to connect to database
  db?: string

  // DB backup config
  dbBackUp?: DbBackUpConfig

  log?: {
    level?: string
    filter?: string
    path?: string
  }

  comms?: {
    libp2p?: Libp2pOptions
    countOfMessagesPersistedPerAgreement?: number
  }

  notification?: {
    enabled?: boolean
    countOfNotificationPersistedPerAgreement?: number
  }

  blockchain?: {
    // Address to where web3js should connect to. Should be WS endpoint.
    provider?: string

    // Number of blocks that is waited AFTER the event is confirmed before
    // it is removed from database.
    // Such parameter is needed for a REST API where a host could miss that an event has
    // full confirmations as it could be removed from the DB before the endpoint is queried.
    waitBlockCountBeforeConfirmationRemoved?: number
  }

  rates?: {

    // Sets if Rates service should be enabled
    enabled?: boolean

    // Which provider to use for fetching the rates
    provider?: RatesProvider

    // Refresh period in seconds, be aware of rate-limiting of each Provider
    refresh?: number

    // Tokens that should be fetched
    fromSymbols?: string[]

    // Fiats that should be used as conversions for fromSymbols
    toSymbols?: string[]
  }

  // Settings for Storage service related function
  storage?: {

    // Sets if Storage service should be enabled
    enabled?: boolean

    // Supported tokens and their addresses
    tokens?: {
      [key: string]: SupportedTokens
    }

    // Staking contract options
    staking?: BlockchainServiceOptions

    // Storage Manager contract options
    storageManager?: BlockchainServiceOptions
  }

  // Settings for RNS service related function
  rns?: {

    // Sets if RNS service should be enabled
    enabled?: boolean

    // Auction registrar contract's options
    registrar?: BlockchainServiceOptions

    // FIFSAddrRegistrar contract's options
    fifsAddrRegistrar?: BlockchainServiceOptions

    // Owner contract's options
    owner?: BlockchainServiceOptions

    // Reverse contract's options
    reverse?: BlockchainServiceOptions

    // Placement contract's options
    placement?: BlockchainServiceOptions
  }
}

interface Args {[name: string]: any}

type Options<T> = T extends Parser.Input<infer R>
  ? Parser.Output<R, Args>
  : any

export type Flags<T> = Options<T>['flags']

/**
 * Basic logger interface used around the application.
 */
export interface Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  critical (message: string | Error | object, ...meta: any[]): never

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error (message: string | Error | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn (message: string | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info (message: string | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verbose (message: string | object, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug (message: string | object, ...meta: any[]): void
}

/**
 * Interface for more complex handling of events.
 */
export interface Handler<T> {
  events: string[]
  process: (event: EventData, services: T, deps: { eth?: Eth }) => Promise<void>
}

/****************************************************************************************
 * Communications
 */

export enum MessageCodesEnum {
  I_AGREEMENT_NEW = 'I_AGR_NEW', // PROVIDER
  I_AGREEMENT_EXPIRED = 'I_AGR_EXP', // BOTH
  I_HASH_PINNED = 'I_HASH_STOP', // CONSUMER
  E_AGREEMENT_SIZE_LIMIT_EXCEEDED = 'E_AGR_SIZE_OVERFLOW', // CONSUMER
  //
  I_HASH_START = 'I_HASH_START',
  E_GENERAL = 'E_GEN',
  W_HASH_RETRY = 'W_HASH_RETRY',
  I_AGREEMENT_STOPPED = 'I_AGR_STOP',
  I_GENERAL = 'I_GEN',
  I_MULTIADDR_ANNOUNCEMENT = 'I_ADDR_ANNOUNCE',
  I_RESEND_LATEST_MESSAGES = 'I_RESEND',
  W_GENERAL = 'W_GEN',
  E_HASH_NOT_FOUND = 'E_HASH_404',
}

interface BasePayload {
  agreementReference: string
}

export interface RetryPayload extends BasePayload {
  error: string
  retryNumber: number
  totalRetries: number
}

export interface HashInfoPayload extends BasePayload {
  hash: string
}

export type AgreementInfoPayload = BasePayload

export interface AgreementSizeExceededPayload extends BasePayload {
  hash: string
  size: number
  expectedSize: number
}

// Incoming messages

export interface MultiaddrAnnouncementPayload {
  agreementReference: string
  peerId: string
}

export interface ResendMessagesPayload {
  requestId: string
  agreementReference: string
  code?: string
}

export interface CommsMessage<Payload> {
  timestamp: number
  version: number
  code: string
  payload: Payload
}

export type CommsPayloads = ResendMessagesPayload | MultiaddrAnnouncementPayload | AgreementSizeExceededPayload | AgreementInfoPayload | HashInfoPayload | RetryPayload

export type MessageHandler = (message: CommsMessage<CommsPayloads>) => Promise<void>

// NOTIFICATION

export enum NotificationType {
  STORAGE = 'storage'
}

export type NotificationPayload = CommsPayloads & { code: string, timestamp: number }
