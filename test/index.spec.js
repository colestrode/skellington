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
  let expressAppMock
  let botMock
  let connectedBotMock
  let exitOrig

  beforeEach(function () {
    connectedBotMock = {'team_info': {id: 'rickandmorty'}, identity: {name: 'butter-passer'}}

    botMock = {
      startRTM: sinon.stub(),
      reply: sinon.stub(),
      identity: {
        name: 'gazorpazorp'
      }
    }

    expressAppMock = {}

    controllerMock = {
      hears: sinon.stub(),
      spawn: sinon.stub().returns(botMock),
      log: sinon.stub(),
      on: sinon.stub(),
      setupWebserver: sinon.stub(),
      webserver: expressAppMock
    }

    botkitMock = {
      slackbot: sinon.stub().returns(controllerMock)
    }

    exitOrig = process.exit
    process.exit = sinon.stub()

    skellington = proxyquire('../index', {
      'botkit': botkitMock
    })
  })

  afterEach(function () {
    process.exit = exitOrig
  })

  describe('init', function () {
    it('should initialize', function () {
      skellington({slackToken: 'abc123'})

      expect(botkitMock.slackbot).to.have.been.calledWith({debug: false})
      expect(botMock.startRTM).to.be.called
      expect(controllerMock.on).to.be.calledWithMatch('rtm_close')
      expect(controllerMock.setupWebserver).not.to.be.called
    })

    it('should allow passed in configs', function () {
      let storageMock = {}

      skellington({
        slackToken: 'abc123',
        debug: true,
        port: 1234,
        storage: storageMock
      })

      expect(botkitMock.slackbot).to.have.been.calledWith({debug: true, storage: storageMock})
      expect(controllerMock.spawn).to.have.been.calledWith({token: 'abc123'})
      expect(controllerMock.setupWebserver).to.be.calledWith(1234)
    })
  })

  describe('startRtm', function () {
    let callback

    beforeEach(function () {
      skellington({})
      callback = botMock.startRTM.args[0][0]
    })

    it('should exit if there is an error connecting', function () {
      let error = new Error('GAZORPAZORP')

      callback(error)
      expect(controllerMock.log.callCount).to.equal(2)
      expect(controllerMock.log.args[1][0]).to.equal(error)
      expect(process.exit).to.be.calledWith(1)
    })

    describe('initialize plugins', function () {
      let plugin

      beforeEach(function () {
        botMock.startRTM.reset()
        plugin = {
          init: sinon.stub()
        }
      })

      it('should initialize one plugin not in an array', function () {
        skellington({plugins: plugin, port: 1234})
        botMock.startRTM.args[0][0](null, connectedBotMock)

        expect(plugin.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock)
      })

      it('should initialize one plugin in an array', function () {
        skellington({plugins: [plugin], port: 1234})
        botMock.startRTM.args[0][0](null, connectedBotMock)

        expect(plugin.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock)
      })

      it('should initialize multiple plugins', function () {
        let anotherExternalBot = {
          init: sinon.stub()
        }

        skellington({plugins: [plugin, anotherExternalBot], port: 1234})
        botMock.startRTM.args[0][0](null, connectedBotMock)

        expect(plugin.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock)
        expect(anotherExternalBot.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock)
      })
    })
  })

  describe('register help listeners', function () {
    let plugin
    let messageMock

    beforeEach(function () {
      botMock.startRTM.reset()
      plugin = {
        init: sinon.stub()
      }

      messageMock = {
        team: 'crystal',
        channel: 'blue',
        user: 'persuasion'
      }
    })

    it('should register a listener if no plugins have help text', function () {
      skellington({plugins: [plugin]})
      expect(controllerMock.hears).to.have.been.calledOnce

      let callback = controllerMock.hears.args[0][2]

      callback(botMock, messageMock)
      expect(botMock.reply).to.have.been.calledWithMatch(messageMock, /^I can't help you/)
    })

    it('should register a listener for each plugin with help text', function () {
      plugin.help = {
        command: 'rick',
        text: 'sanchez'
      }

      let anotherPlugin = {
        init: sinon.stub(),
        help: {
          command: 'morty',
          text: 'smith'
        }
      }

      let aThirdPlugin = {init: sinon.stub()}

      skellington({plugins: [plugin, anotherPlugin, aThirdPlugin]})

      expect(controllerMock.hears.callCount).to.equal(3) // once for general help, twice for plugins with help text

      // call all the callbacks
      _.forEach(controllerMock.hears.args, function (args) {
        args[2](botMock, messageMock)
      })

      expect(botMock.reply).to.have.been.calledWithMatch(messageMock, /^Here are some things/)
      expect(botMock.reply).to.have.been.calledWith(messageMock, plugin.help.text)
      expect(botMock.reply).to.have.been.calledWith(messageMock, anotherPlugin.help.text)
    })

    it('should handle a plugin help text callback', function () {
      let helpTextCb = sinon.stub()

      plugin.help = {
        command: 'walter',
        text: helpTextCb
      }

      botMock.identity = {name: 'rickandmorty'}

      skellington({plugins: [plugin]})

      // call all the callbacks
      _.forEach(controllerMock.hears.args, function (args) {
        args[2](botMock, messageMock)
      })

      expect(helpTextCb).to.have.been.calledWith({
        botName: botMock.identity.name,
        team: messageMock.team,
        channel: messageMock.channel,
        user: messageMock.user
      })
    })
  })

  describe('rtm_close', function () {
    let callback

    beforeEach(function () {
      skellington({})

      controllerMock.log.reset()

      botMock.startRTM.reset()
      botMock.startRTM.yields(null)

      callback = controllerMock.on.args[0][1]
    })

    it('should reconnect', function () {
      callback(botMock)
      expect(controllerMock.log).to.be.calledOnce
      expect(botMock.startRTM).to.be.calledOnce
    })

    it('should exit if reconnect fails', function () {
      let error = new Error('GAZORPAZORP')

      botMock.startRTM.yields(error)

      callback(botMock)
      expect(botMock.startRTM).to.be.calledOnce
      expect(controllerMock.log.callCount).to.equal(3)
      expect(controllerMock.log.args[2][0]).to.equal(error)
      expect(process.exit).to.be.calledWith(1)
    })
  })
})
