import sinon from 'sinon'
import config from 'config'
import path from 'path'
import * as AppModule from '../../src/app'
import chai from 'chai'

import RnsService from '../../src/services/rns'
import StorageService from '../../src/services/storage'
import { unlinkSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import { sequelizeFactory } from '../../src/sequelize'
import { initStore } from '../../src/store'
import { getEndPromise } from 'sequelize-store'
import StartCommand from '../../src/cli/start'
import { rmDir, sleep } from '../utils'
import sinonChai from 'sinon-chai'
import * as blockchainUtils from '../../src/blockchain'
import { Eth } from 'web3-eth'
import Rate from '../../src/services/rates/rates.model'
import { Application, DbBackUpConfig } from '../../src/definitions'

chai.use(sinonChai)
const expect = chai.expect

describe('CLI', function () {
  this.timeout(10000)
  after(() => {
    sinon.reset()
    rmDir(config.get<DbBackUpConfig>('dbBackUp').path)
  })
  before(async () => {
    // Prepare DB and set it to be used
    const dbPath = path.join(__dirname, '..', '..', config.get<string>('db'))
    try {
      unlinkSync(dbPath)
    } catch (e) {
      // Ignore "not found" errors
      if (e.code !== 'ENOENT') {
        throw e
      }
    }

    // Init the DB
    const sequelize = sequelizeFactory()
    // const migration = new Migration(sequelize)
    // await migration.up()
    await sequelize.sync({ force: true })
    await initStore(sequelize)
    await getEndPromise()
  })

  it('should restart when appResetCallback is triggered', async () => {
    // create backups
    const db = config.get<string>('db')
    const backupPath = path.resolve(process.cwd(), config.get<string>('dbBackUp.path'))

    if (!existsSync(path.resolve(config.get<DbBackUpConfig>('dbBackUp').path))) {
      mkdirSync(path.resolve(config.get<DbBackUpConfig>('dbBackUp').path))
    }
    copyFileSync(db, path.resolve(backupPath, `0x0123:10-${db}`))
    copyFileSync(db, path.resolve(backupPath, `0x0123:20-${db}`))

    // Create fake rate
    await Rate.create({
      token: '123456789012345',
      usd: 1,
      eur: 1,
      btc: 1,
      ars: 1,
      cny: 1,
      krw: 1,
      jpy: 1
    })

    expect(await Rate.findByPk(123456789012345)).to.be.ok()

    // Mock the dependencies
    let appResetCallback = (() => {
      throw new Error('AppResetCallback was not assigned!')
    }) as () => void
    const stopSpy = sinon.spy()
    const initAppStub = sinon.stub(AppModule, 'appFactory')
    initAppStub.callsFake((options: AppModule.AppOptions): Promise<{ app: Application, stop: () => void }> => {
      appResetCallback = options.appResetCallBack

      return Promise.resolve({ app: { listen: () => ({ on: () => undefined }) } as unknown as Application, stop: stopSpy })
    })
    sinon.stub(blockchainUtils, 'ethFactory').returns({
      getBlock: sinon.stub().resolves(true)
    } as unknown as Eth)
    const rnsPrecacheStub = sinon.stub(RnsService, 'precache').resolves()
    const storagePrecacheStub = sinon.stub(StorageService, 'precache').resolves()

    // Launches the Daemon
    // @ts-ignore
    StartCommand.run([]).then(() => null, (e) => expect.fail(e))

    await sleep(3000)
    //
    appResetCallback() // Trigger reset
    //
    await sleep(3000)

    // Precache called
    expect(rnsPrecacheStub.called).to.be.true()
    expect(storagePrecacheStub.called).to.be.true()
    // restart connection after db restored
    sequelizeFactory()
    // db restored
    expect(await Rate.findByPk('123456789012345')).to.be.eql(null)

    rmDir(backupPath)
    sinon.reset()
  })
})
