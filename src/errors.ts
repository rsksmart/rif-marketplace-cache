/**
 * Async retry error
 */
export class AsyncRetryError extends Error {
  static code = 'ASYNC_RETRY_ERR'
  public code: string

  constructor (message: string) {
    super(message)
    this.name = 'AsyncRetryError'
    this.code = AsyncRetryError.code
  }
}

/**
 * Error for problems during processing of received events
 */
export class EventError extends Error {
  static code = 'EVENT_ERR'

  constructor (message: string, event?: string) {
    if (event) {
      message = `During processing event ${event}: ${message}`
    }

    super(message)
    this.name = 'EventError'
  }
}

/**
 * Error for configuration related issues
 */
export class ConfigurationError extends Error {
  static code = 'CONFIG_ERR'

  constructor (message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Error for when fetching new rates does not go as planned
 */
export class RatesProviderError extends Error {
  static code = 'RATES_ERR'

  constructor (message: string) {
    super(message)
    this.name = 'RatesProviderError'
  }
}
