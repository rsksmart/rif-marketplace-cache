/* eslint-disable no-console */
import path from 'fs'
import config from 'config'
import sqlite3 from 'sqlite3'
import { exit } from 'process'
import { Eth } from 'web3-eth'
import { Contract } from 'web3-eth-contract'
import { EventEmitter } from 'node'
import notifierManagerContractAbi from '@rsksmart/rif-marketplace-notifier/build/contracts/NotifierManager.json'
import notifierStakingContractAbi from '@rsksmart/rif-marketplace-notifier/build/contracts/Staking.json'
import storageManagerContractAbi from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import storageStakingContractAbi from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'
import simplePlacementsContractAbi from '@rsksmart/rif-marketplace-nfts/RNSSimplePlacementsV1Data.json'
import auctionRegistrarContractAbi from '@rsksmart/rns-auction-registrar/TokenRegistrarData.json'
import rnsReverseContractAbi from '@rsksmart/rns-reverse/NameResolverData.json'
import rnsContractAbi from '@rsksmart/rns-rskregistrar/RSKOwnerData.json'
import { configObject } from './update-precache-blocks'
const RNS_SERVICES = ['owner', 'reverse', 'placement', 'registrar', 'fifsAddrRegistrar']
const STORAGE_SERVICES = ['storageManager', 'staking']
const NOTIFIER_SERVICES = ['notifierManager', 'staking']
const SERVICES = {
  rns: RNS_SERVICES,
  storage: STORAGE_SERVICES,
  notifier: NOTIFIER_SERVICES
}

const REQUIRES_PRECACHE = {
  FROM_GENESIS: -1,
  YES: 1,
  NO: 0
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

const CONTRACT_ABIS = {
  rns: RNS_CONTRACT_ABIS,
  storage: STORAGE_CONTRACT_ABIS,
  notifier: NOTIFIER_CONTRACT_ABIS
}

const unprocessedEventBlockNumbers = {}

export async function ethFactory () {
  const provider = config.get('blockchain.provider')
  const eth = new Eth(provider)
  try {
    await eth.getProtocolVersion()
  } catch (e) {
    throw new Error(`Can't connect to the node on address ${provider}`)
  }
  return eth
}

const db = new sqlite3.Database(path.resolve(config.get('db')), sqlite3.OPEN_READONLY, (error) => {
  console.error(error)
  exit(1)
})

function hasEventLaterThan (blockNumber, eth = new Eth(), serviceName, contractName) {
  const contractAddress = configObject[serviceName][contractName].contractAddress.toLowerCase()
  const contractAbi = CONTRACT_ABIS[serviceName[contractName]]

  const deployedContract = new eth.Contract(contractAbi, contractAddress)

  deployedContract.events.allEvents({
    fromBlock: blockNumber
  }).on('data', (event) => {
    console.log(`Event ${event.event} occured on block #${event.blockNumber}`)

    unprocessedEventBlockNumbers[serviceName] = {
      ...unprocessedEventBlockNumbers[serviceName],
      [contractName]: blockNumber
    }
  })
}

const LAST_PROCESSED_BLOCK_QUERY = 'SELECT `value` FROM `data-store` WHERE `key`="web3events.$service.$contract.lastProcessedBlockNumber"'

async function run () {
  const eth = await ethFactory()

  for (const [serviceName, contractNames] of Object.entries(SERVICES)) {
    for (const contractName of contractNames) {
      if (configObject[serviceName] && configObject[serviceName][contractName]) {
        db.get(LAST_PROCESSED_BLOCK_QUERY, { $service: serviceName, $contract: contractName },
          (error, lastProcessedBlock) => {
            if (error || !lastProcessedBlock) {
              console.error(error)
              throw Error(`Could not access the last processed block for ${serviceName}.${contractName}.`)
            }
            console.log(`Searching for later event from ${serviceName}.${contractName} contract than block #${lastProcessedBlock} ...`)
            hasEventLaterThan(lastProcessedBlock, eth, serviceName, contractName)
          }
        )
      }
    }
  }
}

run().catch(e => {
  console.error(e)
  process.exit(REQUIRES_PRECACHE.FROM_GENESIS)
})
