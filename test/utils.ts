import { BlockHeader, BlockTransactionString, TransactionReceipt, Transaction } from 'web3-eth'
import { Substitute } from '@fluffy-spoon/substitute'
import { EventData } from 'web3-eth-contract'
import fs from 'fs'
import path from 'path'

export function sleep<T> (ms: number, ...args: T[]): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(...args), ms))
}

export function receiptMock (blockNumber?: number, status = true): TransactionReceipt {
  const receipt = Substitute.for<TransactionReceipt>()

  if (blockNumber !== undefined) {
    receipt.blockNumber.returns!(blockNumber)
  }

  if (status !== undefined) {
    receipt.status.returns!(status)
  }

  return receipt
}

export function subscribeMock (sequence: Array<Error | BlockHeader>, interval = 100): (event: string, cb: (err?: Error, blockHeader?: BlockHeader) => void) => void {
  let counter = 0
  let intervalId: NodeJS.Timeout
  return (event: string, cb: (err?: Error, blockHeader?: BlockHeader) => void): void => {
    intervalId = setInterval(() => {
      if (counter >= sequence.length) {
        clearInterval(intervalId)
        return
      }

      if (sequence[counter] instanceof Error) {
        // eslint-disable-next-line standard/no-callback-literal
        cb(sequence[counter] as Error, undefined)
      } else {
        cb(undefined, sequence[counter] as BlockHeader)
      }

      counter += 1
    }, interval)
  }
}

export function eventMock (options?: Partial<EventData>): EventData {
  const testEvent = Substitute.for<EventData>()
  options = options || {}

  for (const [key, value] of Object.entries(options)) {
    // @ts-ignore
    testEvent[key].returns!(value)
  }

  if (!options.event) {
    testEvent.event.returns!('testEvent')
  }

  return testEvent
}

export function blockMock (blockNumber: number, blockHash = '0x123', options: Partial<BlockTransactionString> = {}): BlockTransactionString {
  const block = Substitute.for<BlockTransactionString>()

  Object.entries(options).forEach(([key, value]) => {
    // @ts-ignore
    block[key].returns!(value)
  })

  block.number.returns!(blockNumber)
  block.hash.returns!(blockHash)
  return block
}

export function transactionMock (hash: string, input: string, options: Partial<Transaction> = {}): Transaction {
  const transaction = Substitute.for<Transaction>()

  Object.entries(options).forEach(([key, value]) => {
    // @ts-ignore
    transaction[key].returns!(value)
  })

  transaction.hash.returns!(hash)
  transaction.input.returns!(input)
  return transaction
}

export function rmDir (folder: string): void {
  if (fs.existsSync(folder)) {
    for (const file of fs.readdirSync(folder)) {
      fs.unlinkSync(path.join(folder, file))
    }

    fs.rmdirSync(folder, { recursive: true })
  }
}
