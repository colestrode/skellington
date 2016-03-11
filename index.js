'use strict';

let Botkit = require('botkit');
let _ = require('lodash');

module.exports = function(config) {
  _.defaults(config, {debug: false, bots: [], slackToken: process.env.SLACK_API_TOKEN});

  if(typeof config.bots === 'function') {
    config.bots = [config.bots];
  }

  let slackbotConfig = {
    debug: config.debug
  };

  if (config.storage) {
    slackbotConfig.storage = config.storage;
  }

  let controller = Botkit.slackbot(slackbotConfig);

  // connect the bot to a stream of messages
  let bot = controller.spawn({
    token: config.slackToken
  });

  bot.startRTM(function(err, connectedBot) {
    if (err) {
      logError(controller, err, 'Error connecting to RTM');
      process.exit(1);
    }

    _.forEach(config.bots, function(bot) {
      bot(controller, connectedBot);
    });
  });

  // restart if disconnected
  controller.on('rtm_close', function() {
    controller.log('attempting to reconnect');
    bot.startRTM(function(err) {
      if (err) {
        logError(controller, err, 'could not reconnect to the rtm, shutting down');
        process.exit(1);
      }
    });
  });

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
