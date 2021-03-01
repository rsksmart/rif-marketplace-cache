import chai from 'chai'
import sinonChai from 'sinon-chai'
import colors from 'colors/safe'
import { formatLogMessage } from '../../src/logger'

chai.use(sinonChai)
const expect = chai.expect

describe('Logger test', () => {
  it('should log the message as it is', () => {
    const timestamp = Date().toLocaleString()
    const message = formatLogMessage({ level: 'ERROR', message: 'Nasty error is here', timestamp, metadata: { service: 'db' } })
    const expectedMessage = `[ERROR] ${colors.grey(timestamp)} (db): Nasty error is here`
    expect(message).to.be.eql(expectedMessage)
  })

  it('should sanitize invalid log entry', () => {
    const timestamp = Date().toLocaleString()
    const message = formatLogMessage({ level: 'ERROR', message: `Nasty error is here\n[ERROR] ${colors.grey(timestamp)} (user): bad guy logged out`, timestamp, metadata: { service: 'db' } })
    const expectedMessage = `[ERROR] ${colors.grey(timestamp)} (db): Nasty error is here\\n[ERROR] ${colors.grey(timestamp)} (user): bad guy logged out`
    expect(message).to.be.eql(expectedMessage)
  })
})
