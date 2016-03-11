'use strict';

let Botkit = require('botkit');
let _ = require('lodash');


module.exports = function(config) {
  _.defaults(config, {debug: false, bots: []});
  let slackbotConfig = {
    debug: config.debug
  };

  if (config.storage) {
    slackbotConfig.storage = config.storage;
  }

  var controller = Botkit.slackbot(slackbotConfig);

  // connect the bot to a stream of messages
  var bot = controller.spawn({
    token: config.slackToken
  });

  bot.startRTM(function(err, connectedBot) {
    if (err) {
      logError(controller, err, 'Error connecting to RTM');
      process.exit(1);
    }

    _.forEach(bots(config), function(bot) {
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
   * Pulls bots from config and from package.json
   * @param config
   * @returns {Array.<T>}
   */
  function bots(config) {
    let packageBots = _.map(require('package.json').skellington, function(module) {
      return require(module);
    });

    return config.bots.concat(packageBots);
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