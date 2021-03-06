import chai from 'chai'
import sinonChai from 'sinon-chai'
import BigNumber from 'bignumber.js'
import Sequelize, { literal } from 'sequelize'

import Agreement from '../../../../src/services/storage/models/agreement.model'
import { sequelizeFactory } from '../../../../src/sequelize'
import Offer, {
  getAvailableCapacityQuery,
  getBillingPriceAvgQuery,
  getStakesAggregateQuery
} from '../../../../src/services/storage/models/offer.model'
import StakeModel from '../../../../src/services/storage/models/stake.model'
import BillingPlan from '../../../../src/services/storage/models/billing-plan.model'
import Rate from '../../../../src/rates/rates.model'
import { ZERO_ADDRESS } from '../../../../src/definitions'

chai.use(sinonChai)
const expect = chai.expect

const generateModelGettersTests = (
  schema: Array<{ fn: string, cases: Array<any> }>,
  modelFactory: (arg: Record<string, unknown>) => Sequelize.Model
) => schema.forEach(
  ({ fn, cases }) =>
    describe(`should properly calculate ${fn}`,
      () => cases.forEach(([arg, exp]) => {
        it(`${fn} for ${JSON.stringify(arg)} should be ${exp}`,
          () => {
            const model = modelFactory(arg) as { [key: string]: any }
            const value = model[fn]
            expect(value).to.be.eql(exp)
          }
        )
      })
    )
)

const hour = 1000 * 60 * 60
const day = hour * 24
const month = day * 30
const toSecond = (mili: number) => mili / 1000

const agreementFactory = (arg: Record<string, unknown>) => new Agreement({
  agreementReference: 'ref',
  dataReference: 'dataRef',
  consumer: 'Creator',
  offerId: 'Offer',
  size: 1,
  billingPeriod: 1,
  billingPrice: 100,
  availableFunds: 100,
  lastPayout: new Date(),
  ...arg
})

const AGREEMENT_TEST_SCHEMA = [
  {
    fn: 'numberOfPrepaidPeriods',
    cases: [
      [{ billingPrice: 10, size: 1, availableFunds: 10 }, new BigNumber(1)],
      [{ billingPrice: 100, size: 2, availableFunds: 100 }, new BigNumber(0)],
      [{ billingPrice: 1, size: 5, availableFunds: 10 }, new BigNumber(2)],
      [{ billingPrice: 1, size: 10, availableFunds: 1000 }, new BigNumber(100)],
      [{ billingPrice: 102222, size: 1, availableFunds: 10 }, new BigNumber(0)]
    ]
  },
  {
    fn: 'periodsSinceLastPayout',
    cases: [
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now() - day) }, new BigNumber(24)],
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now() - hour) }, new BigNumber(1)],
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now() - hour * 4) }, new BigNumber(4)],
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now()) }, new BigNumber(0)],
      [{ billingPeriod: toSecond(day), lastPayout: new Date(Date.now() - day) }, new BigNumber(1)],
      [{ billingPeriod: toSecond(2 * day), lastPayout: new Date(Date.now() - 2 * day) }, new BigNumber(1)],
      [{ billingPeriod: toSecond(2 * day), lastPayout: new Date(Date.now() - 4 * day) }, new BigNumber(2)],
      [{ billingPeriod: toSecond(month), lastPayout: new Date(Date.now() - 4 * month) }, new BigNumber(4)]
    ]
  },
  {
    fn: 'toBePayedOut',
    cases: [
      [
        {
          availableFunds: 100,
          size: 1,
          billingPrice: 2,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        new BigNumber(48)
      ],
      [
        {
          availableFunds: 47,
          size: 1,
          billingPrice: 2,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        new BigNumber(47)
      ],
      [
        {
          availableFunds: 100,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        new BigNumber(100)
      ],
      [
        {
          availableFunds: 2400,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        new BigNumber(2400)
      ],
      [
        {
          availableFunds: 2400,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(month),
          lastPayout: new Date(Date.now() - 4 * month)
        },
        new BigNumber(400)
      ]
    ]
  },
  {
    fn: 'hasSufficientFunds',
    cases: [
      [
        {
          availableFunds: 100,
          size: 1,
          billingPrice: 2,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        true
      ],
      [
        {
          availableFunds: 47,
          size: 1,
          billingPrice: 2,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        false
      ],
      [
        {
          availableFunds: 49,
          size: 1,
          billingPrice: 2,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        false
      ],
      [
        {
          availableFunds: 100,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        false
      ],
      [
        {
          availableFunds: 120,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        false
      ],
      [
        {
          availableFunds: 2400,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        false
      ],
      [
        {
          availableFunds: 2400,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(month),
          lastPayout: new Date(Date.now() - 4 * month)
        },
        true
      ]
    ]
  },
  {
    fn: 'expiresIn',
    cases: [
      [
        {
          availableFunds: 100, // Not enough for period
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        new BigNumber(0)
      ],
      [
        {
          availableFunds: 2500, // enough for 1 period
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        new BigNumber(3600)
      ],
      [
        {
          availableFunds: 250, // enough for half period
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - 2 * hour)
        },
        new BigNumber(0)
      ],
      [
        {
          availableFunds: 400, // enough for 2 periods
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - 2 * hour)
        },
        new BigNumber(7200)
      ],
      [
        {
          availableFunds: 400, // enough for 2 periods
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - 2.5 * hour)
        },
        new BigNumber(1.5 * 3600)
      ],
      [
        {
          availableFunds: 100, // has for one period
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - 0.7 * hour) // period already started and has 0.3 hour left
        },
        new BigNumber(3600 * 0.3)
      ]
    ]
  }
]

describe('Models', () => {
  const sequelize = sequelizeFactory()
  describe('Agreement', () => generateModelGettersTests(AGREEMENT_TEST_SCHEMA, agreementFactory))
  describe('Offer', () => {
    beforeEach(async () => {
      await sequelize.sync({ force: true })
    })
    it('should aggregate avg billing price for offers', async () => {
      // POPULATE DB
      await Offer.bulkCreate([
        { provider: 'abc', totalCapacity: 123, peerId: '1' },
        { provider: 'abc2', totalCapacity: 1234, peerId: '2' },
        { provider: 'abc3', totalCapacity: 1234, peerId: '2' }
      ])
      await Rate.bulkCreate([
        { token: 'rif', usd: 1 },
        { token: 'rbtc', usd: 1 }
      ])
      const wei = 1000000000000000000
      const pricePerDayPerGb = wei / 1024
      await BillingPlan.bulkCreate([
        { period: '86400', price: `${pricePerDayPerGb}`, tokenAddress: ZERO_ADDRESS, offerId: 'abc', rateId: 'rbtc' },
        { period: '604800', price: `${7 * pricePerDayPerGb}`, tokenAddress: '0x12345', offerId: 'abc', rateId: 'rif' },
        { period: '2592000', price: `${30 * pricePerDayPerGb}`, tokenAddress: ZERO_ADDRESS, offerId: 'abc', rateId: 'rbtc' },
        { period: '86400', price: `${2 * pricePerDayPerGb}`, tokenAddress: ZERO_ADDRESS, offerId: 'abc2', rateId: 'rbtc' },
        { period: '604800', price: `${2 * 7 * pricePerDayPerGb}`, tokenAddress: '0x12345', offerId: 'abc2', rateId: 'rif' },
        { period: '2592000', price: `${2 * 30 * pricePerDayPerGb}`, tokenAddress: ZERO_ADDRESS, offerId: 'abc2', rateId: 'rbtc' },
        { period: '86400', price: `${3 * pricePerDayPerGb}`, tokenAddress: ZERO_ADDRESS, offerId: 'abc3', rateId: 'rbtc' },
        { period: '604800', price: `${3 * 7 * pricePerDayPerGb}`, tokenAddress: '0x12345', offerId: 'abc3', rateId: 'rif' },
        { period: '2592000', price: `${3 * 30 * pricePerDayPerGb}`, tokenAddress: ZERO_ADDRESS, offerId: 'abc3', rateId: 'rbtc' }
      ])

      expect((await Rate.findAll()).length).to.be.eql(2)
      expect((await BillingPlan.findAll()).length).to.be.eql(9)
      expect((await Offer.findAll()).length).to.be.eql(3)

      // Prepare aggregation query
      const aggregateBillingPriceAvg = getBillingPriceAvgQuery(sequelize, 'usd')

      const offers = await Offer.findAll({
        raw: true,
        attributes: {
          exclude: ['totalCapacity', 'peerId', 'createdAt', 'updatedAt'],
          include: [
            [
              aggregateBillingPriceAvg,
              'avgBillingPrice'
            ]
          ]
        },
        order: [literal('avgBillingPrice')]
      })
      const expectedRes = [
        { provider: 'abc', avgBillingPrice: 30 },
        { provider: 'abc2', avgBillingPrice: 60 },
        { provider: 'abc3', avgBillingPrice: 90 }
      ]
      expect(offers).to.be.deep.equal(expectedRes)
    })
    it('should aggregate available size for offers', async () => {
      // POPULATE DB
      await Offer.bulkCreate([
        { provider: 'provider1', totalCapacity: 100, peerId: '1' },
        { provider: 'provider2', totalCapacity: 100, peerId: '2' }
      ])
      await Agreement.bulkCreate([
        { agreementReference: '123', size: 10, offerId: 'provider1' },
        { agreementReference: '1234', size: 10, offerId: 'provider1' },
        { agreementReference: '12345', size: 10, offerId: 'provider1', isActive: false }
      ])

      expect((await Agreement.findAll()).length).to.be.eql(3)

      // Prepare aggregation query
      const aggregateAvailableCapacityQuery = getAvailableCapacityQuery()

      const offers = await Offer.findAll({
        raw: true,
        attributes: {
          exclude: ['totalCapacity', 'peerId', 'averagePrice', 'createdAt', 'updatedAt'],
          include: [
            [
              aggregateAvailableCapacityQuery,
              'availableCapacity'
            ]
          ]
        }
      })

      const expectedRes = [
        { provider: 'provider1', availableCapacity: 80 },
        { provider: 'provider2', availableCapacity: 100 }
      ]
      expect(offers).to.be.deep.equal(expectedRes)
    })
    it('should aggregate total stakes for offers and order by stakes', async () => {
      // POPULATE DB
      await Offer.bulkCreate([
        { provider: 'abc', totalCapacity: 123, peerId: '1', averagePrice: '123' },
        { provider: 'abc2', totalCapacity: 1234, peerId: '2', averagePrice: '1234' },
        { provider: 'abc3', totalCapacity: 1234, peerId: '2', averagePrice: '1234' }
      ])
      await StakeModel.bulkCreate([
        { total: '369000000000000000', symbol: 'rbtc', account: 'abc', token: ZERO_ADDRESS },
        { total: '369000000000000000123791', symbol: 'rif', account: 'abc', token: '0x12345' },
        { total: '369000000000000000', symbol: 'rbtc', account: 'abc2', token: ZERO_ADDRESS },
        { total: '36900023748000000000000', symbol: 'rif', account: 'abc2', token: '0x12345' },
        { total: '1000000000000000000', symbol: 'rbtc', account: 'abc3', token: ZERO_ADDRESS }
      ])
      await Rate.bulkCreate([
        { token: 'rif', usd: 1 },
        { token: 'rbtc', usd: 2 }
      ])

      expect((await Rate.findAll()).length).to.be.eql(2)
      expect((await StakeModel.findAll()).length).to.be.eql(5)
      expect((await Offer.findAll()).length).to.be.eql(3)

      // Prepare aggregation query
      const aggregateStakeQuery = getStakesAggregateQuery(sequelize, 'usd')

      const offers = await Offer.findAll({
        raw: true,
        attributes: {
          exclude: ['totalCapacity', 'peerId', 'averagePrice', 'createdAt', 'updatedAt'],
          include: [
            [
              aggregateStakeQuery,
              'totalStakesUSD'
            ]
          ]
        },
        order: [literal('totalStakesUSD DESC')]
      })

      const expectedRes = [
        { provider: 'abc', totalStakesUSD: 369000 },
        { provider: 'abc2', totalStakesUSD: 36900 },
        { provider: 'abc3', totalStakesUSD: 2 }
      ]
      expect(offers).to.be.deep.equal(expectedRes)
    })
  })
})
