import { AbiItem } from 'web3-utils'
import { EventLog } from 'web3-core'

import { loggingFactory } from '../logger'

const logger = loggingFactory('event-parser')

enum AbiInputType {
  ADDRESS = 'address',
  UINT64 = 'uint64',
  UINT128 = 'uint128',
}

export type EventTransformer = (event: EventLog) => EventLog

/**
 * Transform field based on field type
 * @param field
 * @param type
 */
function transformEventField (
  field: any,
  type: AbiInputType | string | void
): any {
  switch (type) {
    // case AbiInputType.UINT64:
    // case AbiInputType.UINT128:
    //   return new BigNumber(field)
    case AbiInputType.ADDRESS:
      return field.toLowerCase()
    default:
      return field
  }
}

/**
 * Factory which return function for retrieving field type based on ABI
 * @param abi
 * @param eventName
 */
function getFieldType (
  abi: AbiItem[],
  eventName: string
): (key: string) => string | void {
  const eventAbi = abi.find(a => a.name === eventName)

  if (!eventAbi) {
    logger.warn(`Abi for event ${eventName} not found`)
  }

  return (key: string): string | void => {
    if (!eventAbi) return
    const input = eventAbi.inputs?.find(i => i.name === key)

    if (!input) {
      logger.warn(`No input found for event = ${eventName}, key = ${key}`)
      return
    }

    return input.type
  }
}

/**
 * Factory for event transformer closure.
 * This function has custom logic to transform event fields based on ABI types.
 * Currently supported transformations:
 *   - address fields are lower cased
 *
 * @param abi
 */
export function getEventTransformer (abi: AbiItem[]): (event: EventLog) => EventLog {
  return (event: EventLog): EventLog => {
    const getType = getFieldType(abi.filter(a => a.type === 'event'), event.event)
    return {
      ...event,
      returnValues: Object
        .entries(event.returnValues)
        .filter(([key]) => isNaN(parseInt(key))) // Ignore duplicated field with index key
        .reduce(
          (acc, [key, field]) =>
            ({ ...acc, [key]: transformEventField(field, getType(key)) }),
          {}
        )
    }
  }
}
