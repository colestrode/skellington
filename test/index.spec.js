'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru();

chai.use(require('sinon-chai'));

describe('Skellington', function() {
  var skellington;
  var botkitMock;
  var controllerMock;
  var expressMock;
  var expressAppMock;
  var botMock;
  var connectedBotMock;
  var exitOrig;

  beforeEach(function() {

    connectedBotMock = {'team_info': {id: 'rickandmorty'}};

    botMock = {
      startRTM: sinon.stub()
    };

    controllerMock = {
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

  afterEach(function() {
    process.exit = exitOrig;
  });

  describe('init', function() {

    it('should initialize', function() {
      skellington({});

      expect(botkitMock.slackbot).to.have.been.calledWith({debug: false});
      expect(controllerMock.spawn).to.have.been.calledWith({token: process.env.SLACK_API_TOKEN});
      expect(expressMock).to.have.been.called;
      expect(expressAppMock.listen).to.have.been.calledWith(8080);
      expect(botMock.startRTM).to.be.called;
      expect(controllerMock.on).to.be.calledWithMatch('rtm_close');
    });

    it('should allow passed in configs', function() {
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

  describe('startRtm', function() {
    var callback;

    beforeEach(function() {
      skellington({});
      callback = botMock.startRTM.args[0][0];
    });

    it('should start rtm', function() {
      callback(null, connectedBotMock);
      expect(controllerMock.log).to.be.calledOnce;
    });

    it('should exit if there is an error connecting', function() {
      var error = new Error('GAZORPAZORP');

      callback(error);
      expect(controllerMock.log.callCount).to.equal(3);
      expect(controllerMock.log.args[2][0]).to.equal(error);
      expect(process.exit).to.be.calledWith(1);
    });

    describe('initialize bots', function() {
      let externalBot;

      beforeEach(function() {
        botMock.startRTM.reset();
        externalBot = sinon.stub();
      });

      it('should initialize one bot not in an array', function() {
        skellington({bots: externalBot});
        botMock.startRTM.args[0][0](null, connectedBotMock);

        expect(externalBot).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
      });

      it('should initialize one bot in an array', function() {
        skellington({bots: [externalBot]});
        botMock.startRTM.args[0][0](null, connectedBotMock);

        expect(externalBot).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
      });

      it('should initialize multiple bots', function() {
        let anotherExternalBot = sinon.stub();

        skellington({bots: [externalBot, anotherExternalBot]});
        botMock.startRTM.args[0][0](null, connectedBotMock);

        expect(externalBot).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
        expect(anotherExternalBot).to.have.been.calledWith(controllerMock, connectedBotMock, expressAppMock);
      });
    });
  });

  describe('rtm_close', function() {
    var callback;

    beforeEach(function() {
      skellington({});

      controllerMock.log.reset();
      botMock.startRTM.reset();
      botMock.startRTM.yields(null);

      callback = controllerMock.on.args[0][1];
    });

    it('should reconnect', function() {
      callback();
      expect(controllerMock.log).to.be.calledOnce;
      expect(botMock.startRTM).to.be.calledOnce;
    });

    it('should exit if reconnect fails', function() {
      var error = new Error('GAZORPAZORP');

      botMock.startRTM.yields(error);

      callback();
      expect(botMock.startRTM).to.be.calledOnce;
      expect(controllerMock.log.callCount).to.equal(3);
      expect(controllerMock.log.args[2][0]).to.equal(error);
      expect(process.exit).to.be.calledWith(1);
    });
  });
});
