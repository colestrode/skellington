'use strict'

var chai = require('chai')
var expect = chai.expect
var sinon = require('sinon')
var proxyquire = require('proxyquire').noCallThru()

chai.use(require('sinon-chai'))

describe('server', function () {
  let testConfig
  let utilsMock
  let controllerMock
  let err
  let server

  beforeEach(function () {
    utilsMock = {
      logError: sinon.stub()
    }

    testConfig = {port: 1234}

    controllerMock = {
      webserver: 'webserver',
      setupWebserver: sinon.stub().yields(),
      createWebhookEndpoints: sinon.stub(),
      createOauthEndpoints: sinon.stub()
    }

    err = new Error('GUSFRING')

    server = proxyquire('../../../lib/server', {
      './utils': utilsMock
    })
  })

  it('should set up a server if port is passed', function () {
    server.start(controllerMock, testConfig)
    expect(controllerMock.setupWebserver).to.have.been.calledWith(1234)
    expect(controllerMock.createWebhookEndpoints).to.have.been.calledWith(controllerMock.webserver)
    expect(controllerMock.createOauthEndpoints).to.have.been.calledWith(controllerMock.webserver)
  })

  it('should not create endpoints if server is not created', function () {
    controllerMock.setupWebserver.yields(err)
    server.start(controllerMock, testConfig)
    expect(controllerMock.setupWebserver).to.have.been.called
    expect(controllerMock.createWebhookEndpoints).not.to.have.been.called
    expect(controllerMock.createOauthEndpoints).not.to.have.been.called
  })

  describe('Oauth callback', function () {
    let oauthCallback
    let reqMock
    let resMock

    beforeEach(function () {
      server.start(controllerMock, testConfig)
      oauthCallback = controllerMock.createOauthEndpoints.args[0][1]

      reqMock = {}
      resMock = {
        status: sinon.stub(),
        send: sinon.stub()
      }

      resMock.status.returns(resMock)
    })

    it('should respond with 200 and success', function () {
      oauthCallback(null, reqMock, resMock)
      expect(resMock.status).to.have.been.calledWith(200)
      expect(resMock.send).to.have.been.called
    })

    it('should respond with a 500 and error if oauth fails', function () {
      utilsMock.logError.reset()

      oauthCallback(err, reqMock, resMock)
      expect(utilsMock.logError).to.have.been.calledWith(controllerMock, err)
      expect(resMock.status).to.have.been.calledWith(500)
      expect(resMock.send).to.have.been.called
    })
  })
})
