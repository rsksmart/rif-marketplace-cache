/* eslint-disable */
const Eth = require('web3-eth')
const config = require('config')
const fs = require('fs')
const path = require('path')
const JSON5 = require('json5')

const NODE_ENV = process.env['NODE_ENV']
const RNS_CONTRACTS = ['owner', 'reverse', 'placement', 'registrar', 'fifsAddrRegistrar']
const STORAGE_CONTRACTS = ['storageManager', 'staking']
const TRIGGERS_CONTRACTS = ['notificationsManager', 'staking']
const SERVICES = {
  rns: RNS_CONTRACTS,
  storage: STORAGE_CONTRACTS,
  triggers: TRIGGERS_CONTRACTS
}
const configFileName = `${NODE_ENV}.json5`
const pathToConfigFile = path.resolve(__dirname, '../config', configFileName)

const isExist = fs.existsSync(pathToConfigFile)
if (!isExist) {
  throw new Error(`Config file not found on path = ${pathToConfigFile}`)
}
const fileAsString = fs.readFileSync(pathToConfigFile).toString()
const configObject = JSON5.parse(fileAsString)

async function ethFactory () {
  const provider = config.get('blockchain.provider')
  const eth = new Eth(provider)
  try {
    await eth.getProtocolVersion()
  } catch (e) {
    throw new Error(`Can't connect to the node on address ${provider}`)
  }
  return eth
}

(async () => {
  const eth = await ethFactory()
  const startingBlock = process.env['PRECACHE_STARTING_BLOCK'] || await eth.getBlockNumber() - 50 // minus 50 blocks just to be sure
  console.log(`Starting block is: ${startingBlock}`)

  Object
    .entries(SERVICES)
    .forEach(([service, contracts]) => {
      contracts.forEach(contract => {
        if (configObject[service] && configObject[service][contract])
          configObject[service][contract].eventsEmitter = {
            startingBlock,
            ...configObject[service][contract].eventsEmitter || {}
          }
      })
    })

  // Write config
  fs.writeFileSync(pathToConfigFile, JSON5.stringify(configObject, null, 2))
})().catch(e => {
  console.error(e)
  process.exit(1)
})


