import config from 'config'
import Eth, { BlockHeader } from 'web3-eth'
import { getObject } from 'sequelize-store'

import { ConfirmatorService } from './confirmator'
import { Application, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'
import { NEW_BLOCK_EVENT_NAME, NewBlockEmitterService } from './new-block-emitters'
import { getNewBlockEmitter } from './utils'
import { waitForReadyApp } from '../utils'
import { ReorgEmitterService } from './reorg-emitter'

const logger = loggingFactory('blockchain')

export function ethFactory (): Eth {
  const provider = Eth.givenProvider || config.get('blockchain.provider')
  logger.info(`Connecting to provider ${provider}`)

  return new Eth(provider)
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

function subscribeAndEmitNewBlocks (app: Application): void {
  const eth = app.get('eth')
  const store = getObject()
  const newBlockEmitter = getNewBlockEmitter(eth)
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
  const eth = ethFactory()

  app.set('eth', eth)
  app.use(ServiceAddresses.CONFIRMATIONS, new ConfirmatorService(eth))
  app.use(ServiceAddresses.NEW_BLOCK_EMITTER, new NewBlockEmitterService())
  app.use(ServiceAddresses.REORG_EMITTER, new ReorgEmitterService())

  subscribeAndEmitNewBlocks(app)
  channelSetup(app)
}
