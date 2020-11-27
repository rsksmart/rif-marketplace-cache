import chai from 'chai'
import sinonChai from 'sinon-chai'

import Agreement from '../../../../src/services/storage/models/agreement.model'
import { sequelizeFactory } from '../../../../src/sequelize'
import Offer from '../../../../src/services/storage/models/offer.model'
import {
  AvailableCapacityService
} from '../../../../src/services/storage/services'

chai.use(sinonChai)
const expect = chai.expect

describe('Services', () => {
  const sequelize = sequelizeFactory()
  describe('Min Max Available Size', () => {
    beforeEach(async () => {
      await sequelize.sync({ force: true })
    })
    it('should retrieve min/max value for availableCapacity', async () => {
      await Offer.bulkCreate([
        { provider: 'provider1', totalCapacity: '102400', peerId: '1' },
        { provider: 'provider2', totalCapacity: '100', peerId: '2' },
        { provider: 'provider3', totalCapacity: '1126', peerId: '3' },
        { provider: 'provider4', totalCapacity: '1', peerId: '4' }
      ])
      await Agreement.bulkCreate([
        { agreementReference: '11', size: '1024', offerId: 'provider1' },
        { agreementReference: '12', size: '1024', offerId: 'provider1' },
        { agreementReference: '31', size: '1024', offerId: 'provider3' }
      ])

      const availableCapacityService = new AvailableCapacityService({ Model: Offer })
      const expectedRes = {
        min: 1,
        max: 100352
      }
      const minMax = await availableCapacityService.get()

      expect(minMax).to.be.deep.equal(expectedRes)
    })
  })
})
