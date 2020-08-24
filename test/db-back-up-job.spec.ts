import fs from 'fs'
import config from 'config'
import chai from 'chai'
import sinonChai from 'sinon-chai'
import { Eth } from 'web3-eth'
import { Substitute } from '@fluffy-spoon/substitute'

import { DbBackUpJob } from '../src/utils'
import { getNewBlockEmitter } from '../src/blockchain/utils'

chai.use(sinonChai)
const expect = chai.expect

describe('DB back up job', () => {
  const configBackUp = { db: config.get('db'), dbBackUp: config.get('dbBackUp') }
  const eth = Substitute.for<Eth>()
  const newBlockEmitter = getNewBlockEmitter(eth)

  describe('DbBackUpJob constructor', () => {
    afterEach(() => config.util.extendDeep(config, configBackUp))

    it('should throw error if "dbBackUp" not in config', () => {
      // @ts-ignore
      config.util.extendDeep(config, { dbBackUp: undefined })

      expect(config.has('dbBackUp')).to.be.false()

      expect(() => new DbBackUpJob(newBlockEmitter)).to.throw(
        Error,
        'DB Backup config not exist'
      )
    })
    it('should throw error if confirmation range greater the backup range', () => {
      // @ts-ignore
      config.util.extendDeep(config, { dbBackUp: { blocks: 2 }, rns: { enabled: true, owner: { eventsEmitter: { confirmations: 5 } } } })

      const invalidConfirmation = { name: 'rns.owner' }

      expect(() => new DbBackUpJob(newBlockEmitter)).to.throw(
        Error,
        `Invalid db backup configuration. Number of backup blocks should be greater then confirmation blocks for ${invalidConfirmation.name} service`
      )
    })
    it('should create back-up folder if not exist', () => {
      const dbPath = config.get<string>('dbBackUp.path')

      if (fs.existsSync(dbPath)) fs.rmdirSync(dbPath, { recursive: true })
      expect(fs.existsSync(dbPath)).to.be.false()

      const job = new DbBackUpJob(newBlockEmitter)

      expect(fs.existsSync(dbPath)).to.be.true()
    })
  })
})
