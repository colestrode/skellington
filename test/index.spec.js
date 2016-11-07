'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const _ = require('lodash')

chai.use(require('sinon-chai'))

describe('Skellington', function () {
  let skellington
  let botkitMock
  let controllerMock
  let err
  let debugLoggerMock
  let serverMock
  let helpMock
  let utilsMock
  let singleBotMock
  let slackAppMock

  beforeEach(function () {
    controllerMock = {}

    botkitMock = {
      slackbot: sinon.stub().returns(controllerMock)
    }

    sinon.stub(process, 'exit')

    err = new Error('DING!')

    debugLoggerMock = {
      addLogger: sinon.stub()
    }

    serverMock = {
      start: sinon.stub()
    }

    helpMock = {
      addHelpListeners: sinon.stub()
    }

    utilsMock = {
      logError: sinon.stub()
    }

    singleBotMock = {
      start: sinon.stub()
    }

    slackAppMock = {
      start: sinon.stub()
    }

    skellington = proxyquire('../index', {
      'botkit': botkitMock,
      './lib/debug-logger': debugLoggerMock,
      './lib/server': serverMock,
      './lib/help': helpMock,
      './lib/utils': utilsMock,
      './lib/slack-app': slackAppMock,
      './lib/single-team-bot': singleBotMock
    })
  })

  afterEach(function () {
    process.exit.restore()
  })

  describe('config', function () {
    let testConfig

    function noop () {}

    beforeEach(function () {
      testConfig = {
        botkit: {
          thisone: 'iscool'
        },
        clientId: 'nope',
        clientSecret: 'nope',
        plugins: ['nope'],
        port: 'nope',
        redirectUri: 'nope',
        scopes: ['nope'],
        slackToken: 'nope',
        state: 'nope'
      }
    })

    it('should pass botkit config to botkit with defaults', function () {
      const expectedConfg = _.clone(testConfig.botkit)
      expectedConfg.status_optout = true
      expectedConfg.debug = false

      skellington(testConfig)
      expect(botkitMock.slackbot).to.have.been.calledWith(expectedConfg)
    })

    it('should pass defaults to botkit if no botkit config is passed', function () {
      const expectedConfg = {
        debug: false,
        status_optout: true
      }

      delete testConfig.botkit

      skellington(testConfig)
      expect(botkitMock.slackbot).to.have.been.calledWith(expectedConfg)
    })

    it('should take a non-array plugins and wrap it as an array', function () {
      testConfig.plugins = 'plugin'
      testConfig.debug = true
      const instance = skellington(testConfig)
      expect(instance.__config.plugins).to.be.an('array')
    })

    it('should flatten scopes', function () {
      testConfig.scopes = ['a']
      testConfig.plugins = [{scopes: ['b', 'c'], init: noop}, {scopes: ['c', 'd'], init: noop}]
      testConfig.debug = true
      const instance = skellington(testConfig)

      expect(instance.__config.scopes.sort()).to.deep.equal(['a', 'b', 'c', 'd'])
    })

    it('should exit if required configs are missing', function () {
      skellington({})
      expect(process.exit).to.have.been.calledWith(1)

      process.exit.reset()
      skellington({clientId: 'close'})
      expect(process.exit).to.have.been.calledWith(1)

      process.exit.reset()
      skellington({clientId: 'close', clientSecret: 'closer'})
      expect(process.exit).to.have.been.calledWith(1)
    })
  })

  describe('init', function() {
    let testConfig

    beforeEach(function() {
      testConfig = {
        debug: true,
        botkit: {
          thisone: 'iscool'
        },
        plugins: ['plugin'],
        port: 'port',
        slackToken: 'token'
      }
    })

    it('should add help listeners', function() {
      skellington(testConfig)
      expect(helpMock.addHelpListeners).to.have.been.calledWith(controllerMock, testConfig.plugins)
    })

    it('should set up a webserver if port is passed', function() {
      const instance = skellington(testConfig)
      expect(serverMock.start).to.have.been.calledWith(controllerMock, instance.__config)
    })

    it('should not set up a webserver if port is not pased', function() {
      delete testConfig.port
      skellington(testConfig)
      expect(serverMock.start).not.to.have.been.called
    })

    it('should set up a single team bot if slack token is passed', function() {
      const instance = skellington(testConfig)
      expect(singleBotMock.start).to.have.been.calledWith(controllerMock, instance.__config)
      expect(slackAppMock.start).not.to.have.been.called
    })

    it('should set up a slack app if slackToken is missing', function() {
      testConfig.clientId = 'the one who knocks'
      testConfig.clientSecret = 'shhhh'
      delete testConfig.slackToken

      const instance = skellington(testConfig)
      expect(slackAppMock.start).to.have.been.calledWith(controllerMock, instance.__config)
      expect(singleBotMock.start).not.to.have.been.called
    })
  })

  describe('debug', function () {
    let testConfig

    beforeEach(function () {
      testConfig = {
        debug: false,
        slackToken: 'abc123'
      }
    })

    it('should not expose config if debug is false', function() {
      const instance = skellington(testConfig)
      expect(instance.__config).not.to.exist
    })

    it('should expose config if debug is true', function() {
      testConfig.debug = true
      const instance = skellington(testConfig)
      expect(instance.__config).to.exist
    })

    it('should not set up debug logger if debug is false', function () {
      skellington(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).not.to.have.been.calledWith(controllerMock, {})
      expect(botkitDebug).to.be.false
    })

    it('should pass debug options', function() {
      testConfig.debugOptions = {walter: 'white'}
      skellington(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).not.to.have.been.calledWith(controllerMock, testConfig.debugOptions)
      expect(botkitDebug).to.be.false
    })

    it('should set up debug logger and botkit logging if debug is true', function () {
      testConfig.debug = true

      skellington(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).to.have.been.called
      expect(botkitDebug).to.be.true
    })

    it('should set up botkit debug false if botkit config.debug is false and debug is true', function () {
      testConfig.debug = true
      testConfig.botkit = {debug: false}

      skellington(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).to.have.been.called
      expect(botkitDebug).to.be.false
    })
  })
})
