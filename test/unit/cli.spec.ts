import sinon from 'sinon'
import config from 'config'
import path from 'path'
import chai from 'chai'
import { unlinkSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import { Arg, Substitute } from '@fluffy-spoon/substitute'
import { getEndPromise } from 'sequelize-store'
import sinonChai from 'sinon-chai'
import { Eth } from 'web3-eth'
import { NewBlockEmitter } from '@rsksmart/web3-events'

import * as AppModule from '../../src/app'
import { sequelizeFactory } from '../../src/sequelize'
import { initStore } from '../../src/store'
import StartCommand from '../../src/cli/start'
import { blockMock, rmDir, sleep } from '../utils'
import Rate from '../../src/services/rates/rates.model'
import { Application, DbBackUpConfig } from '../../src/definitions'
import { DbBackUpJob } from '../../src/db-backup'

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

    const eth = Substitute.for<Eth>()
    eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
    const backups = new DbBackUpJob(eth, Substitute.for<NewBlockEmitter>())

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
    initAppStub.callsFake((options: AppModule.AppOptions): Promise<AppModule.AppReturns> => {
      appResetCallback = options.appResetCallBack
      return Promise.resolve({
        app: { listen: () => ({ on: () => undefined }) } as unknown as Application,
        backups: backups,
        stop: stopSpy
      })
    })

    // Launches the Daemon
    // @ts-ignore
    StartCommand.run([]).then(() => null, (e) => expect.fail(e))

    await sleep(3000)

    appResetCallback() // Trigger reset
    //
    await sleep(3000)

    // restart connection after db restored
    sequelizeFactory()
    // db restored
    expect(await Rate.findByPk('123456789012345')).to.be.eql(null)

    rmDir(backupPath)
    sinon.reset()
  })
})
