import chai from 'chai'
import sinonChai from 'sinon-chai'
import BigNumber from 'bignumber.js'
import Sequelize, { literal } from 'sequelize'

import Agreement from '../../../src/services/storage/models/agreement.model'
import { sequelizeFactory } from '../../../src/sequelize'
import Offer, { getStakesAggregateQuery } from '../../../src/services/storage/models/offer.model'
import StakeModel from '../../../src/services/storage/models/stake.model'
import Rate from '../../../src/services/rates/rates.model'

chai.use(sinonChai)
const expect = chai.expect

const generateModelGettersTests = (
  schema: Array<{ fn: string, cases: Array<any> }>,
  modelFactory: (arg: object) => Sequelize.Model
) => schema.forEach(
  ({ fn, cases }) =>
    describe(`should properly calculate ${fn}`,
      () => cases.forEach(([arg, exp]) => {
        it(`${fn} for ${JSON.stringify(arg)} should be ${exp}`,
          () => {
            const model = modelFactory(arg)
            expect((model as { [key: string]: any })[fn]).to.be.eql(exp)
          }
        )
      })
    )
)

const hour = 1000 * 60 * 60
const day = hour * 24
const month = day * 30
const toSecond = (mili: number) => mili / 1000

const agreementFactory = (arg: object) => new Agreement({
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
  }
]

describe('Models', () => {
  const sequelize = sequelizeFactory()
  describe('Agreement', () => generateModelGettersTests(AGREEMENT_TEST_SCHEMA, agreementFactory))
  describe('Offer', () => {
    beforeEach(async () => {
      await sequelize.sync({ force: true })
    })
    it('Can aggregate total stakes for offers and order by stakes', async () => {
      // POPULATE DB
      await Offer.bulkCreate([
        { provider: 'abc', totalCapacity: 123, peerId: '1', averagePrice: '123' },
        { provider: 'abc2', totalCapacity: 1234, peerId: '2', averagePrice: '1234' },
        { provider: 'abc3', totalCapacity: 1234, peerId: '2', averagePrice: '1234' }
      ])
      await StakeModel.bulkCreate([
        { total: '1000', symbol: 'rbtc', account: 'abc', token: '123' },
        { total: '1000', symbol: 'rif', account: 'abc', token: '123' },
        { total: '2000', symbol: 'rbtc', account: 'abc2', token: '123' },
        { total: '1000', symbol: 'rif', account: 'abc2', token: '123' },
        { total: '1000', symbol: 'rbtc', account: 'abc3', token: '123' }
      ])
      await Rate.bulkCreate([
        { token: 'rif', usd: 1 },
        { token: 'rbtc', usd: 2 }
      ])

      expect((await Rate.findAll()).length).to.be.eql(2)
      expect((await StakeModel.findAll()).length).to.be.eql(5)
      expect((await Offer.findAll()).length).to.be.eql(3)

      // Prepare aggregation query
      const aggregateStakeQuery = await getStakesAggregateQuery(sequelize, 'usd')

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
        { provider: 'abc2', totalStakesUSD: 5000 },
        { provider: 'abc', totalStakesUSD: 3000 },
        { provider: 'abc3', totalStakesUSD: 2000 }
      ]
      expect(offers).to.be.deep.equal(expectedRes)
    })
  })
})
