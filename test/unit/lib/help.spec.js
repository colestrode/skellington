'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const _ = require('lodash')

chai.use(require('sinon-chai'))

describe('help', function () {
  let controllerMock
  let messageMock
  let botMock
  let plugin
  let help

  beforeEach(function () {
    controllerMock = {
      hears: sinon.stub()
    }

    plugin = {
      init: sinon.stub()
    }

    botMock = {
      reply: sinon.stub(),
      identity: {
        name: 'walter'
      }
    }

    messageMock = {
      team: 'crystal',
      channel: 'blue',
      user: 'persuasion'
    }

    help = require('../../../lib/help')
  })

  it('should register a listener if no plugins have help text', function () {
    help.addHelpListeners(controllerMock, [plugin])
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

    help.addHelpListeners(controllerMock, [plugin, anotherPlugin, aThirdPlugin])

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

    help.addHelpListeners(controllerMock, [plugin])

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
