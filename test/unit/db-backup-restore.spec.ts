import path from 'path'
import fs from 'fs'
import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { Eth } from 'web3-eth'
import { Substitute, Arg } from '@fluffy-spoon/substitute'
import { NEW_BLOCK_EVENT_NAME, NewBlockEmitter } from '@rsksmart/web3-events'
import { EventEmitter } from 'events'
import util from 'util'

import { DbBackUpJob } from '../../src/db-backup'
import { blockMock, rmDir, sleep } from '../utils'
import { resolvePath } from '../../src/utils'

chai.use(sinonChai)
const expect = chai.expect
const setImmediatePromise = util.promisify(setImmediate)

describe('DB back-up/restore', function () {
  const configBackUp = { db: config.get('db'), dbBackUp: config.get('dbBackUp') }
  const dbPath = resolvePath(config.get('db'))
  const dbName = dbPath.replace(new RegExp(path.sep, 'g'), '_')
  const dbBackupDirectory = resolvePath(config.get('dbBackUp.path'))

  // Create dataDir if not exists
  before(() => fs.mkdirSync(resolvePath(), { recursive: true }))

  describe('Restore', () => {
    before(() => fs.writeFileSync(dbPath, 'Initial DB'))
    after(() => fs.unlinkSync(dbPath))
    afterEach(() => rmDir(dbBackupDirectory))

    it('should throw if not enough backups', async () => {
      const eth = Substitute.for<Eth>()
      const backupJob = new DbBackUpJob(eth, Substitute.for<NewBlockEmitter>())

      expect(fs.readdirSync(dbBackupDirectory).length).to.be.eql(0)
      await expect(backupJob.restoreDb()).to.eventually.be.rejectedWith(
        Error,
        'Should be two backups to be able to restore'
      )
    })

    it('should throw if backup block hash is not exist after reorg', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).rejects(new Error('Not found'))

      const backupJob = new DbBackUpJob(eth, Substitute.for<NewBlockEmitter>())
      fs.writeFileSync(path.resolve(dbBackupDirectory, `0x0123:10:${dbName}`), 'First ')
      fs.writeFileSync(path.resolve(dbBackupDirectory, `0x0123:20:${dbName}`), 'Second')
      expect(fs.readdirSync(dbBackupDirectory).length).to.be.eql(2)

      await expect(backupJob.restoreDb()).to.eventually.be.rejectedWith(
        Error,
        'Useless backup. Reorg is deeper then our latest backup'
      )
    })

    it('should restore database', async () => {
      const eth = Substitute.for<Eth>()

      const backupJob = new DbBackUpJob(eth, Substitute.for<NewBlockEmitter>())
      eth.getBlock('0x0123').resolves(blockMock(10))

      fs.writeFileSync(path.resolve(dbBackupDirectory, `0x0123:10:${dbName}`), 'First db backup')
      fs.writeFileSync(path.resolve(dbBackupDirectory, `0x01234:20:${dbName}`), 'Second db backup')

      expect(fs.readdirSync(dbBackupDirectory).length).to.be.eql(2)
      await backupJob.restoreDb()

      expect(fs.readFileSync(dbPath).toString()).to.be.eql('First db backup')
    })
  })

  describe('Back Up Job', () => {
    before(() => fs.writeFileSync(dbPath, 'Initial DB'))
    after(() => fs.unlinkSync(dbPath))
    afterEach(() => rmDir(dbBackupDirectory))

    it('should throw error if "dbBackUp" not in config', () => {
      // @ts-ignore
      config.util.extendDeep(config, { dbBackUp: undefined })

      expect(config.has('dbBackUp')).to.be.false()

      expect(() => new DbBackUpJob(Substitute.for<Eth>(), Substitute.for<NewBlockEmitter>())).to.throw(
        Error,
        'DB Backup config not exist'
      )

      // @ts-ignore
      config.util.extendDeep(config, configBackUp)
    })

    it('should create back-up folder if not exist', () => {
      // TODO: fs.exists is deprecated
      expect(fs.existsSync(dbBackupDirectory)).to.be.false()

      const job = new DbBackUpJob(Substitute.for<Eth>(), Substitute.for<NewBlockEmitter>())

      expect(job).to.be.instanceOf(DbBackUpJob)
      expect(fs.existsSync(dbBackupDirectory)).to.be.true()
    })

    it('should make backup if not exist', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const newBlockEmitter = new EventEmitter()
      const job = new DbBackUpJob(eth, newBlockEmitter as unknown as NewBlockEmitter)

      job.startBackingUp()
      await setImmediatePromise()
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(10))
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(dbBackupDirectory)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql([`0x123:${10}:${dbName}`])
    })
    it('should not make backup if blocks condition not met', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const newBlockEmitter = new EventEmitter()
      const job = new DbBackUpJob(eth, newBlockEmitter as unknown as NewBlockEmitter)

      job.startBackingUp()
      await setImmediatePromise()
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(10))
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(dbBackupDirectory)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql([`0x123:${10}:${dbName}`])

      // should skip this block as it's not met condition
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(13))
      await sleep(300)

      const files2 = fs.readdirSync(dbBackupDirectory)
      expect(files2.length).to.be.eql(1)
      expect(files2).to.be.eql([`0x123:${10}:${dbName}`])
    })
    it('should add second backup', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const backups = []
      const newBlockEmitter = new EventEmitter()
      const job = new DbBackUpJob(eth, newBlockEmitter as unknown as NewBlockEmitter)

      job.startBackingUp()
      await setImmediatePromise()
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(10))
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(dbBackupDirectory)
      backups.push(`0x123:${10}:${dbName}`)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql(backups)

      // should add another backe up
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(30))
      await sleep(300)

      const files2 = fs.readdirSync(dbBackupDirectory)
      backups.push(`0x123:${30}:${dbName}`)
      expect(files2.length).to.be.eql(2)
      expect(files2).to.be.eql(backups)
    })
    it('should replace oldest back-up with fresh one', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const backups = []
      const newBlockEmitter = new EventEmitter()
      const job = new DbBackUpJob(eth, newBlockEmitter as unknown as NewBlockEmitter)

      job.startBackingUp()
      await setImmediatePromise()
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(10))
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(dbBackupDirectory)
      backups.push(`0x123:${10}:${dbName}`)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql(backups)

      // should add another backe up
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(30))
      await sleep(300)

      const files2 = fs.readdirSync(dbBackupDirectory)
      backups.push(`0x123:${30}:${dbName}`)
      expect(files2.length).to.be.eql(2)
      expect(files2).to.be.eql(backups)

      // should replace the oldest backup with fresh one
      newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(45))
      await sleep(300)

      const files3 = fs.readdirSync(dbBackupDirectory)
      backups.push(`0x123:${45}:${dbName}`)
      expect(files3.length).to.be.eql(2)
      expect(files3).to.be.eql(backups.slice(1))
    })
  })
})
