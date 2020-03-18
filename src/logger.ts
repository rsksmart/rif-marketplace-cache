import { createLogger, format, transports, addColors, Logger as RealLogger } from 'winston'
import * as Transport from 'winston-transport'

import colors from 'colors'
import config from 'config'

export interface Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error (message: string | Error, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug (message: string, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn (message: string, ...meta: any[]): void

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info (message: string, ...meta: any[]): void
}

// Inspired from https://github.com/visionmedia/debug
const names: RegExp[] = []
const skips: RegExp[] = []

/**
 * From given namespaces string parse RegExes which
 * will be used for determining if given service should be
 * ignored in logging or not.
 *
 * @param namespaces
 */
function loadFilter (namespaces: string): void {
  const splits = namespaces.split(/[\s,]+/)

  for (const split of splits) {
    if (!split) {
      continue
    }

    const namespace = split.replace(/\*/g, '.*?')

    if (namespace[0] === '-') {
      skips.push(new RegExp(`^${namespace.substr(1)}$`))
    } else {
      names.push(new RegExp(`^${namespace}$`))
    }
  }
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */
function enabled (name: string): boolean {
  if (name[name.length - 1] === '*') {
    return true
  }

  function isMatch (set: RegExp[]): boolean {
    for (const regex of set) {
      if (regex.test(name)) {
        return true
      }
    }
    return false
  }

  if (isMatch(skips)) {
    return false
  }

  if (names.length > 0) {
    return isMatch(names)
  }

  return true
}

const filterServices = format(info => {
  if (info.metadata.service) {
    return enabled(info.metadata.service) ? info : false
  } else {
    return info
  }
})

/**
 * Format utility which will uppercase logging level.
 */
const upperCaseLevel = format(info => {
  if (info.level) {
    info.level = info.level.toUpperCase()
  }
  return info
})

addColors({
  debug: 'grey',
  info: 'blue'
})

let mainLogger: RealLogger
const loggers: Record<string, RealLogger> = {}

function initLogging (): void {
  loadFilter(config.get('log.filter') || '*')

  const transportsSet: Transport[] = [new transports.Console()]

  if (config.get('log.path')) {
    transportsSet.push(new transports.File({
      filename: config.get('log.path'),
      maxsize: 5000000,
      maxFiles: 5,
      tailable: true,
      format: format.uncolorize()
    }))
  }

  mainLogger = createLogger({
    // To see more detailed errors, change this to 'debug'
    level: config.get('log.level') || 'info',
    format: format.combine(
      format.splat(),
      format.metadata(),
      filterServices(),
      upperCaseLevel(),
      format.errors({ stack: true }),
      // format.padLevels(),
      format.timestamp({ format: 'DD/MM hh:mm:ss' }),
      format.colorize(),
      format.printf(info => {
        if (info.metadata.service) {
          return `[${info.level}] ${colors.grey(info.timestamp)} (${info.metadata.service}): ${info.message}`
        } else {
          return `[${info.level}] ${colors.grey(info.timestamp)}: ${info.message}`
        }
      })
    ),
    transports: transportsSet
  })
}

type SupportedLevels = 'error' | 'warn' | 'info' | 'debug'

function delayedLoggingMethod (level: SupportedLevels, name?: string): (message: string, ...meta: any[]) => void {
  return function (message: string, ...meta: any[]): void {
    // First logging call, lets setup logging
    if (!mainLogger) {
      initLogging()
    }

    if (name) {
      if (!loggers[name]) {
        loggers[name] = mainLogger.child({ service: name })
      }

      loggers[name][level](message, ...meta)
    } else {
      mainLogger[level](message, ...meta)
    }
  }
}

export function loggingFactory (name?: string): Logger {
  return {
    error: delayedLoggingMethod('error', name),
    warn: delayedLoggingMethod('warn', name),
    info: delayedLoggingMethod('info', name),
    debug: delayedLoggingMethod('debug', name)
  }
}
