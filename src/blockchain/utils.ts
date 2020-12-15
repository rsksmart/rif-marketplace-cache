import type { AbiItem } from 'web3-utils'
import Eth from 'web3-eth'
import config from 'config'
import { EventLog } from 'web3-core'
import { Observable } from 'rxjs'
import { getObject } from 'sequelize-store'
import {
  Web3Events,
  Contract,
  EventsEmitterCreationOptions,
  ProgressInfo,
  AutoEventsEmitter,
  LAST_FETCHED_BLOCK_NUMBER_KEY,
  LAST_FETCHED_BLOCK_HASH_KEY,
  LAST_PROCESSED_BLOCK_NUMBER_KEY,
  LAST_PROCESSED_BLOCK_HASH_KEY
} from '@rsksmart/web3-events'

import { loggingFactory } from '../logger'
import { Logger } from '../definitions'

export async function getBlockDate (eth: Eth, blockNumber: number): Promise<Date> {
  return new Date(((await eth.getBlock(blockNumber)).timestamp as number) * 1000)
}

export function isServiceInitialized (serviceName: string): boolean {
  const store = getObject()
  return store[`web3events.${serviceName}.${LAST_FETCHED_BLOCK_NUMBER_KEY}`] !== undefined
}

export function purgeBlockTrackerData (serviceName: string): void {
  const store = getObject()
  delete store[`web3events.${serviceName}.${LAST_FETCHED_BLOCK_NUMBER_KEY}`]
  delete store[`web3events.${serviceName}.${LAST_FETCHED_BLOCK_HASH_KEY}`]
  delete store[`web3events.${serviceName}.${LAST_PROCESSED_BLOCK_NUMBER_KEY}`]
  delete store[`web3events.${serviceName}.${LAST_PROCESSED_BLOCK_HASH_KEY}`]
}

export function getEventsEmitterForService<E extends EventLog> (serviceName: string, web3events: Web3Events, contractAbi: AbiItem[]): AutoEventsEmitter<E> {
  const contractAddresses = config.get<string>(`${serviceName}.contractAddress`)
  const contract = new Contract(contractAbi, contractAddresses, serviceName)
  const logger = loggingFactory(`${serviceName}:blockchain`)
  logger.info(`For listening on service '${serviceName}' using contract on address: ${contractAddresses}`)

  const options = config.get<EventsEmitterCreationOptions>(`${serviceName}.eventsEmitter`)
  return web3events.createEventsEmitter<E>(contract, options)
}

export type ProgressCb = (progress: ProgressInfo, name: string) => void

export function reportProgress (logger: Logger, handler: (progress: ProgressCb) => Promise<void>): Observable<string> {
  return new Observable<string>((subscriber) => {
    const progressCb = (progress: ProgressInfo, name?: string): void => {
      subscriber.next(`Processing${' ' + name ?? ''}: ${Math.round(progress.stepsComplete / progress.totalSteps * 100)}%`)
    }

    (async (): Promise<void> => {
      subscriber.next('Processing: 0%')
      await handler(progressCb)
      subscriber.complete()
    })().catch(e => {
      logger.error(e)
      subscriber.error(e)
    })
  })
}
