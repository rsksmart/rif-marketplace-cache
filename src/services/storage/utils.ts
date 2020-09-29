import { SupportedTokens } from '../../definitions'
import config from 'config'

/**
 * get token symbol by token address from config
 * @param tokenContractAddress
 * @returns {SupportedTokens} token symbol
 */
export function getTokenSymbol (tokenContractAddress: string): SupportedTokens {
  if (!config.has(`storage.tokens.${tokenContractAddress}`)) {
    throw new Error(`Token on address ${tokenContractAddress} is not supported`)
  }

  return config.get<SupportedTokens>(`storage.tokens.${tokenContractAddress}`)
}
