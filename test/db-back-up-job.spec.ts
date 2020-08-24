import path from 'path'
import fs from 'fs'
import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { Eth } from 'web3-eth'
import { Substitute, Arg } from '@fluffy-spoon/substitute'

import { DbBackUpJob } from '../src/utils'
import { getNewBlockEmitter } from '../src/blockchain/utils'
import { blockMock, sleep } from './utils'
import { NEW_BLOCK_EVENT_NAME } from '../src/blockchain/new-block-emitters'
import { DbBackUpConfig } from '../src/definitions'

chai.use(sinonChai)
const expect = chai.expect

function rmDir (folder: string) {
  if (fs.existsSync(folder)) {
    for (const file of fs.readdirSync(folder)) {
      fs.unlinkSync(path.join(folder, file))
    }

    fs.rmdirSync(config.get<DbBackUpConfig>('dbBackUp').path, { recursive: true })
  }
}

describe('DB backUp/restore', () => {
  const configBackUp = { db: config.get('db'), dbBackUp: config.get('dbBackUp') }

  afterEach(() => {
    config.util.extendDeep(config, configBackUp)

    rmDir(config.get<DbBackUpConfig>('dbBackUp').path)
  })

  describe('Back Up', () => {
    const eth = Substitute.for<Eth>()
    const newBlockEmitter = getNewBlockEmitter(eth)

    beforeEach(() => rmDir(config.get<DbBackUpConfig>('dbBackUp').path))

    it('should throw error if "dbBackUp" not in config', () => {
      // @ts-ignore
      config.util.extendDeep(config, { dbBackUp: undefined })

      expect(config.has('dbBackUp')).to.be.false()

      expect(() => new DbBackUpJob(newBlockEmitter)).to.throw(
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

      expect(() => new DbBackUpJob(newBlockEmitter)).to.throw(
        Error,
        `Invalid db backup configuration. Number of backup blocks should be greater then confirmation blocks for ${invalidConfirmation.name} service`
      )

      // @ts-ignore
      config.util.extendDeep(config, { rns: { enabled: false } })
    })
    it('should create back-up folder if not exist', () => {
      const dbPath = config.get<string>('dbBackUp.path')

      expect(fs.existsSync(dbPath)).to.be.false()

      const job = new DbBackUpJob(newBlockEmitter)

      expect(fs.existsSync(dbPath)).to.be.true()
    })
    it('should make backup if not exist', async () => {
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const emitter = getNewBlockEmitter(eth)
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path

      const job = new DbBackUpJob(emitter)

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
      const emitter = getNewBlockEmitter(eth)
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path

      const job = new DbBackUpJob(emitter)

      job.run()
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(backUpPath)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql([`0x123:${10}-${config.get<string>('db')}`])

      // should skip this block as it's not met condition
      emitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(13))
      await sleep(300)

      const files2 = fs.readdirSync(backUpPath)
      expect(files2.length).to.be.eql(1)
      expect(files2).to.be.eql([`0x123:${10}-${config.get<string>('db')}`])
    })
    it('should add seconf backup', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const emitter = getNewBlockEmitter(eth)
      const backups = []
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path
      const job = new DbBackUpJob(emitter)

      job.run()
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(backUpPath)
      backups.push(`0x123:${10}-${config.get<string>('db')}`)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql(backups)

      // should add another backe up
      emitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(30))
      await sleep(300)

      const files2 = fs.readdirSync(backUpPath)
      backups.push(`0x123:${30}-${config.get<string>('db')}`)
      expect(files2.length).to.be.eql(2)
      expect(files2).to.be.eql(backups)
    })
    it('should replace oldest back-up with fresh one', async () => {
      const eth = Substitute.for<Eth>()
      eth.getBlock(Arg.all()).returns(Promise.resolve(blockMock(10)))
      const emitter = getNewBlockEmitter(eth)
      const backups = []
      const backUpPath = config.get<DbBackUpConfig>('dbBackUp').path
      const job = new DbBackUpJob(emitter)

      job.run()
      await sleep(300)

      // should have one db back up already
      const files = fs.readdirSync(backUpPath)
      backups.push(`0x123:${10}-${config.get<string>('db')}`)
      expect(files.length).to.be.eql(1)
      expect(files).to.be.eql(backups)

      // should add another backe up
      emitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(30))
      await sleep(300)

      const files2 = fs.readdirSync(backUpPath)
      backups.push(`0x123:${30}-${config.get<string>('db')}`)
      expect(files2.length).to.be.eql(2)
      expect(files2).to.be.eql(backups)

      // should replace the oldest backup with fresh one
      emitter.emit(NEW_BLOCK_EVENT_NAME, blockMock(45))
      await sleep(300)

      const files3 = fs.readdirSync(backUpPath)
      backups.push(`0x123:${45}-${config.get<string>('db')}`)
      expect(files3.length).to.be.eql(2)
      expect(files3).to.be.eql(backups.slice(1))
    })
  })
})
