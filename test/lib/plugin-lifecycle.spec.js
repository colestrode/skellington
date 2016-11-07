'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()

chai.use(require('sinon-chai'))

describe('plugin-lifecycle', function () {
  let controllerMock
  let botMock
  let utilsMock
  let lifecycle

  beforeEach(function () {
    controllerMock = {
      webserver: 'webserver'
    }

    botMock = 'bottttt'

    utilsMock = {
      logError: sinon.stub()
    }

    lifecycle = proxyquire('../../lib/plugin-lifecycle', {
      './utils': utilsMock
    })
  })

  describe('init', function () {
    let plugin1
    let plugin2

    beforeEach(function () {
      plugin1 = {
        init: sinon.stub()
      }

      plugin2 = {
        init: sinon.stub()
      }
    })

    it('should initialize plugins', function () {
      lifecycle.initialize([plugin1, plugin2], controllerMock, botMock)
      expect(plugin1.init).to.have.been.calledWith(controllerMock, botMock, controllerMock.webserver)
      expect(plugin2.init).to.have.been.calledWith(controllerMock, botMock, controllerMock.webserver)
    })

    it('should use null if bot is not passed', function () {
      lifecycle.initialize([plugin1], controllerMock)
      expect(plugin1.init).to.have.been.calledWith(controllerMock, null, controllerMock.webserver)
    })

    it('should handle an error in initializing a plugin', function () {
      const err = new Error('GUSFRING')
      plugin1.init.throws(err)

      lifecycle.initialize([plugin1, plugin2], controllerMock, botMock)
      expect(plugin1.init).to.have.been.calledWith(controllerMock, botMock, controllerMock.webserver)
      expect(plugin2.init).to.have.been.calledWith(controllerMock, botMock, controllerMock.webserver)
    })

    it('should continue if plugin init is missing', function () {
      delete plugin1.init
      lifecycle.initialize([plugin1, plugin2], controllerMock, botMock)
      expect(plugin2.init).to.have.been.called
    })
  })

  describe('botConnected', function () {
    let plugin1
    let plugin2

    beforeEach(function () {
      plugin1 = {
        botConnected: sinon.stub()
      }

      plugin2 = {
        botConnected: sinon.stub()
      }
    })

    it('should initialize plugins', function () {
      lifecycle.botConnected([plugin1, plugin2], controllerMock, botMock)
      expect(plugin1.botConnected).to.have.been.calledWith(controllerMock, botMock)
      expect(plugin2.botConnected).to.have.been.calledWith(controllerMock, botMock)
    })

    it('should handle an error in initializing a plugin', function () {
      const err = new Error('GUSFRING')
      plugin1.botConnected.throws(err)

      lifecycle.botConnected([plugin1, plugin2], controllerMock, botMock)
      expect(plugin1.botConnected).to.have.been.calledWith(controllerMock, botMock)
      expect(plugin2.botConnected).to.have.been.calledWith(controllerMock, botMock)
    })

    it('should continue if plugin botConnected is missing', function () {
      delete plugin1.botConnected
      lifecycle.botConnected([plugin1, plugin2], controllerMock, botMock)
      expect(plugin2.botConnected).to.have.been.called
    })
  })
})
