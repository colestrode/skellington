'use strict';

let chai = require('chai');
let expect = chai.expect;
let sinon = require('sinon');
let proxyquire = require('proxyquire').noCallThru();
let _ = require('lodash');

chai.use(require('sinon-chai'));

describe('Skellington', () => {
  let skellington;
  let botkitMock;
  let controllerMock;
  let expressMock;
  let expressAppMock;
  let botMock;
  let connectedBotMock;
  let exitOrig;

  beforeEach(() => {

    connectedBotMock = {'team_info': {id: 'rickandmorty'}, identity: {name: 'butter-passer'}};

    botMock = {
      startRTM: sinon.stub(),
      reply: sinon.stub()
    };

    controllerMock = {
      hears: sinon.stub(),
      spawn: sinon.stub().returns(botMock),
      log: sinon.stub(),
      on: sinon.stub()
    };

    botkitMock = {
      slackbot: sinon.stub().returns(controllerMock)
    };

    expressAppMock = {
      listen: sinon.stub()
    };
    expressMock = sinon.stub().returns(expressAppMock);

    process.env.SLACK_API_TOKEN = 'SNOWBALL';

    exitOrig = process.exit;
    process.exit = sinon.stub();

    skellington = proxyquire('../index', {
      'botkit': botkitMock,
      'express': expressMock
    });
  });

  afterEach(() => {
    process.exit = exitOrig;
  });

  describe('init', function() {

    it('should initialize', () => {
      skellington({});

      expect(botkitMock.slackbot).to.have.been.calledWith({debug: false});
      expect(controllerMock.spawn).to.have.been.calledWith({token: process.env.SLACK_API_TOKEN});
      expect(expressMock).not.to.have.been.called;
      expect(botMock.startRTM).to.be.called;
      expect(controllerMock.on).to.be.calledWithMatch('rtm_close');
    });

    it('should allow passed in configs', () => {
      let storageMock = {};

      skellington({
        slackToken: 'abc123',
        debug: true,
        port: 1234,
        storage: storageMock
      });

      expect(botkitMock.slackbot).to.have.been.calledWith({debug: true, storage: storageMock});
      expect(controllerMock.spawn).to.have.been.calledWith({token: 'abc123'});
      expect(expressAppMock.listen).to.have.been.calledWith(1234);
    });
  });

  describe('startRtm', () => {
    let callback;

    beforeEach(() => {
      skellington({});
      callback = botMock.startRTM.args[0][0];
    });

    it('should exit if there is an error connecting', () => {
      let error = new Error('GAZORPAZORP');

      callback(error);
      expect(controllerMock.log.callCount).to.equal(2);
      expect(controllerMock.log.args[1][0]).to.equal(error);
      expect(process.exit).to.be.calledWith(1);
    });

    describe('initialize plugins', () => {
      let plugin;

      beforeEach(() => {
        botMock.startRTM.reset();
        plugin = {
          init: sinon.stub()
        };
      });

      it('should initialize one plugin not in an array', () => {
        skellington({plugins: plugin, port: 1234});
        botMock.startRTM.args[0][0](null, connectedBotMock);

        expect(plugin.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
      });

      it('should initialize one plugin in an array', () => {
        skellington({plugins: [plugin], port: 1234});
        botMock.startRTM.args[0][0](null, connectedBotMock);

        expect(plugin.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
      });

      it('should initialize multiple plugins', () => {
        let anotherExternalBot = {
          init: sinon.stub()
        };

        skellington({plugins: [plugin, anotherExternalBot], port: 1234});
        botMock.startRTM.args[0][0](null, connectedBotMock);

        expect(plugin.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
        expect(anotherExternalBot.init).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
      });

      it('should not pass an express app if port is not set', () => {
        skellington({plugins: [plugin]});
        botMock.startRTM.args[0][0](null, connectedBotMock);

        expect(plugin.init).to.have.been.calledWith(controllerMock, connectedBotMock, undefined);
      });
    });

    describe('register help listeners', () => {
      let plugin;
      let messageMock;

      beforeEach(() => {
        botMock.startRTM.reset();
        plugin = {
          init: sinon.stub()
        };

        messageMock = {
          team: 'crystal',
          channel: 'blue',
          user: 'persuasion'
        };
      });

      function startRtm(plugins) {
        skellington({plugins: plugins});
        botMock.startRTM.args[0][0](null, connectedBotMock);
      }

      it('should register a listener if no plugins have help text', () => {
        startRtm([plugin]);
        expect(controllerMock.hears).to.have.been.calledOnce;

        let callback = controllerMock.hears.args[0][2];

        callback(botMock, messageMock);
        expect(botMock.reply).to.have.been.calledWithMatch(messageMock, /^I can't help you/);
      });

      it('should register a listener for each plugin with help text', () => {
        plugin.help = {
          command: 'rick',
          text: 'sanchez'
        };

        let anotherPlugin = {
          init: sinon.stub(),
          help: {
            command: 'morty',
            text: 'smith'
          }
        };

        let aThirdPlugin = {init: sinon.stub()};

        startRtm([plugin, anotherPlugin, aThirdPlugin]);
        expect(controllerMock.hears.callCount).to.equal(3); // once for general help, twice for plugins with help text

        // call all the callbacks
        _.forEach(controllerMock.hears.args, function(args) {
          args[2](botMock, messageMock);
        });

        expect(botMock.reply).to.have.been.calledWithMatch(messageMock, /^Here are some things/);
        expect(botMock.reply).to.have.been.calledWith(messageMock, plugin.help.text);
        expect(botMock.reply).to.have.been.calledWith(messageMock, anotherPlugin.help.text);
      });

      it('should handle a plugin help text callback', () => {
        let helpTextCb = sinon.stub();

        plugin.help = {
          command: 'walter',
          text: helpTextCb
        };

        botMock.identity = {name: 'rickandmorty'};

        startRtm([plugin]);
        // call all the callbacks
        _.forEach(controllerMock.hears.args, function(args) {
          args[2](botMock, messageMock);
        });

        expect(helpTextCb).to.have.been.calledWith({
          botName: botMock.identity.name,
          team: messageMock.team,
          channel: messageMock.channel,
          user: messageMock.user
        });
      });
    });
  });

  describe('rtm_close', () => {
    let callback;

    beforeEach(() => {
      skellington({});

      controllerMock.log.reset();
      botMock.startRTM.reset();
      botMock.startRTM.yields(null);

      callback = controllerMock.on.args[0][1];
    });

    it('should reconnect', () => {
      callback();
      expect(controllerMock.log).to.be.calledOnce;
      expect(botMock.startRTM).to.be.calledOnce;
    });

    it('should exit if reconnect fails', () => {
      let error = new Error('GAZORPAZORP');

      botMock.startRTM.yields(error);

      callback();
      expect(botMock.startRTM).to.be.calledOnce;
      expect(controllerMock.log.callCount).to.equal(3);
      expect(controllerMock.log.args[2][0]).to.equal(error);
      expect(process.exit).to.be.calledWith(1);
    });
  });
});
