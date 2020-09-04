import { startApp } from './app'

(async function (): Promise<void> {
  await startApp({ appResetCallBack: () => { throw new Error('Reset callback not implemented') } })
})()
