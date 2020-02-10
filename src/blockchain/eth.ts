import { Application } from '../declarations'
import Eth from 'web3-eth'

export default function (app: Application): void {
  const provider = Eth.givenProvider || app.get('blockchain').provider
  const eth = new Eth(provider)

  app.set('eth', eth)
}
