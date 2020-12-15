import chai from 'chai'
import sinonChai from 'sinon-chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import { AbiItem } from 'web3-utils'
import type {
  BillingPlanSet,
  TotalCapacitySet
} from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/StorageManager'
import type {
  OwnershipTransferred
} from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/Staking'
import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'
import stakingContract from '@rsksmart/rif-marketplace-storage/build/contracts/Staking.json'

import { eventMock } from '../utils'
import { eventTransformerFactory } from '../../src/blockchain/event-transformer'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const provider = '0x123CaJfi123AsfmFDFAM'

const token = '0x123CaJfi123AAJKVBjka1231FAM'

const TotalCapacitySetEvent = eventMock<TotalCapacitySet>({
  event: 'TotalCapacitySet',
  returnValues: {
    capacity: 1000,
    provider
  }
})

const BillingPlanSetEvent = eventMock<BillingPlanSet>({
  event: 'BillingPlanSet',
  returnValues: {
    price: 1000,
    period: 69696,
    token,
    provider
  }
})

const OwnershipTransferredEvent = eventMock<OwnershipTransferred>({
  event: 'OwnershipTransferred',
  returnValues: {
    previousOwner: provider,
    newOwner: provider
  }
})

describe('Event parser', function () {
  it('should lower case address type fields', () => {
    const parser = eventTransformerFactory(storageManagerContract.abi as AbiItem[])
    const parsedEvent = parser(TotalCapacitySetEvent)
    expect(parsedEvent.returnValues.provider).to.be.eql(provider.toLowerCase())
    expect(parsedEvent.returnValues.provider).to.not.be.eql(provider)

    const parsedEvent2 = parser(BillingPlanSetEvent)
    expect(parsedEvent2.returnValues.provider).to.be.eql(provider.toLowerCase())
    expect(parsedEvent2.returnValues.provider).to.not.be.eql(provider)
    expect(parsedEvent2.returnValues.token).to.be.eql(token.toLowerCase())
    expect(parsedEvent2.returnValues.token).to.not.be.eql(token)
  })

  it('should support multiple ABIs', () => {
    const parser = eventTransformerFactory(storageManagerContract.abi as AbiItem[], stakingContract.abi as AbiItem[])
    const parsedEvent = parser(TotalCapacitySetEvent)
    expect(parsedEvent.returnValues.provider).to.be.eql(provider.toLowerCase())
    expect(parsedEvent.returnValues.provider).to.not.be.eql(provider)

    const parsedEvent2 = parser(OwnershipTransferredEvent)
    expect(parsedEvent2.returnValues.previousOwner).to.be.eql(provider.toLowerCase())
    expect(parsedEvent2.returnValues.previousOwner).to.not.be.eql(provider)
    expect(parsedEvent2.returnValues.newOwner).to.be.eql(provider.toLowerCase())
    expect(parsedEvent2.returnValues.newOwner).to.not.be.eql(provider)
  })

  it('should return event as is if no abi found', () => {
    const parser = eventTransformerFactory([] as AbiItem[])
    const parsedEvent = parser(TotalCapacitySetEvent)
    expect(parsedEvent.returnValues.provider).to.be.eql(provider)

    const parsedEvent2 = parser(BillingPlanSetEvent)
    expect(parsedEvent2.returnValues.provider).to.be.eql(provider)
    expect(parsedEvent2.returnValues.token).to.be.eql(token)
  })
})
