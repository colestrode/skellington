'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const _ = require('lodash')

chai.use(require('sinon-chai'))
chai.use(require('dirty-chai'))

describe('slack-app', function () {
  let testConfig
  let teams
  let storageMock
  let controllerMock
  let botMock
  let lifecycleMock
  let utilsMock
  let loggerMock
  let err
  let slackApp

  function getOnCallback (eventName) {
    return _.find(controllerMock.on.args, (args) => {
      return args[0] === eventName
    })[1]
  }

  beforeEach(function () {
    testConfig = {
      port: 1234,
      clientId: 'walterwhite',
      clientSecret: 'heisenberg',
      redirectUri: 'granitestate',
      plugins: [{}],
      state: 'newmexico',
      scopes: ['a'],
      connectedTeams: new Set()
    }

    lifecycleMock = {
      initialize: sinon.stub(),
      botConnected: sinon.stub()
    }

    loggerMock = {
      error: sinon.stub(),
      info: sinon.stub()
    }

    utilsMock = {
      identity: sinon.stub()
    }

    teams = [{bot: 'team1', id: 'heisenberg'}, {bot: 'team2', id: 'capncook'}]

    storageMock = {
      teams: {
        all: sinon.stub().yields(null, teams),
        save: sinon.stub().yields(null)
      }
    }

    botMock = {
      startRTM: sinon.stub(),
      team_info: {
        id: 'heisenberg'
      },
      identity: {
        id: 'walter'
      }
    }

    botMock.startRTM.yields(null, botMock)

    controllerMock = {
      spawn: sinon.stub().returns(botMock),
      log: sinon.stub(),
      on: sinon.stub(),
      configureSlackApp: sinon.stub(),
      storage: storageMock
    }

    sinon.stub(process, 'exit')

    err = new Error('GUSFRING')

    slackApp = proxyquire('../../../lib/slack-app', {
      './plugin-lifecycle': lifecycleMock,
      './utils': utilsMock,
      './logger': loggerMock
    })
  })

  afterEach(function () {
    process.exit.restore()
  })

  it('should configure a slack app and initialize plugins', function () {
    slackApp.start(controllerMock, testConfig)

    expect(controllerMock.configureSlackApp).to.have.been.calledWith({
      clientId: testConfig.clientId,
      clientSecret: testConfig.clientSecret,
      redirectUri: testConfig.redirectUri, // optional
      state: testConfig.state,
      scopes: testConfig.scopes
    })

    expect(lifecycleMock.initialize).to.have.been.calledWith(testConfig.plugins, controllerMock, null)
  })

  it('should read teams from storage and reconnnect them', function () {
    slackApp.start(controllerMock, testConfig)

    expect(storageMock.teams.all).to.have.been.called()
    expect(controllerMock.spawn).to.have.been.calledTwice()
    expect(botMock.startRTM).to.have.been.called()
    expect(lifecycleMock.botConnected).to.have.been.called()
  })

  it('should not start rtm if team does not have a bot', function () {
    teams = [{}, {}]
    storageMock.teams.all.yields(null, teams)
    slackApp.start(controllerMock, testConfig)

    expect(storageMock.teams.all).to.have.been.called()
    expect(controllerMock.spawn).not.to.have.been.calledTwice()
    expect(botMock.startRTM).not.to.have.been.called()
    expect(lifecycleMock.botConnected).not.to.have.been.called()
  })

  it('should exit if it cannot read teams from storage', function () {
    storageMock.teams.all.yields(err)
    slackApp.start(controllerMock, testConfig)

    expect(storageMock.teams.all).to.have.been.called()
    expect(controllerMock.spawn).not.to.have.been.calledTwice()
    expect(botMock.startRTM).not.to.have.been.called()
    expect(lifecycleMock.botConnected).not.to.have.been.called()
    expect(process.exit).to.have.been.calledWith(1)
  })

  it('should remove team for account_inactive error', function () {
    botMock.startRTM.yields('account_inactive')
    slackApp.start(controllerMock, testConfig)

    expect(storageMock.teams.all).to.have.been.called()
    expect(controllerMock.spawn).to.have.been.calledTwice()
    expect(botMock.startRTM).to.have.been.called()
    expect(storageMock.teams.save).to.have.been.called()
    expect(lifecycleMock.botConnected).not.to.have.been.called()
  })

  it('should remove team for invalid_auth error', function () {
    botMock.startRTM.yields('invalid_auth')
    slackApp.start(controllerMock, testConfig)

    expect(storageMock.teams.all).to.have.been.called()
    expect(controllerMock.spawn).to.have.been.calledTwice()
    expect(botMock.startRTM).to.have.been.called()
    expect(storageMock.teams.save).to.have.been.called()
    expect(lifecycleMock.botConnected).not.to.have.been.called()
  })

  it('should not remove team for other errors', function () {
    botMock.startRTM.yields('two dots')
    slackApp.start(controllerMock, testConfig)

    expect(storageMock.teams.all).to.have.been.called()
    expect(controllerMock.spawn).to.have.been.calledTwice()
    expect(botMock.startRTM).to.have.been.called()
    expect(storageMock.teams.save).not.to.have.been.called()
    expect(lifecycleMock.botConnected).not.to.have.been.called()
  })

  describe('event: create_bot', function () {
    let callback
    let testConfig
    let newBot

    beforeEach(function () {
      testConfig = {
        slackToken: 'abc123',
        plugins: [{}],
        connectedTeams: new Set()
      }

      newBot = {
        startRTM: sinon.stub().yields(null, newBot),
        identity: {
          name: 'rick',
          id: 'rick'
        },
        config: {
          id: 'ricksanchez'
        },
        team_info: {
          id: 'ricksanchez'
        }
      }

      newBot.startRTM.yields(null, newBot)

      slackApp.start(controllerMock, testConfig)
      lifecycleMock.botConnected.reset()
      callback = getOnCallback('create_bot')
    })

    it('should start rtm and call botConnected', function () {
      callback(newBot)
      expect(newBot.startRTM).to.have.been.called()
      expect(lifecycleMock.botConnected).to.have.been.called()
    })

    it('should only connect a bot once', function () {
      callback(newBot)
      callback(newBot)
      expect(newBot.startRTM).to.have.been.calledOnce()
      expect(lifecycleMock.botConnected).to.have.been.calledOnce()
    })

    it('should not call botConnected when rtm cannot connect', function () {
      newBot.startRTM.yields(err)
      callback(newBot)
      expect(newBot.startRTM).to.have.been.called()
      expect(lifecycleMock.botConnected).not.to.have.been.called()
    })
  })

  describe('event: rtm_reconnect_failed', function () {
    let callback

    beforeEach(function () {
      slackApp.start(controllerMock, testConfig)

      botMock.startRTM.reset()
      botMock.startRTM.yields(null)

      callback = getOnCallback('rtm_reconnect_failed')
    })

    it('should remove team', function () {
      sinon.spy(testConfig.connectedTeams, 'delete')
      callback(botMock, err)
      expect(testConfig.connectedTeams.delete).to.have.been.calledWith(botMock.team_info.id)
    })
  })
})
