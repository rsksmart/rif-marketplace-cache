
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
