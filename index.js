'use strict';

let Botkit = require('botkit');
let express = require('express');
let _ = require('lodash');

module.exports = (config) => {
  _.defaults(config, {debug: false, plugins: [], slackToken: process.env.SLACK_API_TOKEN});

  if (!Array.isArray(config.plugins)) {
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
      return process.exit(1); // need the return for tests which mock our process.exit
    }

    _.forEach(config.plugins, (plugin) => {
      plugin.init(controller, connectedBot, server);
    });

    addHelpListeners(controller, connectedBot.identity.name, config.plugins);
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
   * Adds all help listeners for plugins
   *
   * @param controller
   * @param botName
   * @param plugins
   */
  function addHelpListeners(controller, botName, plugins) {
    let helpCommands = [];

    _.forEach(plugins, function(plugin) {
      if (plugin.help && plugin.help.text && plugin.help.command) {
        helpCommands.push('`@' + botName + ' help ' + plugin.help.command + '`');
        registerHelpListener(controller, plugin.help);
      }
    });
    helpCommands = helpCommands.join('\n');

    controller.hears('^help$', 'direct_mention,direct_message', function(bot, message) {
      if (!helpCommands.length) {
        return bot.reply(message, 'I can\'t help you with anything right now. I still like you though :heart:');
      }

      return bot.reply(message, 'Here are some things I can help you with:\n' + helpCommands);
    });
  }

  /**
   * Adds a single help listener for a plugin
   * @param controller
   * @param helpInfo
   */
  function registerHelpListener(controller, helpInfo) {
    controller.hears('^help ' + helpInfo.command + '$', 'direct_mention,direct_message', function(bot, message) {
      let replyText = helpInfo.text;

      if (typeof helpInfo.text === 'function') {
        let helpOpts = _.merge({botName: bot.identity.name}, _.pick(message, ['team', 'channel', 'user']));

        replyText = helpInfo.text(helpOpts);
      }

      bot.reply(message, replyText);
    });
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
