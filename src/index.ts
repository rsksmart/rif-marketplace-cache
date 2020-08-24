import { loggingFactory } from './logger'
import { appFactory } from './app'

(async function (): Promise<void> {
  const logger = loggingFactory()
  const app = await appFactory({ appResetCallBack: () => { throw new Error('Reset callback not implemented') } })
})()
