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
        { provider: 'provider1', totalCapacity: 100, peerId: '1' },
        { provider: 'provider2', totalCapacity: 100, peerId: '2' }
      ])
      await Agreement.bulkCreate([
        { agreementReference: '123', size: 10, offerId: 'provider1' },
        { agreementReference: '1234', size: 10, offerId: 'provider1' }
      ])

      const availableCapacityService = new AvailableCapacityService({ Model: Offer })
      const expectedRes = {
        min: 80,
        max: 100
      }
      const minMax = await availableCapacityService.get()
      expect(minMax).to.be.deep.equal(expectedRes)
    })
  })
})
