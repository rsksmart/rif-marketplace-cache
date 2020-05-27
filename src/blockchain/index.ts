import Eth from 'web3-eth'
import config from 'config'

import ConfirmationService from './confirmation.service'
import { Application } from '../definitions'
import { loggingFactory } from '../logger'

const logger = loggingFactory('blockchain')

export function ethFactory (): Eth {
  const provider = Eth.givenProvider || config.get('blockchain.provider')
  logger.info(`Connecting to provider ${provider}`)

  return new Eth(provider)
}

export default function (app: Application): void {
  const eth = ethFactory()
  app.set('eth', eth)
  app.use('/confirmations', new ConfirmationService(eth))
}
