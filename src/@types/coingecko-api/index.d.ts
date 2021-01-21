/* eslint-disable camelcase */
// Credit to https://github.com/textileio/js-ipfs-lite/

declare module 'coingecko-api' {
  export interface GeckoResult<T> {
    success: boolean
    message: string
    code: number
    data: T
  }

  type GeckoResultPromise<T> = Promise<GeckoResult<T>>

  interface SimplePriceOptions {
    ids: string | string[]
    vs_currencies: string | string[]
    include_24hr_vol?: boolean
    include_last_updated_at?: boolean
  }

  export class CoinGecko {
    constructor ()

    ping(): GeckoResultPromise<null>

    simple: {
      price(params: SimplePriceOptions): GeckoResultPromise<Record<string, Record<string, number>>>
    }
  }

  export default CoinGecko
}
