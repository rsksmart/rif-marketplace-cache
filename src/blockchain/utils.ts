import { AbiItem } from 'web3-utils'
import Eth from 'web3-eth'
import { EventEmitter } from 'events'
import config from 'config'
import { getObject } from 'sequelize-store'

import { loggingFactory } from '../logger'
import eventsEmitterFactory, { BlockTracker, EventsEmitterOptions } from './events'
import { NewBlockEmitterOptions } from '../definitions'

function getBlockTracker (keyPrefix?: string): BlockTracker {
  const store = getObject(keyPrefix)
  return new BlockTracker(store)
}

export async function getBlockDate (eth: Eth, blockNumber: number): Promise<Date> {
  return new Date(((await eth.getBlock(blockNumber)).timestamp as number) * 1000)
}

export function isServiceInitialized (serviceName: string): boolean {
  const blockTracker = getBlockTracker(`${serviceName}.`)
  return blockTracker.getLastFetchedBlock()[0] !== undefined
}

export function getEventsEmitterForService (serviceName: string, eth: Eth, contractAbi: AbiItem[]): EventEmitter {
  const contractAddresses = config.get<string>(`${serviceName}.contractAddress`)
  const contract = new eth.Contract(contractAbi, contractAddresses)
  const logger = loggingFactory(`${serviceName}:blockchain`)

  const eventsToListen = config.get<string[]>(`${serviceName}.events`)
  logger.info(`For listening on service '${serviceName}' for events ${eventsToListen.join(', ')} using contract on address: ${contractAddresses}`)
  const eventsEmitterOptions = config.get<EventsEmitterOptions>(`${serviceName}.eventsEmitter`)
  const newBlockEmitterOptions = config.get<NewBlockEmitterOptions>(`${serviceName}.newBlockEmitter`)
  const options = Object.assign(
    {},
    eventsEmitterOptions,
    {
      newBlockEmitter: newBlockEmitterOptions,
      loggerBaseName: serviceName,
      blockTracker: { keyPrefix: `${serviceName}.` }
    } as EventsEmitterOptions
  )

  return eventsEmitterFactory(eth, contract, eventsToListen, options)
}

interface LookupTableEvents {
  transactionHash: string
  logIndex: number
  emitted?: boolean
}

export function createTransactionLookupTable (events: LookupTableEvents[], emittedOnly = false): Record<string, number[]> {
  return events.reduce<Record<string, number[]>>((previousValue, currentValue) => {
    if (emittedOnly && !currentValue.emitted) return previousValue

    if (!previousValue[currentValue.transactionHash]) {
      previousValue[currentValue.transactionHash] = [currentValue.logIndex]
    } else {
      previousValue[currentValue.transactionHash].push(currentValue.logIndex)
    }

    return previousValue
  }, {})
}
