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
import Rate from '../../src/rates/rates.model'
import { Application, DbBackUpConfig } from '../../src/definitions'
import { DbBackUpJob } from '../../src/db-backup'
import { resolvePath } from '../../src/utils'
import Migration from '../../src/migrations'

chai.use(sinonChai)
const expect = chai.expect

describe('CLI', function () {
  this.timeout(10000)

  const dbPath = resolvePath(config.get('db'))
  const dbName = dbPath.replace(new RegExp(path.sep, 'g'), '_')
  const dbBackupDirectory = resolvePath(config.get('dbBackUp.path'))

  after(() => {
    sinon.reset()
    rmDir(dbBackupDirectory)
  })

  before(async () => {
    // Prepare DB and set it to be used
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
    const migration = new Migration(sequelize)
    await migration.up()
    await initStore(sequelize)
    await getEndPromise()
  })

  it('should restart when appResetCallback is triggered', async () => {
    if (!existsSync(dbBackupDirectory)) {
      mkdirSync(dbBackupDirectory, { recursive: true })
    }

    copyFileSync(dbPath, path.join(dbBackupDirectory, `0x0123:10:${dbName}`))
    copyFileSync(dbPath, path.join(dbBackupDirectory, `0x0123:20:${dbName}`))

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

    rmDir(dbBackupDirectory)
    sinon.reset()
  })
})
