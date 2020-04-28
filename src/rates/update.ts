import config from 'config'

import { fetch as coingeckoFetch } from './providers/coingecko'
import { ToSymbols, isRatesProvider, RatesProvider, SupportedToSymbols, SupportedFromSymbols, FromSymbols } from '../definitions'
import { ConfigurationError } from '../errors'
import Rate from './rates.model'
import { loggingFactory } from '../logger'
import { Sema } from 'async-sema/lib'

const logger = loggingFactory('rates:updater')

const PROVIDER_IMPLS = {
  [RatesProvider.coingecko]: coingeckoFetch
}

const CONFIG_PROVIDER = 'rates.provider'
const CONFIG_FIATS = 'rates.toSymbols'
const CONFIG_TOKENS = 'rates.fromSymbols'

const semaphore = new Sema(1)
let lastUpdate = 0

export async function updater (): Promise<void> {
  logger.debug('Acquiring lock for update')
  // Only one update at the moment
  await semaphore.acquire()

  try {
    const providerName = config.get(CONFIG_PROVIDER)

    if (!isRatesProvider(providerName)) {
      throw new ConfigurationError('Unknown rates provider')
    }

    const toSymbols = config.get<ToSymbols[]>(CONFIG_FIATS)
    const fromSymbols = config.get<FromSymbols[]>(CONFIG_TOKENS)
    const unsupportedToSymbols = toSymbols.filter(toSymbol => !SupportedToSymbols.includes(toSymbol))
    const unsupportedFromSymbols = fromSymbols.filter(fromSymbol => !SupportedFromSymbols.includes(fromSymbol))

    if (unsupportedToSymbols.length > 0 || unsupportedFromSymbols.length > 0) {
      let msg = 'Unknown'

      if (unsupportedFromSymbols) {
        msg += ` fromSymbols ${unsupportedFromSymbols.join(', ')}`
      }

      if (unsupportedToSymbols) {
        msg += ` toSymbols ${unsupportedToSymbols.join(', ')}`
      }

      throw new ConfigurationError(msg)
    }

    logger.info(`Updating rates using ${providerName} provider.`)

    const fetchRates = PROVIDER_IMPLS[providerName]
    const rates = await fetchRates(fromSymbols, toSymbols)

    for (const [token, fiatsRates] of Object.entries(rates)) {
      const [DbRate] = await Rate.findOrCreate({ where: { token } })

      for (const [fiat, price] of Object.entries(fiatsRates)) {
        if (!SupportedToSymbols.includes(fiat as ToSymbols)) {
          throw Error('Unsupported fiat')
        }

        // @ts-ignore
        DbRate[fiat] = parseFloat(price)
      }

      await DbRate.save()
    }

    lastUpdate = Date.now()
  } finally {
    semaphore.release()
  }
}

/**
 * Function to track the last update.
 *
 * We are specifically using in-memory last-update tracking
 * as it is non-critical data that does not need to be persisted
 * between restarts of the server and instead it gives us good
 * performance for read. It leads to trigger of a rates update upon first
 * request to server, but that is something that you want to do most probably
 * anyway.
 */
export function getLastUpdateTimestamp (): number {
  return lastUpdate
}
