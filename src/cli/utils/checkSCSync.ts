import { Eth } from 'web3-eth'
import fs from 'fs'
import JSON5 from 'json5'
import notifierManagerContractAbi from '@rsksmart/rif-marketplace-notifier/build/contracts/NotifierManager.json'
import notifierStakingContractAbi from '@rsksmart/rif-marketplace-notifier/build/contracts/Staking.json'
import storageManagerContractAbi from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import storageStakingContractAbi from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'
import simplePlacementsContractAbi from '@rsksmart/rif-marketplace-nfts/RNSSimplePlacementsV1Data.json'
import auctionRegistrarContractAbi from '@rsksmart/rns-auction-registrar/TokenRegistrarData.json'
import rnsReverseContractAbi from '@rsksmart/rns-reverse/NameResolverData.json'
import rnsContractAbi from '@rsksmart/rns-rskregistrar/RSKOwnerData.json'
import { SupportedServices } from '../../definitions'
import { sequelizeFactory } from '../../sequelize'
import { initStore } from '../../store'
import { capitalizeFirstLetter } from '../../utils'
import { Observable } from 'rxjs/internal/Observable'
import { ProgressCb, reportProgress } from '../../blockchain/utils'
import { loggingFactory } from '../../logger'
import { Sequelize } from 'sequelize'
import { AbiItem } from 'web3-utils'
import Listr from 'listr'
import { ethFactory } from '../../blockchain'
import { configObject, pathToConfigFile } from './updatePrecacheBlocks'
import { ProgressInfo } from '@rsksmart/web3-events'

const RNS_SERVICES = ['owner', 'reverse', 'placement', 'registrar', 'fifsAddrRegistrar']
const STORAGE_SERVICES = ['storageManager', 'staking']
const NOTIFIER_SERVICES = ['notifierManager', 'staking']
const SERVICES: Record<SupportedServices, string[]> = {
  rns: RNS_SERVICES,
  storage: STORAGE_SERVICES,
  notifier: NOTIFIER_SERVICES
}

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

const LAST_PROCESSED_BLOCK_QUERY = 'SELECT `value` FROM `data-store` WHERE `key`="web3events.:service.:contract.lastProcessedBlockNumber"'

const logger = loggingFactory('syncCheck')

const collectUnsynchedEvents = async (
  blockNumber: number, eth = new Eth(),
  serviceName: string, contractName: string
): Promise<void> => {
  const contractAddress = configObject[serviceName][contractName].contractAddress.toLowerCase()
  const contractAbi = CONTRACT_ABIS[serviceName][contractName]

  const deployedContract = new eth.Contract(contractAbi as AbiItem, contractAddress)

  return await new Promise((resolve) => deployedContract.events.allEvents({
    fromBlock: blockNumber
  }).on('data', ({ event, blockNumber }: {event: string, blockNumber: number}) => {
    logger.info(`Unprocessed event ${event} occured on block #${blockNumber}`)

    configObject[serviceName][contractName].eventsEmitter = {
      startingBlock: blockNumber,
      ...configObject[serviceName][contractName].eventsEmitter || {}
    }
    resolve()
  })
  )
}

function checkSCSyncFor (serviceName: SupportedServices, eth: Eth, sequelize: Sequelize): Observable<string> {
  return reportProgress(logger,
    async (progressCb): Promise<void> => {
      const contractNames = SERVICES[serviceName]

      await Promise.all(contractNames.map(async (contractName, index) => {
        const { lastProcessedBlock } = await sequelize.query(LAST_PROCESSED_BLOCK_QUERY, {
          replacements: { service: serviceName, contract: contractName },
          plain: true
        })

        await collectUnsynchedEvents(lastProcessedBlock as number, eth, serviceName, contractName)

        progressCb(
          {
            stepsComplete: index + 1,
            totalSteps: contractNames.length + 1
          } as unknown as ProgressInfo, contractName
        )
      }))
    })
}

function writeConfigToFs (): Observable<string> {
  return reportProgress(logger,
    async (progressCb): Promise<void> => {
      await new Promise<void>((resolve) => {
        fs.writeFileSync(pathToConfigFile, JSON5.stringify(configObject, null, 2))
        resolve()
      })

      progressCb(
          {
            stepsComplete: 1,
            totalSteps: 1
          } as unknown as ProgressInfo, 'write2config'
      )
    })
}

export const checkSCSync = async () => {
  const eth = await ethFactory()

  const sequelize = sequelizeFactory()
  await initStore(sequelize)

  const tasksDefinition = [
    ...Object.keys(SERVICES).map(
      serviceName => {
        return {
          title: `Coherence verification of the ${capitalizeFirstLetter(serviceName)} service.`,
          task: (): Observable<string> => checkSCSyncFor(serviceName as SupportedServices, eth, sequelize)
        }
      }), {
      title: 'Writing config to filesystem.',
      task: (): Observable<string> => writeConfigToFs()
    }
  ]

  const tasks = new Listr(tasksDefinition)
  await tasks.run()
}
