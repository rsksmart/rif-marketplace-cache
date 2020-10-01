import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { TestingApp } from '../utils'

chai.use(sinonChai)
const expect = chai.expect

describe.only('Storage Manager service', function () {
  this.timeout(10000)
  let app: TestingApp
  before(async () => {
    // @ts-ignore
    config.rns.enabled = false
    app = new TestingApp()
    await app.initAndStart()
  })
  after(async () => {
    await app.stop()
  })
  it('test', () => {
    console.log('first test')
  })
})
