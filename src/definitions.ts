import { Application as ExpressFeathers } from '@feathersjs/express'
import { StorageOfferService } from './storage'
import { RatesService } from './rates'

import { ServiceAddons } from '@feathersjs/feathers'
import * as Parser from '@oclif/parser'
import { EventData } from 'web3-eth-contract'
import { Eth } from 'web3-eth'

// A mapping of service names to types. Will be extended in service files.
interface ServiceTypes {
  '/storage/v0/offers': StorageOfferService & ServiceAddons<any>
  '/rates/v0/': RatesService & ServiceAddons<any>
}

// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes>;

export interface Store {
  get (key: string): any
  set (key: string, value: any): void
}

export interface CachedService {
  precache (eth?: Eth): Promise<void>
  purge (): Promise<void>
  initialize (app: Application): void
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

  conf?: {
    // Name for config to have separate configs for different environments (test, dev, prod)
    name?: string

    // Specifies if configuration using Conf() should be persisted between restarts
    persist?: boolean
  }

  blockchain?: {

    // Address to where web3js should connect to. Should be WS endpoint.
    provider?: string
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

    // Address of deployed pinning contract
    contractAddress?: string

    // Events that will be listened to
    events?: string[]

    // Specify behavior of EventsEmitter, that retrieves events from blockchain and pass them onwards for further processing.
    eventsEmitter?: {
      // If to use polling strategy, if false then listening is used.
      polling?: boolean

      // Interval in milliseconds, how often is blockchain checked.
      pollingInterval?: number

      // Starting block that upon first start of the service, will the blockchain be crawled for the past events.
      startingBlock?: string

      // Number of blocks that will be waited before passing an event for further processing.
      confirmations?: number
    }

    // Specify behavior of NewBlockEmitter, that detects new blocks on blockchain.
    newBlockEmitter?: {
      // If to use polling strategy, if false then listening is used.
      polling?: boolean

      // Interval in milliseconds, how often is blockchain checked.
      pollingInterval?: number
    }
  }

  // Settings for RNS service related function
  rns?: {

    // Sets if RNS service should be enabled
    enabled?: boolean

    owner: {

      // Address of deployed RSKOwner contract
      contractAddress?: string

      // Events that will be listened to
      events?: string[]

      // Specify behavior of EventsEmitter, that retrieves events from blockchain and pass them onwards for further processing.
      eventsEmitter?: {
        // If to use polling strategy, if false then listening is used.
        polling?: boolean

        // Interval in milliseconds, how often is blockchain checked.
        pollingInterval?: number

        // Starting block that upon first start of the service, will the blockchain be crawled for the past events.
        startingBlock?: string

        // Number of blocks that will be waited before passing an event for further processing.
        confirmations?: number
      }

      // Specify behavior of NewBlockEmitter, that detects new blocks on blockchain.
      newBlockEmitter?: {
        // If to use polling strategy, if false then listening is used.
        polling?: boolean

        // Interval in milliseconds, how often is blockchain checked.
        pollingInterval?: number
      }
    }

    reverse: {
      // Address of deployed Reverse contract
      contractAddress?: string

      // Events that will be listened to
      events?: string[]

      // Specify behavior of EventsEmitter, that retrieves events from blockchain and pass them onwards for further processing.
      eventsEmitter?: {
        // If to use polling strategy, if false then listening is used.
        polling?: boolean

        // Interval in milliseconds, how often is blockchain checked.
        pollingInterval?: number

        // Starting block that upon first start of the service, will the blockchain be crawled for the past events.
        startingBlock?: string

        // Number of blocks that will be waited before passing an event for further processing.
        confirmations?: number
      }

      // Specify behavior of NewBlockEmitter, that detects new blocks on blockchain.
      newBlockEmitter?: {
        // If to use polling strategy, if false then listening is used.
        polling?: boolean

        // Interval in milliseconds, how often is blockchain checked.
        pollingInterval?: number
      }
    }

    placement: {

      // Address of deployed SimplePlacement contract
      contractAddress?: string

      // Events that will be listened to
      events?: string[]

      // Specify behavior of EventsEmitter, that retrieves events from blockchain and pass them onwards for further processing.
      eventsEmitter?: {
        // If to use polling strategy, if false then listening is used.
        polling?: boolean

        // Interval in milliseconds, how often is blockchain checked.
        pollingInterval?: number

        // Starting block that upon first start of the service, will the blockchain be crawled for the past events.
        startingBlock?: string

        // Number of blocks that will be waited before passing an event for further processing.
        confirmations?: number
      }

      // Specify behavior of NewBlockEmitter, that detects new blocks on blockchain.
      newBlockEmitter?: {
        // If to use polling strategy, if false then listening is used.
        polling?: boolean

        // Interval in milliseconds, how often is blockchain checked.
        pollingInterval?: number
      }
    }
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
  error (message: string | Error, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug (message: string, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn (message: string, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info (message: string, ...meta: any[]): void
}

/**
 * Interface for more complex handling of events.
 */
export interface Handler {
  events: string[]
  handler: (event: EventData) => Promise<void>
}
