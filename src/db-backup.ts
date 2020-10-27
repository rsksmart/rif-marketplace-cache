import fs from 'fs'
import config from 'config'
import path from 'path'
import BigNumber from 'bignumber.js'
import { BlockHeader, Eth } from 'web3-eth'
import { Web3Events, NewBlockEmitter, NEW_BLOCK_EVENT_NAME } from '@rsksmart/web3-events'

import { Application, DbBackUpConfig } from './definitions'
import { loggingFactory } from './logger'

const logger = loggingFactory('db:backups')

export type BackUpEntry = { name: string, block: { hash: string, number: BigNumber } }

export function parseBackUps (backUpName: string): BackUpEntry {
  const [block] = backUpName.split('.')[0].split('-')
  const [hash, blockNumber] = block.split(':')

  return {
    name: backUpName,
    block: { number: new BigNumber(blockNumber), hash }
  }
}

export function getBackUps (): BackUpEntry[] {
  const backupConfig = config.get<DbBackUpConfig>('dbBackUp')

  const backups = fs.readdirSync(path.resolve(backupConfig.path))

  if (backups.length) {
    return backups
      .map(parseBackUps)
      .sort(
        (a: Record<string, any>, b: Record<string, any>) =>
          a.block.number.gt(b.block.number) ? -1 : 1
      )
  }

  return []
}

export class DbBackUpJob {
  readonly newBlockEmitter: NewBlockEmitter
  readonly db: string
  readonly eth: Eth
  readonly backUpConfig: DbBackUpConfig
  private listenerUnsubscribe?: () => void

  constructor (eth: Eth, newBlockEmitter: NewBlockEmitter) {
    if (!config.has('dbBackUp')) {
      throw new Error('DB Backup config not exist')
    }
    this.backUpConfig = config.get<DbBackUpConfig>('dbBackUp')
    this.db = config.get<string>('db')

    if (!fs.existsSync(path.resolve(this.backUpConfig.path))) {
      fs.mkdirSync(path.resolve(this.backUpConfig.path))
    }

    this.eth = eth
    this.newBlockEmitter = newBlockEmitter
  }

  /**
   * Back-up database if blocks condition met
   * @return {Promise<void>}
   * @param block
   */
  private async backupDb (block: BlockHeader): Promise<void> {
    const [lastBackUp, previousBackUp] = getBackUps()

    if (!lastBackUp || new BigNumber(block.number).minus(this.backUpConfig.blocks).gte(lastBackUp.block.number)) {
      // copy and rename current db
      await fs.promises.copyFile(this.db, path.resolve(this.backUpConfig.path, `${block.hash}:${block.number}-${this.db}`))

      // remove the oldest version
      if (previousBackUp) {
        await fs.promises.unlink(path.resolve(this.backUpConfig.path, previousBackUp.name))
      }
      logger.info(`Make DB backup on block ${block.number}`)
    }
  }

  /**
   * Restore database backup
   * @return {Promise<void>}
   */
  public async restoreDb (): Promise<void> {
    const backUps = getBackUps()
    const [_, oldest] = backUps

    if (backUps.length < 2) {
      throw new Error('Should be two backups to be able to restore')
    }

    // Check if back up block hash exist after reorg
    const block = await this.eth.getBlock(oldest.block.hash).catch(() => false)

    if (!block) {
      throw new Error('Invalid backup. Block Hash is not valid!')
    }

    // remove current db
    await fs.promises.unlink(this.db)

    // restore backup
    await fs.promises.copyFile(path.resolve(this.backUpConfig.path, oldest.name), path.resolve(process.cwd(), this.db))
  }

  public startBackingUp (): void {
    this.listenerUnsubscribe = this.newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, this.backupDb.bind(this))
  }

  public stop (): void {
    if (this.listenerUnsubscribe) {
      this.listenerUnsubscribe()
    }
  }
}

export function initBackups (app: Application) {
  const eth = app.get('eth') as Eth
  const web3events = app.get('web3events') as Web3Events

  const backups = new DbBackUpJob(eth, web3events.defaultNewBlockEmitter)
  backups.startBackingUp()
  app.set('backups', backups)
}
