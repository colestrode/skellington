'use strict'

var chai = require('chai')
var expect = chai.expect
var sinon = require('sinon')

chai.use(require('sinon-chai'))

describe('Debug Logger', function () {
  let logger
  let controllerMock
  let testConfig
  let patterns
  let events
  let messageMock
  let hearsMock

  beforeEach(function () {
    hearsMock = sinon.stub()
    messageMock = {}

    controllerMock = {
      log: sinon.stub(),
      hears_test: sinon.stub().returns(true),
      hears: hearsMock
    }

    testConfig = {}

    patterns = ['walter']

    events = ['white']

    logger = require('../../lib/debug-logger')
  })

  function getLoggingMiddleware () {
    controllerMock.hears(patterns, events, () => {})
    return hearsMock.args[0][2]
  }

  it('should log on a call to hears', function () {
    logger.addLogger(controllerMock, testConfig)
    const loggingMiddleware = getLoggingMiddleware()

    expect(hearsMock).to.have.been.called
    loggingMiddleware(patterns, messageMock)
    expect(controllerMock.hears_test).to.have.been.calledWith(patterns, messageMock)
    expect(controllerMock.log).to.have.been.called
  })

  it('should not log if default hears_test returns false', function () {
    logger.addLogger(controllerMock, testConfig)
    controllerMock.hears_test.returns(false)
    const loggingMiddleware = getLoggingMiddleware()

    loggingMiddleware(patterns, messageMock)
    expect(controllerMock.log).not.to.have.been.called
  })

  it('should log if middleware returns true', function () {
    logger.addLogger(controllerMock, testConfig)

    const middleware = sinon.stub().returns(true)
    controllerMock.hears(patterns, events, middleware, () => {})
    const loggingMiddleware = hearsMock.args[0][2]

    loggingMiddleware(patterns, messageMock)
    expect(middleware).to.have.been.called
    expect(controllerMock.hears_test).not.to.have.been.called
    expect(controllerMock.log).to.have.been.called
  })

  it('should not log if middleware returns false', function () {
    logger.addLogger(controllerMock, testConfig)

    const middleware = sinon.stub().returns(false)
    controllerMock.hears(patterns, events, middleware, () => {})
    const loggingMiddleware = hearsMock.args[0][2]

    loggingMiddleware(patterns, messageMock)
    expect(middleware).to.have.been.called
    expect(controllerMock.log).not.to.have.been.called
  })

  it('should allow formatter to be overwritten', function () {
    testConfig.formatter = sinon.stub()
    logger.addLogger(controllerMock, testConfig)

    const loggingMiddleware = getLoggingMiddleware()
    loggingMiddleware(patterns, messageMock)

    expect(testConfig.formatter).to.have.been.called
    const firstArg = testConfig.formatter.args[0][0]
    expect(firstArg).to.include.keys(['skellington'])
    expect(firstArg.skellington).to.include.keys(['file'])
  })

  describe('getCallerFile', function () {
    it('should restore prepareStackTrace', function () {
      // prepareStackTrace gets temporarily overwritten, make sure we restore it
      const prepareStackTraceOrig = Error.prepareStackTrace
      logger.addLogger(controllerMock, testConfig)
      expect(Error.prepareStackTrace).to.equal(prepareStackTraceOrig)
    })
  })
})
