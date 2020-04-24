import { Application } from '../definitions'
import Eth from 'web3-eth'
import config from 'config'

export function ethFactory (): Eth {
  const provider = Eth.givenProvider || config.get('blockchain.provider')
  return new Eth(provider)
}
export default function (app: Application): void {
  app.set('eth', ethFactory())
}
