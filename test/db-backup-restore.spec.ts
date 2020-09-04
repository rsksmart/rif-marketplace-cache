import path from 'path'
import fs from 'fs'
import config from 'config'
import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { Eth } from 'web3-eth'
import { Substitute, Arg } from '@fluffy-spoon/substitute'

import DbBackUpJob from '../src/db-backup'
import { blockMock, rmDir, sleep } from './utils'
import { NEW_BLOCK_EVENT_NAME } from '../src/blockchain/new-block-emitters'
import { DbBackUpConfig } from '../src/definitions'

chai.use(sinonChai)
const expect = chai.expect

describe('DB back-up/restore', function () {
  const configBackUp = { db: config.get('db'), dbBackUp: config.get('dbBackUp') }

  describe('Restore', () => {
    before(() => fs.writeFileSync(config.get<string>('db'), 'Initial DB'))
    after(() => fs.unlinkSync(config.get<string>('db')))
    afterEach(() => rmDir(config.get<DbBackUpConfig>('dbBackUp').path))

    it('should throw if not enough backups', async () => {
      const eth = Substitute.for<Eth>()
      const backupJob = new DbBackUpJob(eth)
      const errorCallBack = sinon.spy()

      expect(fs.readdirSync(config.get<DbBackUpConfig>('dbBackUp').path).length).to.be.eql(0)
      await expect(backupJob.restoreDb()).to.eventually.be.rejectedWith(
        Error,
        'Should be two backups to be able to restore'
      )
      expect(errorCallBack.calledOnce).to.be.true()
      expect(errorCallBack.calledWith({ code: 1, message: 'Not enough backups' })).to.be.true()
    })
    it('should throw if backup block hash is not exist after reorg', async () => {
      const eth = Substitute.for<Eth>()
      const errorCallBack = sinon.spy()
      const backupPath = config.get<DbBackUpConfig>('dbBackUp').path
      const db = config.get<string>('db')

      eth.getBlock(Arg.all()).rejects(new Error('Not found'))
      const backupJob = new DbBackUpJob(eth)
      fs.writeFileSync(path.resolve(backupPath, `0x0123:10-${db}`), 'First ')
      fs.writeFileSync(path.resolve(backupPath, `0x0123:20-${db}`), 'Second')

      expect(fs.readdirSync(backupPath).length).to.be.eql(2)
      await expect(backupJob.restoreDb()).to.eventually.be.rejectedWith(
        Error,
        'Invalid backup. Block Hash is not valid!'
      )
      expect(errorCallBack.called).to.be.true()
      expect(errorCallBack.calledWith({ code: 2, message: 'Invalid backup. Block Hash is not valid!' }))
    })
    it('should restore database', async () => {
      const eth = Substitute.for<Eth>()
      const errorCallBack = sinon.spy()
      const backupPath = config.get<DbBackUpConfig>('dbBackUp').path
      const db = config.get<string>('db')

      const backupJob = new DbBackUpJob(eth)
      eth.getBlock('0x0123').resolves(blockMock(10))

      fs.writeFileSync(path.resolve(backupPath, `0x0123:10-${db}`), 'First db backup')
      fs.writeFileSync(path.resolve(backupPath, `0x01234:20-${db}`), 'Second db backup')

      expect(fs.readdirSync(backupPath).length).to.be.eql(2)
      await backupJob.restoreDb()
      await sleep(1000)

      expect(errorCallBack.called).to.be.false()

      expect(fs.readFileSync(db).toString()).to.be.eql('First db backup')
    })
  })

  describe('Back Up Job', () => {
    before(() => fs.writeFileSync(config.get<string>('db'), 'Initial DB'))
    after(() => fs.unlinkSync(config.get<string>('db')))
    afterEach(() => rmDir(config.get<DbBackUpConfig>('dbBackUp').path))

    it('should throw error if "dbBackUp" not in config', () => {
      // @ts-ignore
      config.util.extendDeep(config, { dbBackUp: undefined })

      expect(config.has('dbBackUp')).to.be.false()

      expect(() => new DbBackUpJob(Substitute.for<Eth>())).to.throw(
        Error,
        'DB Backup config not exist'
      )

      // @ts-ignore
      config.util.extendDeep(config, configBackUp)
    })
    it('should throw error if confirmation range greater the backup range', () => {
      // @ts-ignore
      config.util.extendDeep(config, {
        rns: { enabled: true, owner: { eventsEmitter: { confirmations: 11 } } }
      })

      const invalidConfirmation = { name: 'rns.owner' }

      expect(() => new DbBackUpJob(Substitute.for<Eth>())).to.throw(
        Error,
        `Invalid db backup configuration. Number of backup blocks should be greater then confirmation blocks for ${invalidConfirmation.name} service`
      )

      // @ts-ignore
      config.util.extendDeep(config, { rns: { enabled: false } })
    })
    it('should create back-up folder if not exist', () => {
      const dbPath = config.get<string>('dbBackUp.path')

      expect(fs.existsSync(dbPath)).to.be.false()

      const job = new DbBackUpJob(Substitute.for<Eth>())

      expect(fs.existsSync(dbPath)).to.be.true()
    })
    it('should make backup if not exist', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path

      const job = new DbBackUpJob(eth)

      job.run()
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(backUpPath)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql([`0x123:${10}-${config.get<string>('db')}`])
    })
    it('should not make backup if blocks condition not met', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path

      const job = new DbBackUpJob(eth)

      job.run()
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(backUpPath)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql([`0x123:${10}-${config.get<string>('db')}`])

      // should skip this block as it's not met condition
      job.newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(13))
      await sleep(300)

      const files2 = fs.readdirSync(backUpPath)
      expect(files2.length).to.be.eql(1)
      expect(files2).to.be.eql([`0x123:${10}-${config.get<string>('db')}`])
    })
    it('should add seconf backup', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const backups = []
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path
      const job = new DbBackUpJob(eth)

      job.run()
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(backUpPath)
      backups.push(`0x123:${10}-${config.get<string>('db')}`)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql(backups)

      // should add another backe up
      job.newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(30))
      await sleep(300)

      const files2 = fs.readdirSync(backUpPath)
      backups.push(`0x123:${30}-${config.get<string>('db')}`)
      expect(files2.length).to.be.eql(2)
      expect(files2).to.be.eql(backups)
    })
    it('should replace oldest back-up with fresh one', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const backups = []
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path
      const job = new DbBackUpJob(eth)

      job.run()
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(backUpPath)
      backups.push(`0x123:${10}-${config.get<string>('db')}`)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql(backups)

      // should add another backe up
      job.newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(30))
      await sleep(300)

      const files2 = fs.readdirSync(backUpPath)
      backups.push(`0x123:${30}-${config.get<string>('db')}`)
      expect(files2.length).to.be.eql(2)
      expect(files2).to.be.eql(backups)

      // should replace the oldest backup with fresh one
      job.newBlockEmitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(45))
      await sleep(300)

      const files3 = fs.readdirSync(backUpPath)
      backups.push(`0x123:${45}-${config.get<string>('db')}`)
      expect(files3.length).to.be.eql(2)
      expect(files3).to.be.eql(backups.slice(1))
    })
  })
})
