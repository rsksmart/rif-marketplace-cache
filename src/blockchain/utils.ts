import { AbiItem } from 'web3-utils'
import Eth from 'web3-eth'
import { EventEmitter } from 'events'
import config from 'config'

import { loggingFactory } from '../logger'
import eventsEmitterFactory, { EventsEmitterOptions, PollingOptions } from './events'

export function getEventsEmitterForService (serviceName: string, eth: Eth, contractAbi: AbiItem[]): EventEmitter {
  const contractAddresses = config.get<string>(`${serviceName}.contractAddress`)
  const contract = new eth.Contract(contractAbi, contractAddresses)

  const logger = loggingFactory(`${serviceName}:blockchain`)
  logger.info(`For listening on service '${serviceName}' using contract on address: ${contractAddresses}`)

  const eventsToListen = config.get<string[]>(`${serviceName}.events`)
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
