'use strict'

const Botkit = require('botkit')
const _ = require('lodash')

module.exports = (config) => {
  _.defaults(config, {debug: false, plugins: []})

  if (!Array.isArray(config.plugins)) {
    config.plugins = [config.plugins]
  }

  let slackbotConfig = {
    debug: config.debug
  }

  if (config.storage) {
    slackbotConfig.storage = config.storage
  }

  let controller = Botkit.slackbot(slackbotConfig)

  addHelpListeners(controller, config.plugins)
  startServer(config, controller)

  let bot = controller.spawn({
    token: config.slackToken
  })

  startRtm(config, controller, bot)

  // restart if disconnected
  controller.on('rtm_close', (bot) => {
    controller.log('rtm closed, attempting to reconnect')
    bot.startRTM((err) => {
      if (err) {
        logError(controller, err, 'could not reconnect to the rtm, shutting down')
        process.exit(1)
      }
    })
  })
}

/**
 * Starts an express server for slash commands
 *
 * @param config
 * @param controller
 */
function startServer (config, controller) {
  // TODO port will be required for multi-team auth
  if (config.port) {
    controller.setupWebserver(config.port)
  }
}

/**
 * Adds all help listeners for plugins
 *
 * @param controller
 * @param botName
 * @param plugins
 */
function addHelpListeners (controller, plugins) {
  _.forEach(plugins, function (plugin) {
    if (_.get(plugin, 'help.text') && _.get(plugin, 'help.command')) {
      registerHelpListener(controller, plugin.help)
    }
  })

  controller.hears('^help$', 'direct_mention,direct_message', function (bot, message) {
    let helpCommands = _.chain(plugins)
      .filter((plugin) => !!_.get(plugin, 'help.command'))
      .map((plugin) => '`@' + bot.identity.name + ' help ' + _.get(plugin, 'help.command') + '`')
      .value()
      .join('\n')

    if (!helpCommands.length) {
      return bot.reply(message, 'I can\'t help you with anything right now. I still like you though :heart:')
    }

    return bot.reply(message, 'Here are some things I can help you with:\n' + helpCommands)
  })
}

/**
 * Adds a single help listener for a plugin
 * @param controller
 * @param helpInfo
 */
function registerHelpListener (controller, helpInfo) {
  controller.hears('^help ' + helpInfo.command + '$', 'direct_mention,direct_message', function (bot, message) {
    let replyText = helpInfo.text

    if (typeof helpInfo.text === 'function') {
      let helpOpts = _.merge({botName: bot.identity.name}, _.pick(message, ['team', 'channel', 'user']))

      replyText = helpInfo.text(helpOpts)
    }

    bot.reply(message, replyText)
  })
}

function startRtm (config, controller, bot) {
  bot.startRTM((err, connectedBot) => {
    if (err) {
      logError(controller, err, 'Error connecting to RTM')
      return process.exit(1) // need the return for tests which mock our process.exit
    }

    _.forEach(config.plugins, (plugin) => {
      plugin.init(controller, connectedBot, controller.webserver)
    })
  })
}

/**
 * Convenience method to log errors
 *
 * @param controller
 * @param err
 * @param message
 */
function logError (controller, err, message) {
  controller.log(message)
  controller.log(err)
}
