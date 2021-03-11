import { HookContext } from '@feathersjs/feathers'
import config from 'config'

import { SupportedTokens } from '../definitions'

export const WEI = 1e18

export function lowerCaseAddressesQueryParamsHook (props: Array<string>): (context: HookContext) => void {
  return (context: HookContext) => {
    if (!context.params.query) {
      return
    }

    context.params.query = {
      ...context.params.query,
      ...props
        .reduce(
          (acc, prop) => {
            const field = context.params.query?.[prop]

            if (!field || typeof field !== 'string') {
              return acc
            }
            return {
              ...acc,
              [prop]: field.toLowerCase()
            }
          },
          {}
        )
    }
  }
}

/**
 * get token symbol by token address from config
 * @param tokenContractAddress
 * @returns {SupportedTokens} token symbol
 */
export function getTokenSymbol (tokenContractAddress: string): SupportedTokens {
  const supportedTokens = config.get<Record<string, SupportedTokens>>('storage.tokens')
  const token = Object
    .keys(supportedTokens)
    .find(t => t.toLowerCase() === tokenContractAddress.toLowerCase())

  if (!token) {
    throw new Error(`Token on address ${tokenContractAddress} is not supported`)
  }

  return config.get<SupportedTokens>(`storage.tokens.${token}`)
}
