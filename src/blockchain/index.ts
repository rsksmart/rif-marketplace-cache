import config from 'config'
import Eth, { BlockHeader } from 'web3-eth'

import { ConfirmatorService } from './confirmator'
import { Application, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'
import { NewBlockEmitterService } from './new-block-emitters'
import { getNewBlockEmitter } from './utils'

const logger = loggingFactory('blockchain')

export function ethFactory (): Eth {
  const provider = Eth.givenProvider || config.get('blockchain.provider')
  logger.info(`Connecting to provider ${provider}`)

  return new Eth(provider)
}

const CHANNEL_NAME = 'confirmations'

function channelSetup (app: Application): void {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }
  app.on('connection', (connection: any) => {
    app.channel(CHANNEL_NAME).join(connection)
  })
  app.service(ServiceAddresses.CONFIRMATIONS).publish(() => app.channel(CHANNEL_NAME))
}

export default function (app: Application): void {
  const eth = ethFactory()
  const newBlockEmitter = getNewBlockEmitter(eth)

  app.set('eth', eth)
  app.use(ServiceAddresses.CONFIRMATIONS, new ConfirmatorService(eth))
  app.use(ServiceAddresses.NEW_BLOCK_EMITTER, NewBlockEmitterService)
  // Subscribe for new blocks
  const newBlockEmitterService = app.service(ServiceAddresses.NEW_BLOCK_EMITTER)
  newBlockEmitter.on('newBlock', (block: BlockHeader) => {
    logger.info('New block: ', block)
    newBlockEmitterService.emit('newBlock', block)
  })

  channelSetup(app)
}
