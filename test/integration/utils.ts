import config from 'config'
import { promises as fs } from 'fs'
import sinon from 'sinon'
import { reset as resetStore } from 'sequelize-store'
import { Sequelize } from 'sequelize'
import { Eth } from 'web3-eth'
import type { HttpProvider } from 'web3-core'
import { Contract } from 'web3-eth-contract'
import { AbiItem, asciiToHex, padRight } from 'web3-utils'
import BigNumber from 'bignumber.js'
import { promisify } from 'util'
import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import stakingContract from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'
import feathers from '@feathersjs/feathers'
import socketio from '@feathersjs/socketio-client'
import io from 'socket.io-client'
import PeerId from 'peer-id'

import { loggingFactory } from '../../src/logger'
import { appFactory, AppOptions } from '../../src/app'
import { sequelizeFactory } from '../../src/sequelize'
import { initStore } from '../../src/store'
import { Application, SupportedServices } from '../../src/definitions'
import { ethFactory } from '../../src/blockchain'
import { sleep } from '../utils'
import DbMigration from '../../src/migrations'
import { resolvePath } from '../../src/utils'
import * as http from 'http'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const ZERO_BYTES_32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const appResetCallbackSpy = sinon.spy()

export function encodeHash (hash: string): string[] {
  if (hash.length <= 32) {
    return [padRight(asciiToHex(hash), 64)]
  }

  return [asciiToHex(hash.slice(0, 32)), ...encodeHash(hash.slice(32))]
}

/**
 * IN-PLACE prefix array!
 * @param arr
 * @param prefix
 * @param lengthPerElement
 */
export function prefixArray (arr: string[], prefix: string, lengthPerElement = 32): string[] {
  if (prefix.length >= lengthPerElement) {
    throw new Error(`Too long prefix! Max ${lengthPerElement} chars!`)
  }

  const endingLength = lengthPerElement - prefix.length

  let tmp
  let carryOver = prefix
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].length > lengthPerElement) {
      throw new Error(`Element ${i} was longer then expected!`)
    }

    tmp = `${carryOver}${arr[i].slice(0, endingLength)}`
    carryOver = arr[i].slice(endingLength)
    arr[i] = tmp
  }

  if (carryOver) {
    arr.push(carryOver)
  }

  return arr
}

export class TestingApp {
  private readonly logger = loggingFactory('test:test-app')
  private app: { stop: () => void, app: Application } | undefined
  public storageContract: Contract | undefined
  public stakingContract: Contract | undefined
  public eth: Eth | undefined
  public server: http.Server | undefined
  public sequelize: Sequelize | undefined
  public accounts: string[] = []
  public nextAccountIndex = 0
  public consumerAddress = ''
  public providerAddress = ''
  public contractOwner = ''
  public peerId: PeerId.JSONPeerId | undefined

  async initAndStart (options?: Partial<AppOptions>, force = false): Promise<void> {
    if (this.app && !force) {
      return
    }
    await this.init()
    this.logger.info('App initialized')
    await this.start(options)
    this.logger.info('App started')
  }

  async deployContracts () {
    for (const service of Object.values(SupportedServices).filter(service => config.get(`${service}.enabled`))) {
      switch (service) {
        case SupportedServices.RNS:
          // TODO: Deploy and configure RNS contracts
          break
        case SupportedServices.STORAGE:
          await this.deployStorageManager()
          await this.deployStaking()
          // @ts-ignore: not typed
          config.storage.storageManager.contractAddress = this.storageContract?.options.address.toLowerCase()
          // @ts-ignore: not typed
          config.storage.staking.contractAddress = this.stakingContract?.options.address.toLowerCase()
          break
        default:
          return
      }
    }
  }

  async init (): Promise<void> {
    this.peerId = (await PeerId.create()).toJSON()
    // Init Blockchain Provider
    await this.initBlockchainProvider()
    // Deploy StorageManager for provider
    await this.deployContracts()
    // Remove current testing db
    await this.purgeDb()
    this.logger.info('Database removed')
    // Init DB
    const sequelize = await sequelizeFactory()
    const migration = new DbMigration(sequelize)
    await migration.up()
    await initStore(sequelize)
    this.logger.info('Database initialized')
  }

  async start (options?: Partial<AppOptions>): Promise<void> {
    // Run Cache service
    const appOptions = Object.assign({
      requirePrecache: true,
      appResetCallback: appResetCallbackSpy
    }, options) as AppOptions
    this.app = await appFactory(appOptions)

    // Start server
    const port = config.get('port')
    this.server = this.app.app.listen(port)
    this.logger.info('Cache service started')

    this.server.on('listening', () =>
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
    this.server?.close()

    await this.sequelize?.close()
    resetStore()

    this.sequelize = undefined
    this.app = undefined
    this.eth = undefined
    this.storageContract = undefined
    this.consumerAddress = ''
    this.providerAddress = ''
    this.contractOwner = ''
  }

  private async purgeDb (): Promise<void> {
    try {
      await fs
        .unlink(resolvePath(config.get<string>('db')))
    } catch (e) {
      // File does not exist
      if (e.code !== 'ENOENT') {
        throw e
      }
    }
  }

  private async initBlockchainProvider (): Promise<void> {
    this.eth = await ethFactory()
    const [owner, provider, consumer, ...accounts] = await this.eth.getAccounts()
    this.contractOwner = owner
    this.providerAddress = provider
    this.consumerAddress = consumer
    this.accounts = accounts
  }

  public getRandomAccount () {
    const acc = this.accounts[this.nextAccountIndex]

    if (!acc) {
      throw new Error(`Are are used all of yours ${this.nextAccountIndex - 1} accounts`)
    }
    this.nextAccountIndex += 1
    return acc
  }

  private async deployStorageManager (): Promise<void> {
    if (!this.eth || !this.providerAddress) {
      throw new Error('Provider should be initialized and has at least 2 accounts')
    }
    const contract = new this.eth.Contract(storageManagerContract.abi as AbiItem[])
    const deploy = await contract.deploy({ data: storageManagerContract.bytecode })
    this.storageContract = await deploy.send({ from: this.contractOwner, gas: await deploy.estimateGas() })
    await this.storageContract?.methods.initialize().send({ from: this.contractOwner })
    await this.storageContract?.methods.setWhitelistedTokens(ZERO_ADDRESS, true).send({ from: this.contractOwner })
    await this.storageContract?.methods.setWhitelistedProvider(this.providerAddress, true).send({ from: this.contractOwner })
  }

  private async deployStaking (): Promise<void> {
    if (!this.eth || !this.providerAddress) {
      throw new Error('Provider should be initialized and has at least 2 accounts')
    }
    const contract = new this.eth.Contract(stakingContract.abi as AbiItem[])
    const deploy = await contract.deploy({ arguments: [this.storageContract?.options.address], data: stakingContract.bytecode })
    this.stakingContract = await deploy.send({ from: this.contractOwner, gas: await deploy.estimateGas() })
    await this.stakingContract?.methods.setWhitelistedTokens(ZERO_ADDRESS, true).send({ from: this.contractOwner })
  }

  public async createOffer (offerData: Record<any, any>) {
    const setOffer = this.storageContract?.methods.setOffer(
      offerData.totalCapacity,
      [offerData.periods],
      [offerData.prices],
      [ZERO_ADDRESS],
      offerData.msg
    )
    return setOffer.send({
      from: this.providerAddress,
      gas: await setOffer.estimateGas({ from: this.providerAddress })
    })
  }

  public async createAgreement (agreementData: Record<any, any>) {
    const newAgreement = await this.storageContract?.methods.newAgreement(
      agreementData.cid,
      agreementData.provider,
      agreementData.size,
      agreementData.period,
      ZERO_ADDRESS,
      0,
      agreementData.toBePayout || [],
      agreementData.toBePayoutAccounts || [],
      ZERO_ADDRESS
    )
    return newAgreement.send({
      from: this.consumerAddress,
      gas: await newAgreement.estimateGas({ from: this.consumerAddress, value: agreementData.amount }),
      value: agreementData.amount
    })
  }

  public async depositFunds (depositData: Record<any, any>) {
    const depositCall = await this.storageContract?.methods.depositFunds(
      depositData.token || ZERO_ADDRESS,
      0,
      depositData.cid,
      depositData.provider || this.providerAddress
    )
    return depositCall.send({
      from: this.consumerAddress,
      gas: await depositCall.estimateGas({ from: this.consumerAddress, value: depositData.amount }),
      value: depositData.amount
    })
  }

  public async payoutFunds (cid: string[]) {
    const payoutFunds = await this.storageContract?.methods.payoutFunds(
      [cid],
      [this.consumerAddress],
      ZERO_ADDRESS,
      this.providerAddress
    )
    return payoutFunds.send({
      from: this.providerAddress,
      gas: await payoutFunds.estimateGas({ from: this.providerAddress })
    })
  }

  public async withdrawalFunds (withdrawData: Record<any, any>) {
    const withdrawFunds = await this.storageContract?.methods.withdrawFunds(
      withdrawData.cid,
      this.providerAddress,
      [ZERO_ADDRESS],
      [withdrawData.amount]
    )
    return withdrawFunds.send({
      from: this.consumerAddress,
      gas: await withdrawFunds.estimateGas({ from: this.consumerAddress })
    })
  }

  public async stake (amount: number | BigNumber, from: string, token?: string) {
    const value = token ? 0 : amount
    const stake = await this.stakingContract?.methods.stake(
      amount,
      token || ZERO_ADDRESS,
      ZERO_BYTES_32
    )
    return stake.send({
      from,
      gas: await stake.estimateGas({ from, value }),
      value
    })
  }

  public async unstake (amount: number, from: string, token?: string) {
    const unstake = await this.stakingContract?.methods.unstake(
      amount,
      token || ZERO_ADDRESS,
      ZERO_BYTES_32
    )
    return unstake.send({
      from,
      gas: await unstake.estimateGas({ from })
    })
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

  async addConfirmations (confirmations = 2): Promise<void> {
    await sleep(6000)
    for (let i = 0; i < confirmations; i++) {
      await this.advanceBlock()
      await sleep(6000)
    }
  }
}

export function getFeatherClient () {
  const socket = io(`http://localhost:${config.get('port')}`)
  const app = feathers()

  // Set up Socket.io client with the socket
  app.configure(socketio(socket))

  return app
}

export const generateMsg = (peerId: string) => {
  const encodedPeerId = encodeHash(peerId).map(el => el.replace('0x', ''))
  return prefixArray(encodedPeerId, '01', 64)
    .map(el => `0x${el}`)
}

export function randomStr (length = 32): string {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function generateCID (): string[] {
  return [asciiToHex(`/ipfs/${randomStr(26)}`)]
}
