import chai from 'chai'
import sinonChai from 'sinon-chai'

import Agreement from '../../../src/services/storage/models/agreement.model'
import { sequelizeFactory } from '../../../src/sequelize'
import Sequelize from 'sequelize'

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
      [{ billingPrice: 10, size: 1, availableFunds: 10 }, 1],
      [{ billingPrice: 100, size: 2, availableFunds: 100 }, 0],
      [{ billingPrice: 1, size: 5, availableFunds: 10 }, 2],
      [{ billingPrice: 1, size: 10, availableFunds: 1000 }, 100],
      [{ billingPrice: 102222, size: 1, availableFunds: 10 }, 0]
    ]
  },
  {
    fn: 'periodsSinceLastPayout',
    cases: [
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now() - day) }, 24],
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now() - hour) }, 1],
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now() - hour * 4) }, 4],
      [{ billingPeriod: toSecond(hour), lastPayout: new Date(Date.now()) }, 0],
      [{ billingPeriod: toSecond(day), lastPayout: new Date(Date.now() - day) }, 1],
      [{ billingPeriod: toSecond(2 * day), lastPayout: new Date(Date.now() - 2 * day) }, 1],
      [{ billingPeriod: toSecond(2 * day), lastPayout: new Date(Date.now() - 4 * day) }, 2],
      [{ billingPeriod: toSecond(month), lastPayout: new Date(Date.now() - 4 * month) }, 4]
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
        48
      ],
      [
        {
          availableFunds: 47,
          size: 1,
          billingPrice: 2,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        47
      ],
      [
        {
          availableFunds: 100,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        100
      ],
      [
        {
          availableFunds: 2400,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(hour),
          lastPayout: new Date(Date.now() - day)
        },
        2400
      ],
      [
        {
          availableFunds: 2400,
          size: 10,
          billingPrice: 10,
          billingPeriod: toSecond(month),
          lastPayout: new Date(Date.now() - 4 * month)
        },
        400
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
        true
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
  before(() => sequelizeFactory())
  describe('Agreement', () => generateModelGettersTests(AGREEMENT_TEST_SCHEMA, agreementFactory))
})
