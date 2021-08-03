import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'
import { Sequelize } from 'sequelize'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { ReturnObject, ServiceProvider } from '../../../../../src/httpClient'
import { sequelizeFactory } from '../../../../../src/sequelize'
import NotifierSvcProvider, { NotificationServiceTypeDTO, NotifierChannel, NotifierResult, NOTIFIER_RESOURCES } from '../../../../../src/services/notifier/api/notifierSvcProvider'

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

const sandbox = sinon.createSandbox()

type NotifierFetchReturnType<T> = ReturnObject<NotifierResult<T>>

const successfulResponse = <T>(data: NotifierResult<T>): NotifierFetchReturnType<T> => ({
  success: true,
  code: 201,
  message: '',
  data
})

describe('Notifier Service: Notifier Service Provider API', () => {
  let sequelize: Sequelize

  before(() => {
    sequelize = sequelizeFactory()
  })

  beforeEach(async () => {
    await sequelize.sync({ force: true })
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(() => {
    sandbox.restore()
  })

  describe('defaultChannelMapper', () => {
    it('should map a NotificationServiceTypeDTO to NotifierChannel', () => {
      const mockDto: NotificationServiceTypeDTO = {
        notificationServiceType: 'API',
        origin: 'http://nowhere.here'
      }

      const expectedChannel: NotifierChannel = {
        type: mockDto.notificationServiceType,
        origin: mockDto.origin
      }

      const [mappedChannel]: NotifierChannel[] = [mockDto].map(NotifierSvcProvider.defaultChannelMapper)

      expect(mappedChannel).to.deep.equal(expectedChannel)
    })
  })

  describe('getSubscriptions', () => {
    it('should return NotifierResult<NotificationServiceTypeDTO>', async () => {
      const mockDto: NotificationServiceTypeDTO[] = [
        {
          notificationServiceType: 'API',
          origin: 'http://nowhere.here'
        }
      ]

      const fetchSpy = sandbox.stub(ServiceProvider.prototype as any, '_fetch')
        .callsFake((): Promise<NotifierFetchReturnType<NotificationServiceTypeDTO[]>> => Promise.resolve(successfulResponse({
          status: 'OK',
          message: 'OK',
          content: mockDto
        })))

      const notifierSvcProvider = new NotifierSvcProvider({ host: 'http://fake.url', port: '0000' })
      const channels: NotifierChannel[] = await notifierSvcProvider[NOTIFIER_RESOURCES.availableNotificationPreferences]()

      sandbox.assert.calledOnce(fetchSpy)
      expect(channels).to.deep.equal(mockDto.map(NotifierSvcProvider.defaultChannelMapper))
    })
  })
})
