import fs from 'fs'
import config from 'config'
import path from 'path'
import BigNumber from 'bignumber.js'
import { BlockHeader, Eth } from 'web3-eth'
import { Web3Events, NewBlockEmitter, NEW_BLOCK_EVENT_NAME } from '@rsksmart/web3-events'

import { Application } from './definitions'
import { loggingFactory } from './logger'
import { errorHandler, resolvePath } from './utils'

const logger = loggingFactory('db:backups')

export type BackUpEntry = { backupName: string, fileName: string, block: { hash: string, number: BigNumber } }

export function parseBackUps (fileName: string): BackUpEntry {
  const [hash, blockNumber, name] = fileName.split(':')

  return {
    fileName,
    backupName: name,
    block: { number: new BigNumber(blockNumber), hash }
  }
}

export async function getBackUps (backupDirectory: string): Promise<BackUpEntry[]> {
  const backups = await fs.promises.readdir(backupDirectory)

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
  private readonly newBlockEmitter: NewBlockEmitter
  private readonly dbPath: string
  private readonly dbName: string
  private readonly eth: Eth
  private readonly backupDirectory: string
  private readonly backupBlockFrequency: number
  private listenerUnsubscribe?: () => void

  constructor (eth: Eth, newBlockEmitter: NewBlockEmitter) {
    if (!config.has('dbBackUp')) {
      throw new Error('DB Backup config not exist')
    }

    this.backupDirectory = resolvePath(config.get<string>('dbBackUp.path'))
    this.backupBlockFrequency = config.get<number>('dbBackUp.blocks')
    this.dbPath = resolvePath(config.get<string>('db'))
    this.dbName = this.dbPath.replace(new RegExp(path.sep, 'g'), '_')

    if (this.dbPath.includes(':')) {
      throw new Error('The DB Path includes character ":" which is not allowed!')
    }

    try {
      fs.accessSync(this.backupDirectory)
    } catch (e) {
      if (e.code === 'ENOENT') {
        fs.mkdirSync(this.backupDirectory, { recursive: true })
      }
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
    const [lastBackUp, previousBackUp] = await getBackUps(this.backupDirectory)

    if (!lastBackUp || new BigNumber(block.number).minus(this.backupBlockFrequency).gte(lastBackUp.block.number)) {
      logger.info(`Making DB backup on block ${block.number}`)

      // copy and rename current db
      await fs.promises.copyFile(this.dbPath, path.join(this.backupDirectory, `${block.hash}:${block.number}:${this.dbName}`))

      // remove the oldest version
      if (previousBackUp) {
        await fs.promises.unlink(path.join(this.backupDirectory, previousBackUp.fileName))
      }

      logger.info('Making of DB backup finished')
    }
  }

  /**
   * Restore database backup
   * @return {Promise<void>}
   */
  public async restoreDb (): Promise<void> {
    const backUps = await getBackUps(this.backupDirectory)
    const [_, oldest] = backUps

    if (backUps.length < 2) {
      throw new Error('Should be two backups to be able to restore')
    }

    // Check if back up block hash exist after reorg
    const block = await this.eth.getBlock(oldest.block.hash).catch(() => false)

    if (!block) {
      throw new Error('Useless backup. Reorg is deeper then our latest backup')
    }

    // remove current db
    await fs.promises.unlink(this.dbPath)

    // restore backup
    await fs.promises.copyFile(resolvePath(this.backupDirectory, oldest.fileName), this.dbPath)
  }

  public startBackingUp (): void {
    this.listenerUnsubscribe = this.newBlockEmitter.on(NEW_BLOCK_EVENT_NAME, errorHandler(this.backupDb.bind(this), logger))
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
