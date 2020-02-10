import { Application } from '../declarations'
import eth from './eth'
import watcher from './watcher'

export default function (app: Application): void {
  app.configure(eth)
  app.configure(watcher)
}
