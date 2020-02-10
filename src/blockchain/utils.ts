import { ContractOptions } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'

import Eth from 'web3-eth'

import { PinningManager } from '@rsksmart/rif-martketplace-storage-pinning/types/web3-v1-contracts/PinningManager'
import pinningContractAbi from '@rsksmart/rif-martketplace-storage-pinning/build/contracts/PinningManager.json'

export function getPinningContract (eth: Eth, addr: string, options?: ContractOptions): PinningManager {
  if (!addr) {
    throw new Error('No contract address!')
  }

  return new eth.Contract(pinningContractAbi.abi as AbiItem[], addr, Object.assign({ gas: 100000 }, options))
}
