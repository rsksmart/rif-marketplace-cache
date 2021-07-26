import type { Application as ExpressFeathers } from '@feathersjs/express'
import type { ServiceAddons } from '@feathersjs/feathers'
import * as Parser from '@oclif/parser'
import type { Eth } from 'web3-eth'
import type { Web3Events, EventsEmitterCreationOptions, NewBlockEmitterOptions } from '@rsksmart/web3-events'
import type { Observable } from 'rxjs'
import Libp2p from 'libp2p'
import type { Options as Libp2pOptions } from 'libp2p'

import type { AvgBillingPriceService, AgreementService, OfferService, StakeService as StorageStakeService, AvailableCapacityService } from './services/storage/services'
import { ProviderService, NotifierStakeService, PlansService as NotifierPlansService, SubscriptionsService as NotifierSubscriptionsService } from './services/notifier/services'
import type { RatesService } from './rates'
import type { RnsBaseService } from './services/rns'
import type { ReorgEmitterService, NewBlockEmitterService, ConfirmatorService } from './blockchain/services'

import * as storageEvents from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/StorageManager'
import * as stakingEvents from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/Staking'
import * as notifierStakingEvents from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/Staking'
import * as notifierEvents from '@rsksmart/rif-marketplace-notifier/types/web3-v1-contracts/NotifierManager'
import { NotificationService } from './notification'
import { CommsService } from './communication/service'

export type EmitFn = (...args: any[]) => void

export enum SupportedServices {
  STORAGE = 'storage',
  RNS = 'rns',
  NOTIFIER = 'notifier'
}

export type SupportedTokens = 'rif' | 'rbtc'

export const ZERO_ADDRESS = '0x'.padEnd(42, '0')
export const ZERO_BYTES_32 = '0x'.padEnd(64, '0')

export function isSupportedServices (value: any): value is SupportedServices {
  return Object.values(SupportedServices).includes(value)
}

export enum ServiceAddresses {
  NOTIFICATION = '/notification',
  COMMS = '/comms',
  RNS_DOMAINS = '/rns/v0/domains',
  RNS_SOLD = '/rns/v0/sold',
  RNS_OFFERS = '/rns/v0/offers',
  STORAGE_OFFERS = '/storage/v0/offers',
  AVG_BILLING_PRICE = '/storage/v0/avgBillingPrice',
  STORAGE_AGREEMENTS = '/storage/v0/agreements',
  STORAGE_STAKES = '/storage/v0/stakes',
  STORAGE_AVAILABLE_CAPACITY = '/storage/v0/availableCapacity',
  NOTIFIER_STAKES = '/notifier/v0/stakes',
  NOTIFIER_PROVIDERS = '/notifier/v0/providers',
  NOTIFIER_OFFERS = '/notifier/v0/offers',
  NOTIFIER_SUBSCRIPTIONS = '/notifier/v0/subscriptions',
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
  [ServiceAddresses.STORAGE_STAKES]: StorageStakeService & ServiceAddons<any>
  [ServiceAddresses.STORAGE_AVAILABLE_CAPACITY]: AvailableCapacityService & ServiceAddons<any>
  [ServiceAddresses.NOTIFIER_PROVIDERS]: ProviderService & ServiceAddons<any>
  [ServiceAddresses.NOTIFIER_OFFERS]: NotifierPlansService & ServiceAddons<any>
  [ServiceAddresses.NOTIFIER_SUBSCRIPTIONS]: NotifierSubscriptionsService & ServiceAddons<any>
  [ServiceAddresses.NOTIFIER_STAKES]: NotifierStakeService & ServiceAddons<any>
  [ServiceAddresses.XR]: RatesService & ServiceAddons<any>
  [ServiceAddresses.RNS_DOMAINS]: RnsBaseService & ServiceAddons<any>
  [ServiceAddresses.RNS_SOLD]: RnsBaseService & ServiceAddons<any>
  [ServiceAddresses.RNS_OFFERS]: RnsBaseService & ServiceAddons<any>
  [ServiceAddresses.CONFIRMATIONS]: ConfirmatorService & ServiceAddons<any>
  [ServiceAddresses.NOTIFICATION]: NotificationService & ServiceAddons<any>
  [ServiceAddresses.COMMS]: CommsService & ServiceAddons<any>
  [ServiceAddresses.NEW_BLOCK_EMITTER]: NewBlockEmitterService & ServiceAddons<any>
  [ServiceAddresses.REORG_EMITTER]: ReorgEmitterService & ServiceAddons<any>
}

// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;

export interface CachedService {
  precache (eth: Eth, web3events: Web3Events): Observable<string>
  purge (): Promise<void>
  initialize (app: Application): Promise<{ stop: () => void }>
}

export interface BlockchainServiceOptions {
  // Address of deployed  contract
  contractAddress?: string

  // Specify behavior of EventsEmitter, that retrieves events from blockchain and pass them onwards for further processing.
  eventsEmitter?: EventsEmitterCreationOptions
}

export interface DbBackUpConfig {
  blocks: number

  // Place where the backups will be put. If relative than it is relative to `dataDir`. Absolute path is honored.
  path: string
}

export enum CommsStrategy {
  Libp2p = 'libp2p',
  API = 'api'
}

/// //////////////////////////////////////////////////////////////////////////////////////////////////
// RATES

export enum RatesProvider {
  coingecko = 'coingecko'
}

export function isRatesProvider (value: any): value is RatesProvider {
  return Object.values(RatesProvider).includes(value)
}

export type ToSymbols = 'usd' | 'eur' | 'btc' | 'ars' | 'cny' | 'krw' | 'jpy'
export const SUPPORTED_TO_SYMBOLS: ToSymbols[] = ['usd', 'eur', 'btc', 'ars', 'cny', 'krw', 'jpy']

export type FromSymbols = 'rbtc' | 'rif'
export const SUPPORTED_FROM_SYMBOLS: FromSymbols[] = ['rbtc', 'rif']

export type FetchedRates = Record<FromSymbols, Record<ToSymbols, number>>

export interface Config {
  host?: string
  port?: number

  // Place where the DB file will be put. If relative than it is relative to `dataDir`. Absolute path is honored.
  db?: string

  // DB backup config
  dbBackUp?: DbBackUpConfig

  // Place where all the persistent data should be stored
  // Recommended is absolute path, if relative then it will be based on root of the project (not CWD)
  dataDir?: string

  log?: {
    level?: string
    filter?: string
    path?: string
  }

  comms?: {
    strategy?: CommsStrategy
    libp2p?: Libp2pOptions
    countOfMessagesPersistedPerAgreement?: number
  }

  notification?: {
    countOfNotificationPersistedPerAgreement?: number
    retriesCount?: number
    retryInterval?: number
  }

  blockchain?: {
    networkId?: number
    // Address to where web3js should connect to. Should be WS endpoint.
    provider?: string

    // Specifies behaviour of the default New Block emitter that will be used across all the EventsEmitters
    newBlockEmitter?: NewBlockEmitterOptions
  }

  rates?: {

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
  notifier?: {

    // Sets if Storage service should be enabled
    enabled?: boolean

    // Supported tokens and their addresses
    tokens?: {
      [key: string]: SupportedTokens
    }

    // Staking contract options
    staking?: BlockchainServiceOptions

    // Storage Manager contract options
    notifierManager?: BlockchainServiceOptions
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
  critical (message: string | Error | Record<any, unknown>, ...meta: any[]): never

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error (message: string | Error | Record<any, unknown>, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn (message: string | Record<any, unknown>, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info (message: string | Record<any, unknown>, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verbose (message: string | Record<any, unknown>, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug (message: string | Record<any, unknown>, ...meta: any[]): void

  extend?: (name: string) => Logger
}

/**
 * Interface for more complex handling of events.
 */
export interface Handler<E, T> {
  events: string[]
  process: (event: E, services: T, deps: { eth?: Eth, libp2p?: Libp2p }) => Promise<void>
}

/// //////////////////////////////////////////////////////////////////////////////////////////////////
// STORAGE

export type StorageAgreementEvents = storageEvents.AgreementFundsDeposited
  | storageEvents.AgreementFundsPayout
  | storageEvents.AgreementFundsWithdrawn
  | storageEvents.AgreementStopped
  | storageEvents.NewAgreement

export type StorageOfferEvents = storageEvents.BillingPlanSet
  | storageEvents.MessageEmitted
  | storageEvents.TotalCapacitySet

export type StakeEvents = stakingEvents.Staked | stakingEvents.Unstaked

export type StorageEvents = StorageOfferEvents | StorageAgreementEvents | StakeEvents

/// //////////////////////////////////////////////////////////////////////////////////////////////////
// NOTIFIER
export type NotificationManagerEvents = notifierEvents.ProviderRegistered
  | notifierEvents.SubscriptionCreated
  | notifierEvents.FundsWithdrawn

export type NotifierStakeEvents = notifierStakingEvents.Staked | notifierStakingEvents.Unstaked

export type NotifierEvents = NotificationManagerEvents | NotifierStakeEvents

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
