import config from 'config'
import Eth, { BlockHeader } from 'web3-eth'
import { getObject } from 'sequelize-store'
import { Web3Events, NewBlockEmitterOptions, NEW_BLOCK_EVENT_NAME } from '@rsksmart/web3-events'
import type { Sequelize } from 'sequelize'

import { Application, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'
import { waitForReadyApp } from '../utils'
import { ReorgEmitterService, NewBlockEmitterService, ConfirmatorService } from './services'

const logger = loggingFactory('blockchain')

export async function ethFactory (): Promise<Eth> {
  const provider = Eth.givenProvider || config.get('blockchain.provider')
  logger.info(`Connecting to provider ${provider}`)
  const eth = new Eth(provider)
  try {
    await eth.getProtocolVersion()
  } catch (e) {
    throw new Error(`Can't connect to the node on address ${provider}`)
  }
  return eth
}

export async function web3eventsFactory (eth: Eth, sequelize: Sequelize): Promise<Web3Events> {
  await Web3Events.init(sequelize) // And Web3Events models to Sequelize
  return new Web3Events(eth, {
    store: getObject('web3events.'),
    logger: loggingFactory('web3events'),
    defaultNewBlockEmitter: config.get<NewBlockEmitterOptions>('blockchain.newBlockEmitter')
  })
}

const CONFIRMATION_CHANNEL = 'confirmations'
const NEW_BLOCK_EMITTER_CHANNEL = 'new-block'
const REORG_CHANNEL = 'reorg'

function channelSetup (app: Application): void {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel(CONFIRMATION_CHANNEL).join(connection)
    app.channel(NEW_BLOCK_EMITTER_CHANNEL).join(connection)
    app.channel(REORG_CHANNEL).join(connection)
  })
  app.service(ServiceAddresses.CONFIRMATIONS).publish(() => app.channel(CONFIRMATION_CHANNEL))
  app.service(ServiceAddresses.NEW_BLOCK_EMITTER).publish(() => app.channel(NEW_BLOCK_EMITTER_CHANNEL))
  app.service(ServiceAddresses.REORG_EMITTER).publish(() => app.channel(REORG_CHANNEL))
}

function subscribeAndEmitNewBlocks (app: Application, web3Events: Web3Events): void {
  const newBlockEmitter = web3Events.defaultNewBlockEmitter
  const store = getObject()
  const newBlockEmitterService = app.service(ServiceAddresses.NEW_BLOCK_EMITTER)

  // Subscribe for new blocks
  newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, (block: BlockHeader) => {
    logger.debug('New block: ', block)
    newBlockEmitterService?.emit(NEW_BLOCK_EVENT_NAME, block)
    store['blockchain.lastFetchedBlock'] = block
  })
}

export default async function (app: Application): Promise<void> {
  await waitForReadyApp(app)
  const eth = await ethFactory()
  app.set('eth', eth)

  const sequelize = app.get('sequelize') as Sequelize
  const web3events = await web3eventsFactory(eth, sequelize)
  app.set('web3events', web3events)

  app.use(ServiceAddresses.CONFIRMATIONS, new ConfirmatorService(eth))
  app.use(ServiceAddresses.NEW_BLOCK_EMITTER, new NewBlockEmitterService())
  app.use(ServiceAddresses.REORG_EMITTER, new ReorgEmitterService())

  subscribeAndEmitNewBlocks(app, web3events)
  channelSetup(app)
}
