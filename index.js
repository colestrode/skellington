'use strict';

let Botkit = require('botkit');
let express = require('express');
let _ = require('lodash');

module.exports = (config) => {
  _.defaults(config, {debug: false, plugins: [], slackToken: process.env.SLACK_API_TOKEN});

  if (typeof config.plugins === 'function') {
    config.plugins = [config.plugins];
  }

  let slackbotConfig = {
    debug: config.debug
  };

  if (config.storage) {
    slackbotConfig.storage = config.storage;
  }

  let server;
  let controller = Botkit.slackbot(slackbotConfig);
  let bot = controller.spawn({
    token: config.slackToken
  });

  if (config.port) {
    server = startServer(config, controller);
  }

  bot.startRTM((err, connectedBot) => {
    if (err) {
      logError(controller, err, 'Error connecting to RTM');
      process.exit(1);
    }

    _.forEach(config.plugins, (plugin) => {
      plugin(controller, connectedBot, server);
    });
  });

  // restart if disconnected
  controller.on('rtm_close', () => {
    controller.log('rtm closed, attempting to reconnect');
    bot.startRTM((err) =>{
      if (err) {
        logError(controller, err, 'could not reconnect to the rtm, shutting down');
        process.exit(1);
      }
    });
  });

  /**
   * Starts an express server for slash commands
   *
   * @param config
   * @param contoller
   * @returns {*}
   */
  function startServer(config, contoller) {
    let expressApp = express();

    expressApp.listen(config.port);
    contoller.log('listening on port ' + config.port);
    return expressApp;
  }

  /**
   * Convenience method to log errors
   *
   * @param controller
   * @param err
   * @param message
   */
  function logError(controller, err, message) {
    controller.log(message);
    controller.log(err);
  }
};
