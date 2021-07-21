/* eslint-disable */
import Eth from 'web3-eth'
import config from 'config'
import fs from 'fs'
import path from 'path'
import JSON5 from 'json5'
import fetch from 'node-fetch'

const NODE_ENV = process.env['NODE_ENV']
const FROM_SCRATCH = process.env['FRESH_DEPLOY'] || false
const TESTNET_EXPLORER = 'https://backend.explorer.testnet.rsk.co'
const MAINNET_EXPLORER = 'https://backend.explorer.rsk.co'
const RNS_CONTRACTS = ['owner', 'reverse', 'placement', 'registrar', 'fifsAddrRegistrar']
const STORAGE_CONTRACTS = ['storageManager', 'staking']
const NOTIFIER_CONTRACTS = ['notifierManager', 'staking']
const SERVICES = {
  rns: RNS_CONTRACTS,
  storage: STORAGE_CONTRACTS,
  notifier: NOTIFIER_CONTRACTS
}



const configFileName = `${NODE_ENV}.json5`
export const pathToConfigFile = path.resolve(__dirname, '../config', configFileName)

const doesExist = fs.existsSync(pathToConfigFile)
if (!doesExist) {
  throw new Error(`Config file not found on path = ${pathToConfigFile}`)
}
const fileAsString = fs.readFileSync(pathToConfigFile).toString()
export const configObject = JSON5.parse(fileAsString)

export async function ethFactory () {
  const provider: string = config.get('blockchain.provider')
  const eth = new Eth(provider)
  try {
    await eth.getProtocolVersion()
  } catch (e) {
    throw new Error(`Can't connect to the node on address ${provider}`)
  }
  return eth
}

export function getExplorerUrl () {
  if (process.env['EXPLORER_URL']) {
    return process.env['EXPLORER_URL']
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

export async function getContractDeployTxByContractAddress (contractAddress: string) {
  const url = getExplorerUrl()
  const requestUrl = `${url}/api?module=addresses&action=getAddress&address=${contractAddress}`
  const response = await fetch(requestUrl)
  return response.json()
}

async function getStartingBlock (eth: Eth, contractAddress: string) {
  if (FROM_SCRATCH) {
    const contractCreateTx = await getContractDeployTxByContractAddress(contractAddress)
    return contractCreateTx.data.blockNumber
  } else {
    return process.env['PRECACHE_STARTING_BLOCK'] || await eth.getBlockNumber() - 50 // minus 50 blocks just to be sure
  }
}

export default async function (options: { eth: Eth}) {
  const eth = options.eth ?? await ethFactory()

  for (const [service, contracts] of Object.entries(SERVICES)) {
    for (const contract of contracts) {
      if (configObject[service] && configObject[service][contract]) {
        const startingBlock = await getStartingBlock(eth, configObject[service][contract].contractAddress.toLowerCase())
        console.log(`Starting block for ${service}:${contract} is: ${startingBlock}`)

        configObject[service][contract].eventsEmitter = {
          startingBlock,
          ...configObject[service][contract].eventsEmitter || {}
        }
      }
    }
  }
  // Write config
  fs.writeFileSync(pathToConfigFile, JSON5.stringify(configObject, null, 2))
}


