import { BlockHeader, BlockTransactionString, TransactionReceipt, Transaction } from 'web3-eth'
import { Substitute } from '@fluffy-spoon/substitute'
import { EventData } from 'web3-eth-contract'
import fs from 'fs'
import path from 'path'
import Libp2p from 'libp2p'
import { createLibP2P, Message, Room } from '@rsksmart/rif-communications-pubsub'
import { getRoomTopic } from '../src/communication'
import { loggingFactory } from '../src/logger'
import PeerId from 'peer-id'

export function sleep<T> (ms: number, arg?: T): Promise<T | undefined> {
  return new Promise(resolve => setTimeout(() => resolve(arg), ms))
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
        // eslint-disable-next-line node/no-callback-literal
        cb(sequence[counter] as Error, undefined)
      } else {
        cb(undefined, sequence[counter] as BlockHeader)
      }

      counter += 1
    }, interval)
  }
}

export function eventMock<T = EventData> (options?: Partial<EventData>): T {
  const testEvent = Substitute.for<EventData>()
  options = options || {}

  for (const [key, value] of Object.entries(options)) {
    // @ts-ignore: not typed
    testEvent[key].returns!(value)
  }

  if (!options.event) {
    testEvent.event.returns!('testEvent')
  }

  return testEvent as unknown as T
}

export function blockMock (blockNumber: number, blockHash = '0x123', options: Partial<BlockTransactionString> = {}): BlockTransactionString {
  const block = Substitute.for<BlockTransactionString>()

  Object.entries(options).forEach(([key, value]) => {
    // @ts-ignore: not typed
    block[key].returns!(value)
  })

  block.number.returns!(blockNumber)
  block.hash.returns!(blockHash)
  return block
}

export function transactionMock (hash: string, input: string, options: Partial<Transaction> = {}): Transaction {
  const transaction = Substitute.for<Transaction>()

  Object.entries(options).forEach(([key, value]) => {
    // @ts-ignore: not typed
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

/**
 * Spawn libp2p node
 * @param peerId
 */
export function spawnLibp2p (peerId: PeerId): Promise<Libp2p> {
  return createLibP2P({
    addresses: { listen: ['/ip4/127.0.0.1/tcp/0'] },
    peerId: peerId,
    config: {
      peerDiscovery: {
        bootstrap: {
          enabled: false
        }
      }
    }
  })
}

/**
 * Create libp2p room for specific offer id
 * @param libp2p
 * @param offerId
 */
export function createLibp2pRoom (libp2p: Libp2p, offerId: string): Room {
  const roomName = getRoomTopic(offerId)
  const logger = loggingFactory(`test:comms:room:${roomName}`)
  logger.info(`Listening on room ${roomName}`)

  const roomPinner = new Room(libp2p, roomName, { pollInterval: 100 })

  roomPinner.on('peer:joined', (peer) => logger.debug(`${roomName}: peer ${peer} joined`))
  roomPinner.on('peer:left', (peer) => logger.debug(`${roomName}: peer ${peer} left`))
  roomPinner.on('message', (msg: Message) => {
    if (msg.from === libp2p.peerId.toJSON().id) return
    logger.info(`Receive message: ${JSON.stringify(msg.data)}`)
  })
  roomPinner.on('error', (e) => logger.error(e))
  return roomPinner
}

/**
 * Await for peer joined
 * @param room
 */
export function awaitForPeerJoined (room: Room): Promise<void> {
  return new Promise(resolve => {
    room.on('peer:joined', () => {
      resolve()
    })
  })
}
