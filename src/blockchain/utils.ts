import { AbiItem } from 'web3-utils'
import Eth from 'web3-eth'
import { EventEmitter } from 'events'
import config from 'config'

import { loggingFactory } from '../logger'
import eventsEmitterFactory, { BlockTracker, EventsEmitterOptions, PollingOptions } from './events'
import { confFactory } from '../conf'
import { scopeStore } from '../utils'
import { Store } from '../definitions'

function getBlockTracker (keyPrefix?: string): BlockTracker {
  let confStore: Store = confFactory()

  if (keyPrefix) {
    confStore = scopeStore(confStore, keyPrefix)
  }

  return new BlockTracker(confStore)
}

export async function getBlockDate (eth: Eth, blockNumber: number): Promise<Date> {
  return new Date(((await eth.getBlock(blockNumber)).timestamp as number) * 1000)
}

export function isServiceInitialized (serviceName: string): boolean {
  const blockTracker = getBlockTracker(serviceName)
  return blockTracker.getLastProcessedBlock() !== undefined
}

export function getEventsEmitterForService (serviceName: string, eth: Eth, contractAbi: AbiItem[]): EventEmitter {
  const contractAddresses = config.get<string>(`${serviceName}.contractAddress`)
  const contract = new eth.Contract(contractAbi, contractAddresses)
  const logger = loggingFactory(`${serviceName}:blockchain`)

  const eventsToListen = config.get<string[]>(`${serviceName}.events`)
  logger.info(`For listening on service '${serviceName}' for events ${eventsToListen.join(', ')} using contract on address: ${contractAddresses}`)
  const eventsEmitterOptions = config.get<EventsEmitterOptions>(`${serviceName}.eventsEmitter`)
  const newBlockEmitterOptions = config.get<PollingOptions>(`${serviceName}.newBlockEmitter`)
  const options = Object.assign(
    {},
    eventsEmitterOptions,
    {
      newBlockEmitter: newBlockEmitterOptions,
      loggerBaseName: serviceName,
      blockTracker: { keyPrefix: serviceName }
    } as EventsEmitterOptions
  )

  return eventsEmitterFactory(eth, contract, eventsToListen, options)
}
