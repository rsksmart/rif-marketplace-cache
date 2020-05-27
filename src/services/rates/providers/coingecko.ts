import { FetchedRates, ToSymbols, FromSymbols } from '../../../definitions'
import CoinGecko from 'coingecko-api'
import { RatesProviderError } from '../../../errors'

const SUPPORTED_FROM_SYMBOLS: Record<FromSymbols, string> = {
  rbtc: 'rootstock',
  rif: 'rif-token'
}

const REVERSE_MAPPING: Record<string, FromSymbols> = {
  rootstock: 'rbtc',
  'rif-token': 'rif'
}

const SUPPORTED_TO_SYMBOLS = ['usd', 'eur', 'btc', 'ars', 'cny', 'krw', 'jpy']

function reverseMapResults (data: Record<string, Record<string, number>>): FetchedRates {
  return Object.entries(data).reduce((output: FetchedRates, [key, value]) => {
    output[REVERSE_MAPPING[key]] = value
    return output
  }, {} as FetchedRates) as FetchedRates
}

export async function fetch (fromSymbols: FromSymbols[], toSymbols: ToSymbols[]): Promise<FetchedRates> {
  const unsupportedToSymbols = toSymbols.filter(toSymbol => !SUPPORTED_TO_SYMBOLS.includes(toSymbol))
  const unsupportedFromSymbols = fromSymbols.filter(fromSymbol => SUPPORTED_FROM_SYMBOLS[fromSymbol] === undefined)

  if (unsupportedToSymbols.length > 0 || unsupportedFromSymbols.length > 0) {
    let msg = 'CoinGecko: Unknown'

    if (unsupportedFromSymbols) {
      msg += ` fromSymbols ${unsupportedFromSymbols.join(', ')}`
    }

    if (unsupportedToSymbols) {
      msg += ` toSymbols ${unsupportedToSymbols.join(', ')}`
    }

    throw new RatesProviderError(msg)
  }

  const mappedTokens = fromSymbols.map(token => SUPPORTED_FROM_SYMBOLS[token])

  const CoinGeckoClient = new CoinGecko()
  const res = await CoinGeckoClient.simple.price({
    ids: mappedTokens,
    // eslint-disable-next-line @typescript-eslint/camelcase
    vs_currencies: toSymbols
  })

  if (!res.success) {
    throw new RatesProviderError(res.message)
  }

  const data = res.data
  return reverseMapResults(data)
}
