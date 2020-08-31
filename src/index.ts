import { appFactory } from './app'

(async function (): Promise<void> {
  await appFactory({ appResetCallBack: () => { throw new Error('Reset callback not implemented') } })
})()
