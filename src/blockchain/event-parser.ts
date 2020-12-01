import { AbiItem } from 'web3-utils'
import { EventData } from 'web3-eth-contract'
import { EventLog } from 'web3-core'
import { loggingFactory } from '../logger'

const logger = loggingFactory('event-parser')

enum AbiInputType {
  ADDRESS = 'address',
  UINT64 = 'uint64',
  UINT128 = 'uint128',
}

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

function getFieldType (
  abi: AbiItem[],
  eventName: string
): (key: string) => string | void {
  const eventAbi = abi.find(a => a.name === eventName)

  if (!eventAbi) {
    logger.error(`Abi for event ${eventName} not found`)
  }

  return (key: string): string | void => {
    if (!eventAbi) return
    const input = eventAbi.inputs?.find(i => i.name === key)

    if (!input) {
      logger.error(`No input found for event = ${eventName}, key = ${key}`)
      return
    }

    return input.type
  }
}

export function transformEvent (event: EventData, abi: AbiItem[]): EventLog {
  const getType = getFieldType(abi.filter(a => a.type === 'event'), event.event)
  return {
    ...event,
    returnValues: Object
      .entries(event.returnValues)
      .reduce(
        (acc, [key, field]) =>
          ({ ...acc, [key]: transformEventField(field, getType(key)) }),
        {}
      )
  }
}
