import http, { ClientRequestArgs } from 'http'
import { FetchError } from 'node-fetch'

export type ReturnObject<T> = {
    success: boolean
    message?: string
    code?: number
    data: T
}

export abstract class ServiceProvider<ResultType> {
    private _defaultOptions: ClientRequestArgs = {
      method: 'GET'
    }

    get defaultOptions () {
      return this._defaultOptions
    }

    set defaultOptions (options: ClientRequestArgs) {
      const url = new URL(options.host as string)
      this._defaultOptions = {
        ...this.defaultOptions,
        ...options,
        host: url.hostname
      }
    }

    protected _fetch (options: ClientRequestArgs = {}) {
      return new Promise<ReturnObject<ResultType>>((resolve, reject) => {
        const request = http.request({
          ...this._defaultOptions,
          ...options
        }, (response) => {
          const chunks: Uint8Array[] = []

          // Set body on data
          response.on('data', (chunk) => {
            chunks.push(chunk)
          })

          // On end, end the Promise
          response.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString()

              // Check if page is returned instead of JSON
              if (body.startsWith('<!DOCTYPE html>') || body.startsWith('<!doctype html>')) {
                throw new FetchError('There was a problem with your request. The parameter(s) you gave are missing or incorrect.', 'Invalid request')
              }

              if (body.startsWith('Throttled')) {
                throw new FetchError('There was a problem with request limit.', 'Throttled request')
              }

              // Attempt to parse
              const result: ResultType = JSON.parse(body)

              const { statusCode, statusMessage } = response
              // Create return object
              resolve({
                success: Boolean(statusCode && !(statusCode < 200 || statusCode >= 300)),
                message: statusMessage,
                code: statusCode,
                data: result
              })
            } catch (error) {
              reject(error)
            }
          })
        })

        // On error, reject the Promise
        request.on('error', reject)

        // On timeout, reject the Promise
        request.on('timeout', () => {
          request.destroy()
          reject(new FetchError('Notifier API request timed out.', 'Timeout'))
        })

        // End request
        request.end()
      })
    }
}
