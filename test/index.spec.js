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
  let botMock
  let storageMock
  let err

  function getOnCallback (eventName) {
    return _.find(controllerMock.on.args, (args) => {
      return args[0] === eventName
    })[1]
  }

  beforeEach(function () {
    botMock = {
      startRTM: sinon.stub().yields(null, botMock),
      reply: sinon.stub(),
      identity: {
        name: 'gazorpazorp'
      }
    }

    storageMock = {
      teams: {
        all: sinon.stub().yields(null)
      }
    }

    controllerMock = {
      hears: sinon.stub(),
      spawn: sinon.stub().returns(botMock),
      log: sinon.stub(),
      on: sinon.stub(),
      configureSlackApp: sinon.stub(),
      setupWebserver: sinon.stub().yields(null),
      createWebhookEndpoints: sinon.stub(),
      createOauthEndpoints: sinon.stub(),
      webserver: 'webserver',
      storage: storageMock
    }

    botkitMock = {
      slackbot: sinon.stub().returns(controllerMock)
    }

    sinon.stub(process, 'exit')

    err = new Error('DING!')

    skellington = proxyquire('../index', {
      'botkit': botkitMock
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
      expectedConfg.debug = false
      expectedConfg.status_optout = true

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
      skellington(testConfig)
      expect(testConfig.plugins).to.be.an('array')
    })

    it('should flatten scopes', function () {
      testConfig.scopes = ['a']
      testConfig.plugins = [{scopes: ['b', 'c'], init: noop}, {scopes: ['c', 'd'], init: noop}]
      skellington(testConfig)

      expect(testConfig.scopes.sort()).to.deep.equal(['a', 'b', 'c', 'd'])
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

  describe('server', function () {
    let testConfig

    beforeEach(function () {
      testConfig = {slackToken: 'walterwhite', port: 1234}
    })

    it('should set up a server if port is passed', function () {
      skellington(testConfig)
      expect(controllerMock.setupWebserver).to.have.been.calledWith(1234)
      expect(controllerMock.createWebhookEndpoints).to.have.been.calledWith(controllerMock.webserver)
      expect(controllerMock.createOauthEndpoints).to.have.been.calledWith(controllerMock.webserver)
    })

    it('should not set up server if port is missing', function () {
      delete testConfig.port
      skellington(testConfig)
      expect(controllerMock.setupWebserver).not.to.have.been.called
      expect(controllerMock.createWebhookEndpoints).not.to.have.been.called
      expect(controllerMock.createOauthEndpoints).not.to.have.been.called
    })

    it('should not create endpoints if server is not created', function () {
      controllerMock.setupWebserver.yields(err)
      skellington(testConfig)
      expect(controllerMock.setupWebserver).to.have.been.called
      expect(controllerMock.createWebhookEndpoints).not.to.have.been.called
      expect(controllerMock.createOauthEndpoints).not.to.have.been.called
    })

    describe('Oauth callback', function () {
      let oauthCallback
      let reqMock
      let resMock

      beforeEach(function () {
        skellington(testConfig)
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
        controllerMock.log.reset()

        oauthCallback(err, reqMock, resMock)
        expect(controllerMock.log).to.have.been.calledWith(err)
        expect(resMock.status).to.have.been.calledWith(500)
        expect(resMock.send).to.have.been.called
      })
    })
  })

  describe('startSlackapp', function () {
    let testConfig
    let plugin
    let teams

    beforeEach(function () {
      plugin = {
        init: sinon.stub(),
        botConnected: sinon.stub()
      }

      testConfig = {
        port: 1234,
        clientId: 'walterwhite',
        clientSecret: 'heisenberg',
        redirectUri: 'granitestate',
        plugins: [plugin],
        state: 'newmexico',
        scopes: ['a']
      }

      teams = [{bot: 'team1'}, {bot: 'team2'}]
      storageMock.teams.all.yields(null, teams)
    })

    it('should configure a slack app and initialize plugins', function () {
      skellington(testConfig)
      expect(controllerMock.configureSlackApp).to.have.been.calledWith({
        clientId: testConfig.clientId,
        clientSecret: testConfig.clientSecret,
        redirectUri: testConfig.redirectUri, // optional
        state: testConfig.state,
        scopes: testConfig.scopes
      })

      expect(plugin.init).to.have.been.calledWith(controllerMock, null, controllerMock.webserver)
    })

    it('should read teams from storage and reconnnect them', function () {
      skellington(testConfig)

      expect(storageMock.teams.all).to.have.been.called
      expect(controllerMock.spawn).to.have.been.calledTwice
      expect(botMock.startRTM).to.have.been.called
      expect(plugin.botConnected).to.have.been.called
    })

    it('should not start rtm if team does not have a bot', function () {
      teams = [{}, {}]
      storageMock.teams.all.yields(null, teams)
      skellington(testConfig)

      expect(storageMock.teams.all).to.have.been.called
      expect(controllerMock.spawn).not.to.have.been.calledTwice
      expect(botMock.startRTM).not.to.have.been.called
      expect(plugin.botConnected).not.to.have.been.called
    })

    it('should exit if it cannot read teams from storage', function () {
      storageMock.teams.all.yields(err)
      skellington(testConfig)

      expect(storageMock.teams.all).to.have.been.called
      expect(controllerMock.spawn).not.to.have.been.calledTwice
      expect(botMock.startRTM).not.to.have.been.called
      expect(plugin.botConnected).not.to.have.been.called
    })

    it('should exit if cannot connect team to rtm', function () {
      botMock.startRTM.yields(err)
      skellington(testConfig)

      expect(storageMock.teams.all).to.have.been.called
      expect(controllerMock.spawn).to.have.been.calledTwice
      expect(botMock.startRTM).to.have.been.called
      expect(plugin.botConnected).not.to.have.been.called
      expect(process.exit).to.have.been.calledWith(1)
    })
  })

  describe('startSingleBot', function () {
    let testConfig
    let plugin

    beforeEach(function () {
      plugin = {
        init: sinon.stub(),
        botConnected: sinon.stub()
      }

      testConfig = {
        slackToken: 'abc123',
        plugins: [plugin]
      }
    })

    it('should spawn a bot and start rtm', function () {
      skellington(testConfig)
      expect(controllerMock.spawn).to.have.been.calledWith({token: 'abc123'})
      expect(botMock.startRTM).to.have.been.called
      expect(plugin.init).to.have.been.called
      expect(plugin.botConnected).to.have.been.called
    })

    it('should handle error thrown when initializing plugins', function () {
      plugin.init.throws(err)
      skellington(testConfig)
      expect(plugin.init).to.have.been.called
      expect(plugin.botConnected).to.have.been.called
    })

    it('should handle err when calling botConnected', function () {
      plugin.botConnected.throws(err)
      skellington(testConfig)
      expect(plugin.init).to.have.been.called
      expect(plugin.botConnected).to.have.been.called
    })

    it('should continue if plugin init is missing', function () {
      delete plugin.init
      skellington(testConfig)
      expect(botMock.startRTM).to.have.been.called
      expect(plugin.botConnected).to.have.been.called
    })

    it('should continue if plugin botConnected is missing', function () {
      delete plugin.botConnected
      skellington(testConfig)
      expect(botMock.startRTM).to.have.been.called
      expect(plugin.init).to.have.been.called
    })

    it('should exit if starting rtm fails', function () {
      botMock.startRTM.yields(err)
      skellington(testConfig)

      expect(controllerMock.spawn).to.have.been.calledWith({token: 'abc123'})
      expect(botMock.startRTM).to.have.been.called
      expect(process.exit).to.have.been.calledWith(1)
      expect(plugin.init).not.to.have.been.called
      expect(plugin.botConnected).not.to.have.been.called
    })
  })

  describe('event: create_bot', function () {
    let callback
    let testConfig
    let plugin
    let newBot

    beforeEach(function () {
      plugin = {
        botConnected: sinon.stub()
      }

      testConfig = {
        slackToken: 'abc123',
        plugins: [plugin]
      }

      newBot = {
        startRTM: sinon.stub()
      }

      newBot.startRTM.yields(null, newBot)

      skellington(testConfig)
      plugin.botConnected.reset()
      callback = getOnCallback('create_bot')
    })

    it('should start rtm and call botConnected', function () {
      callback(newBot)
      expect(newBot.startRTM).to.have.been.called
      expect(plugin.botConnected).to.have.been.called
    })

    it('should only connect a bot once', function () {
      callback(newBot)
      callback(newBot)
      expect(newBot.startRTM).to.have.been.calledOnce
      expect(plugin.botConnected).to.have.been.calledOnce
    })

    it('should exit if rtm fails', function () {
      newBot.startRTM.yields(err)
      callback(newBot)
      expect(newBot.startRTM).to.have.been.called
      expect(plugin.botConnected).not.to.have.been.called
      expect(process.exit).to.have.been.called
    })
  })

  describe('event: rtm_close', function () {
    let callback

    beforeEach(function () {
      skellington({})

      controllerMock.log.reset()

      botMock.startRTM.reset()
      botMock.startRTM.yields(null)

      callback = getOnCallback('rtm_close')
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
      expect(process.exit).to.be.calledWith(1)
    })
  })
})
