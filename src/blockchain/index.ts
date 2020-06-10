import Eth from 'web3-eth'
import config from 'config'

import ConfirmationService from './confirmation.service'
import { Application, ServiceAddresses } from '../definitions'
import { loggingFactory } from '../logger'

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
  app.set('eth', eth)
  app.use(ServiceAddresses.CONFIRMATIONS, new ConfirmationService(eth))

  channelSetup(app)
}
