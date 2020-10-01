import config from 'config'
import { promises as fs } from 'fs'
import path from 'path'
import sinon from 'sinon'
import { reset as resetStore } from 'sequelize-store'
import { Sequelize } from 'sequelize'
import { Eth } from 'web3-eth'
import type { HttpProvider } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { AbiItem, asciiToHex } from 'web3-utils'
import { promisify } from 'util'
import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import stakingContract from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'

import { loggingFactory } from '../../../src/logger'
import { appFactory, AppOptions, services } from '../../../src/app'
import { sequelizeFactory } from '../../../src/sequelize'
import { initStore } from '../../../src/store'
import { Application, SupportedServices } from '../../../src/definitions'
import { ethFactory } from '../../../src/blockchain'

export const appResetCallbackSpy = sinon.spy()

export function encodeHash (hash: string): string[] {
  if (hash.length <= 32) {
    return [asciiToHex(hash)]
  }

  return [asciiToHex(hash.slice(0, 32)), ...encodeHash(hash.slice(32))]
}

export class TestingApp {
  private logger = loggingFactory('test:test-app')
  private app: { stop: () => void, app: Application } | undefined
  public storageContract: Contract | undefined
  public stakingContract: Contract | undefined
  public eth: Eth | undefined
  public sequelize: Sequelize | undefined
  public consumerAddress = ''
  public providerAddress = ''

  async initAndStart (options?: Partial<AppOptions>, force = false): Promise<void> {
    if (this.app && !force) {
      return
    }
    await this.init()
    await this.start(options)
  }

  async init (): Promise<void> {
    // Init Blockchain Provider
    await this.initBlockchainProvider()
    // Deploy StorageManager for provider
    await this.deployStorageManager()
    await this.deployStaking()
    // @ts-ignore
    config.storage.storageManager.contractAddress = this.storageContract?.options.address
    // @ts-ignore
    config.storage.staking.contractAddress = this.stakingContract?.options.address
    // Remove current testing db
    await this.purgeDb()
    this.logger.info('Database removed')
    // Init DB
    const sequelize = await sequelizeFactory()
    await sequelize.sync({ force: true })
    await initStore(sequelize)
    this.logger.info('Database initialized')

    // Precache
    await this.precache()
    this.logger.info('Database precached')
  }

  async precache () {
    for (const service of Object.values(SupportedServices).filter(service => config.get(`${service}.enabled`))) {
      if (service === 'rns') return
      await services[service].precache()
    }
  }

  async start (options?: Partial<AppOptions>): Promise<void> {
    // Run Pinning service
    const appOptions = Object.assign({
      appResetCallback: appResetCallbackSpy
    }, options) as AppOptions
    this.app = await appFactory(appOptions)

    // Start server
    const port = config.get('port')
    const server = this.app.app.listen(port)
    this.logger.info('Cache service started')

    server.on('listening', () =>
      this.logger.info(`Server started on port ${port}`)
    )

    process.on('unhandledRejection', err =>
      this.logger.error(`Unhandled Rejection at: ${err}`)
    )
  }

  async stop (): Promise<void> {
    if (this.app) {
      await this.app.stop()
    }

    await this.sequelize?.close()
    resetStore()

    this.sequelize = undefined
    this.app = undefined
    this.eth = undefined
    this.storageContract = undefined
    this.consumerAddress = ''
    this.providerAddress = ''
  }

  private async purgeDb (): Promise<void> {
    try {
      await fs
        .unlink(path.join(process.cwd(), config.get<string>('db')))
    } catch (e) {
      // File does not exist
      if (e.code !== 'ENOENT') {
        throw e
      }
    }
  }

  private async initBlockchainProvider (): Promise<void> {
    this.eth = ethFactory()
    const [provider, consumer] = await this.eth.getAccounts()
    this.providerAddress = provider
    this.consumerAddress = consumer
  }

  // private async createOffer (): Promise<void> {
  //   if (!this.storageContract || !this.providerAddress) {
  //     throw new Error('Provider should be initialized and has at least 2 accounts and StorageManage contract should be deployed')
  //   }
  //
  //   const encodedPeerId = encodeHash(this.peerId!.id).map(el => el.replace('0x', ''))
  //   const prefixedMsg = prefixArray(encodedPeerId, '01', 64)
  //     .map(el => `0x${el}`)
  //
  //   const offerCall = this.contract
  //     .methods
  //     .setOffer(1000000, [1, 100], [10, 80], prefixedMsg)
  //   await offerCall.send({ from: this.providerAddress, gas: await offerCall.estimateGas() })
  // }

  private async deployStorageManager (): Promise<void> {
    if (!this.eth || !this.providerAddress) throw new Error('Provider should be initialized and has at least 2 accounts')
    const contract = new this.eth.Contract(storageManagerContract.abi as AbiItem[])
    const deploy = await contract.deploy({ data: storageManagerContract.bytecode })
    this.storageContract = await deploy.send({ from: this.providerAddress, gas: await deploy.estimateGas() })
    await this.storageContract?.methods.setWhitelistedTokens('0x0000000000000000000000000000000000000000', true)
  }

  private async deployStaking (): Promise<void> {
    if (!this.eth || !this.providerAddress) throw new Error('Provider should be initialized and has at least 2 accounts')
    const contract = new this.eth.Contract(stakingContract.abi as AbiItem[])
    const deploy = await contract.deploy({ arguments: [this.storageContract?.options.address], data: stakingContract.bytecode })
    this.stakingContract = await deploy.send({ from: this.providerAddress, gas: await deploy.estimateGas() })
    await this.stakingContract?.methods.setWhitelistedTokens('0x0000000000000000000000000000000000000000', true)
  }

  public async advanceBlock (): Promise<void> {
    if (!this.eth || !this.eth.currentProvider) {
      throw new Error('Eth was not initialized!')
    }

    await promisify((this.eth.currentProvider as HttpProvider).send.bind(this.eth.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: new Date().getTime()
    })
  }
}