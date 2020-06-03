import { Application as ExpressFeathers } from '@feathersjs/express'
import { ServiceAddons } from '@feathersjs/feathers'
import * as Parser from '@oclif/parser'
import { EventData } from 'web3-eth-contract'
import { Eth } from 'web3-eth'

import { OfferService } from './services/storage'
import { RatesService } from './services/rates'
import { RnsService } from './services/rns'
import ConfirmationService from './blockchain/confirmation.service'

// A mapping of service names to types. Will be extended in service files.
interface ServiceTypes {
  '/storage/v0/offers': OfferService & ServiceAddons<any>
  '/rates/v0/': RatesService & ServiceAddons<any>
  '/rns/v0/:ownerAddress/domains': RnsService & ServiceAddons<any>
  '/rns/v0/:ownerAddress/sold': RnsService & ServiceAddons<any>
  '/rns/v0/offers': RnsService & ServiceAddons<any>
  '/confirmations': ConfirmationService & ServiceAddons<any>
}

// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;

export interface CachedService {
  precache (eth?: Eth): Promise<void>
  purge (): Promise<void>
  initialize (app: Application): Promise<void>
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

  // Events that will be listened to
  events?: string[]

  // Specify behavior of EventsEmitter, that retrieves events from blockchain and pass them onwards for further processing.
  eventsEmitter?: EventsEmitterOptions

  // Specify behavior of NewBlockEmitter, that detects new blocks on blockchain.
  newBlockEmitter?: NewBlockEmitterOptions
}

export interface Config {
  host?: string
  port?: number

  // DB URI to connect to database
  db?: string

  log?: {
    level?: string
    filter?: string
    path?: string
  }

  blockchain?: {
    // Address to where web3js should connect to. Should be WS endpoint.
    provider?: string

    // Service that expose transactions that are currently awaiting for confirmations.
    confirmationsService?: {

      // Multiplier that is used for targetConfirmations that determines when an event
      // from DB is supposed to be removed.
      // Eq. if event is supposed to be confirmed after 5 blocks (eq. targetConfirmations)
      // when this parameter is set to "2" then the event will be removed after 10 confirmations.
      deleteTargetConfirmationsMultiplier?: number

      // Specify behavior of NewBlockEmitter, that detects new blocks on blockchain.
      newBlockEmitter?: NewBlockEmitterOptions
    }
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
  storage?: BlockchainServiceOptions & {
    // Sets if Storage service should be enabled
    enabled?: boolean
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
export interface Handler {
  events: string[]
  handler: (event: EventData, eth: Eth) => Promise<void>
}
