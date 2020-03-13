import { Application } from '../types'
import Eth from 'web3-eth'
import config from 'config'

export default function (app: Application): void {
  const provider = Eth.givenProvider || config.get('blockchain.provider')
  const eth = new Eth(provider)

  app.set('eth', eth)
}
