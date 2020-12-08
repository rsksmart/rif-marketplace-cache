import chai from 'chai'
import sinonChai from 'sinon-chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import { AbiItem } from 'web3-utils'
import {
  BillingPlanSet,
  TotalCapacitySet
} from '@rsksmart/rif-marketplace-storage/types/web3-v1-contracts/StorageManager'
import storageManagerContract from '@rsksmart/rif-marketplace-storage/build/contracts/StorageManager.json'

import { eventMock } from '../../../utils'
import { getEventTransformer } from '../../../../src/blockchain/event-transformer'

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

describe('Event parser', function () {
  it('should lower case address type fields', () => {
    const parser = getEventTransformer(storageManagerContract.abi as AbiItem[])
    const parsedEvent = parser(TotalCapacitySetEvent)
    expect(parsedEvent.returnValues.provider).to.be.eql(provider.toLowerCase())
    expect(parsedEvent.returnValues.provider).to.not.be.eql(provider)

    const parsedEvent2 = parser(BillingPlanSetEvent)
    expect(parsedEvent2.returnValues.provider).to.be.eql(provider.toLowerCase())
    expect(parsedEvent2.returnValues.provider).to.not.be.eql(provider)
    expect(parsedEvent2.returnValues.token).to.be.eql(token.toLowerCase())
    expect(parsedEvent2.returnValues.token).to.not.be.eql(token)
  })
  it('should return event as is if no abi found', () => {
    const parser = getEventTransformer([] as AbiItem[])
    const parsedEvent = parser(TotalCapacitySetEvent)
    expect(parsedEvent.returnValues.provider).to.be.eql(provider)

    const parsedEvent2 = parser(BillingPlanSetEvent)
    expect(parsedEvent2.returnValues.provider).to.be.eql(provider)
    expect(parsedEvent2.returnValues.token).to.be.eql(token)
  })
})
