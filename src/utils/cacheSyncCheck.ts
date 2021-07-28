import simplePlacementsContractAbi from '@rsksmart/rif-marketplace-nfts/RNSSimplePlacementsV1Data.json'
import notifierManagerContractAbi from '@rsksmart/rif-marketplace-notifier/build/contracts/NotifierManager.json'
import notifierStakingContractAbi from '@rsksmart/rif-marketplace-notifier/build/contracts/Staking.json'
import storageStakingContractAbi from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'
import storageManagerContractAbi from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import auctionRegistrarContractAbi from '@rsksmart/rns-auction-registrar/TokenRegistrarData.json'
import rnsReverseContractAbi from '@rsksmart/rns-reverse/NameResolverData.json'
import rnsContractAbi from '@rsksmart/rns-rskregistrar/RSKOwnerData.json'
import { ProgressInfo } from '@rsksmart/web3-events'
import { Eth } from 'web3-eth'
import fs from 'fs'
import path from 'path'
import JSON5 from 'json5'
import fetch from 'node-fetch'
import config from 'config'
import StartServer from '../cli/start'

import { Observable } from 'rxjs/internal/Observable'
import { Sequelize } from 'sequelize'

import { AbiItem } from 'web3-utils'
import { reportProgress } from '../blockchain/utils'
import { Config, Logger, SupportedServices } from '../definitions'
import { capitalizeFirstLetter } from '../utils'
import { loggingFactory } from '../logger'
import Listr from 'listr'

export const NODE_ENV = process.env.NODE_ENV
const EXPLORER_URL = process.env.EXPLORER_URL
const FROM_SCRATCH = process.env.FRESH_DEPLOY || false
const FORCED_START_BLOCK = Number(process.env.PRECACHE_STARTING_BLOCK) || false
const TESTNET_EXPLORER = 'https://backend.explorer.testnet.rsk.co'
const MAINNET_EXPLORER = 'https://backend.explorer.rsk.co'

const CONFIG_FILENAME = `${NODE_ENV}.json5`
const PATH_TO_CONFIG_FILE = path.resolve(__dirname, '../../config', CONFIG_FILENAME)

const NOTIFIER_CONTRACT_ABIS = { notifierManager: notifierManagerContractAbi, staking: notifierStakingContractAbi }
const STORAGE_CONTRACT_ABIS = { storageManager: storageManagerContractAbi, staking: storageStakingContractAbi }
const RNS_CONTRACT_ABIS = {
  owner: rnsContractAbi,
  reverse: rnsReverseContractAbi,
  placement: simplePlacementsContractAbi,
  registrar: auctionRegistrarContractAbi,
  fifsAddrRegistrar: rnsContractAbi
}

const CONTRACT_ABIS: Record<string, Record<string, unknown>> = {
  rns: RNS_CONTRACT_ABIS,
  storage: STORAGE_CONTRACT_ABIS,
  notifier: NOTIFIER_CONTRACT_ABIS
}

const doesExist = fs.existsSync(PATH_TO_CONFIG_FILE)

if (!doesExist) {
  throw new Error(`Config file not found on path = ${PATH_TO_CONFIG_FILE}`)
}
const fileAsString = fs.readFileSync(PATH_TO_CONFIG_FILE).toString()
const configFile = JSON5.parse(fileAsString)

export class CacheSynchCheck {
  private logger!: Logger
  private eth!: Eth
  private sequelize!: Sequelize
  private services!: Record<SupportedServices, string[]>

  public tasks!: Listr.ListrTask[]

  constructor (services: Record<SupportedServices, string[]>, eth: Eth, sequelize: Sequelize, logger: Logger) {
    this.eth = eth
    this.sequelize = sequelize
    this.services = services
    this.logger = logger.extend?.('precacheCheck') ?? loggingFactory('precacheCheck')

    this.tasks = [
      ...this.getTaskPerService(),
      {
        title: 'Writing config to filesystem.',
        task: (): Observable<string> => this.writeConfigToFs()
      }
    ]
  }

  private async collectUnsynchedEvents (fromBlock: number, serviceName: string, contractName: string): Promise<void> {
    const contractAddress = this.getContractAddress(serviceName, contractName)
    const contractAbi: any = CONTRACT_ABIS[serviceName][contractName]

    const deployedContract = new this.eth.Contract(contractAbi.abi as AbiItem[], contractAddress)

    const unprocessedEvents = await deployedContract.getPastEvents(
      'allEvents', {
        fromBlock
      })

    if (unprocessedEvents.length) {
      const [{ blockNumber: eventBlockNumber, event }] = unprocessedEvents
      this.logger.info(`Unprocessed event ${serviceName}.${contractName}.${event} occured on block #${eventBlockNumber}`)

      this.updateStartingBlock(serviceName, contractName, eventBlockNumber)
    }
  }

  private getTaskPerService () {
    return Object.keys(this.services).map(
      serviceName => {
        return {
          title: `Coherence verification of the ${capitalizeFirstLetter(serviceName)} service.`,
          task: (): Observable<string> => this.checkSCSyncFor(serviceName as SupportedServices)
        }
      })
  }

  private checkSCSyncFor (serviceName: SupportedServices): Observable<string> {
    return reportProgress(this.logger,
      async (progressCb): Promise<void> => {
        const contractNames = this.services[serviceName]

        await Promise.all(contractNames.map(async (contractName, index) => {
          if (FROM_SCRATCH) {
            const contractCreateTx = await this.getContractDeployTxByContractAddress(this.getContractAddress(serviceName, contractName))
            this.updateStartingBlock(serviceName, contractName, contractCreateTx.data.blockNumber)
          } else if (FORCED_START_BLOCK) {
            this.updateStartingBlock(serviceName, contractName, Number(FORCED_START_BLOCK))
          } else {
            const lastProcessedBlockNumber = await this.sequelize.query(
              'SELECT "value" FROM "main"."data-store" WHERE "key"=?'
              , {
                replacements: [`web3events.${serviceName}.${contractName}.lastProcessedBlockNumber`],
                plain: true,
                logging: this.logger.debug
              })

            if (!lastProcessedBlockNumber) {
              this.logger.debug(`Contract ${contractName} of ${serviceName} service has no records in db. Make sure that the service is enabled and contract configured.`)
            } else {
              await this.collectUnsynchedEvents(Number(lastProcessedBlockNumber.value) + 1, serviceName, contractName)
            }
          }

          progressCb(
          {
            stepsComplete: index + 1,
            totalSteps: contractNames.length + 1
          } as unknown as ProgressInfo, contractName
          )
        }))
      })
  }

  private writeConfigToFs (): Observable<string> {
    return reportProgress(this.logger,
      async (progressCb): Promise<void> => {
        await new Promise<void>((resolve) => {
          config.util.extendDeep(config, configFile)

          fs.writeFileSync(PATH_TO_CONFIG_FILE, JSON5.stringify(configFile, null, 2))
          resolve()
        })

        progressCb(
          {
            stepsComplete: 1,
            totalSteps: 1
          } as unknown as ProgressInfo, 'writeConfigChanges'
        )
      })
  }

  private getExplorerUrl () {
    if (EXPLORER_URL) {
      return EXPLORER_URL
    }

    switch (NODE_ENV) {
      case 'rsktestnet':
      case 'staging':
        return TESTNET_EXPLORER
      case 'rskmainnet':
        return MAINNET_EXPLORER
      default:
        throw new Error('Explorer backend URL should be defined for custom network using "EXPLORER_URL" env variable')
    }
  }

  private async getContractDeployTxByContractAddress (contractAddress: string) {
    const url = this.getExplorerUrl()
    const requestUrl = `${url}/api?module=addresses&action=getAddress&address=${contractAddress}`
    const response = await fetch(requestUrl)
    return response.json()
  }

  private getContractAddress (serviceName: string, contractName: string) {
    return String(config.get(`${serviceName}.${contractName}.contractAddress`)).toLowerCase()
  }

  private updateStartingBlock (serviceName: string, contractName: string, eventBlockNumber: number) {
    StartServer.requirePrecache = true

    const svcConfig: any = configFile[serviceName as keyof Config] || {}
    svcConfig.requirePrecache = true
    const contractConfig: any = svcConfig[contractName] || {}
      contractConfig!.eventsEmitter!.startingBlock = eventBlockNumber
  }
}
