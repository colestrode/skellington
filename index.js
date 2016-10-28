'use strict'

const Botkit = require('botkit')
const _ = require('lodash')
const connectedBots = new Set()

module.exports = (config) => {
  let controller = Botkit.slackbot(getSlackbotConfig(config))

  validateConfig(config, controller)
  addHelpListeners(controller, config.plugins)

  if (config.port) {
    startServer(controller, config.port)
  }

  if (config.clientId && config.clientSecret) {
    startSlackApp(config, controller)
  } else if (config.slackToken) {
    startSingleBot(config, controller)
  }

  // used for slack apps that will connect multiple bots
  controller.on('create_bot', (bot) => {
    // keep track of bots
    if (!connectedBots.has(bot)) {
      startRtm(controller, bot, () => {
        connectedBots.add(bot)
        botConnected(config.plugins, controller, bot)
        controller.log('bot added!')
      })
    }
  })

  // restart if disconnected
  controller.on('rtm_close', (bot) => {
    controller.log('rtm closed, attempting to reconnect')
    startRtm(controller, bot)
  })
}

/**
 * Validates that required params are passed, will exit the process with an error if required config is missing
 *
 * @param config
 * @param controller
 */
function validateConfig (config, controller) {
  _.defaults(config, {debug: false, plugins: [], status_optout: true})

  if (!Array.isArray(config.plugins)) {
    config.plugins = [config.plugins]
  }

  if (!config.slackToken && !(config.clientId && config.clientSecret && config.port)) {
    logError(controller, new Error('Missing configuration. Config must include either slackToken AND/OR clientId, clientSecret, and port'))
    process.exit(1)
  }
}

/**
 * Given the passed config, returns an object with values relevant to configuring a Botkit slack bot
 *
 * @param config
 * @returns {{}}
 */
function getSlackbotConfig (config) {
  // omit config values not needed to configure a slackbot
  return _.omit(config, ['clientId', 'clientSecret', 'plugins', 'redirectUrl', 'scopes', 'slackToken'])
}

/**
 * Starts a single-team bot, i.e., not a Slack app (no slash commands, no incoming webhooks, etc.)
 *
 * @param config
 * @param controller
 */
function startSingleBot (config, controller) {
  let bot = controller.spawn({
    token: config.slackToken
  })

  startRtm(controller, bot, (connectedBot) => {
    connectedBot.add(connectedBot)
    initializePlugins(config.plugins, controller, connectedBot)
    botConnected(config.plugins, controller, connectedBot)
  })
}

/**
 * Starts a slack app and adds support for a incoming webhooks, slash commands, and bot users that can be invited to multiple teams
 *
 * @param config
 * @param controller
 */
function startSlackApp (config, controller) {
  let scopes = _.isArray(config.scopes) ? config.scopes : ['bot']

  controller.configureSlackApp({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri, // optional
    scopes: _.uniq(scopes)
  })

  initializePlugins(config.plugins, controller, null)

  controller.storage.teams.all((err, teams) => {
    if (err) {
      logError(controller, err, 'Could not reconnect teams')
      return process.exit(1)
    }

    _.forEach(teams, (team) => {
      if (!team.bot) return

      let bot = controller.spawn(team)
      startRtm(controller, bot, () => {
        connectedBots.add(bot)
        botConnected(config.plugins, controller, bot)
        controller.log('bot added from storage')
      })
    })
  })
}

/**
 * Starts an express server for slash commands, incoming webhooks, and OAuth flow
 *
 * @param config
 * @param controller
 */
function startServer (controller, port) {
  controller.setupWebserver(port, (err) => {
    if (err) {
      return logError(controller, err, `Error setting up server on port ${port}`)
    }

    controller.createWebhookEndpoints(controller.webserver) // synchronous method

    controller.createOauthEndpoints(controller.webserver, (err, req, res) => {
      if (err) {
        logError(controller, err, `Error setting up OAuth endpoints`)
        return res.status(500).send({message: `Error setting up OAuth endpoints`})
      }
      // TODO need to redirect
      res.send({message: `Success!`})
    })
  })
}

/**
 * Adds all help listeners for plugins
 *
 * @param controller
 * @param botName
 * @param plugins
 */
function addHelpListeners (controller, plugins) {
  _.forEach(plugins, (plugin) => {
    if (_.get(plugin, 'help.text') && _.get(plugin, 'help.command')) {
      registerHelpListener(controller, plugin.help)
    }
  })

  controller.hears('^help$', 'direct_mention,direct_message', (bot, message) => {
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
 *
 * @param controller
 * @param helpInfo
 */
function registerHelpListener (controller, helpInfo) {
  controller.hears('^help ' + helpInfo.command + '$', 'direct_mention,direct_message', (bot, message) => {
    let replyText = helpInfo.text

    if (typeof helpInfo.text === 'function') {
      let helpOpts = _.merge({botName: bot.identity.name}, _.pick(message, ['team', 'channel', 'user']))

      replyText = helpInfo.text(helpOpts)
    }

    bot.reply(message, replyText)
  })
}

/**
 * Starts an RTM connection for a bot
 *
 * @param controller
 * @param bot
 * @param cb
 */
function startRtm (controller, bot, cb) {
  cb = cb || function () {}

  bot.startRTM((err, connectedBot) => {
    if (err) {
      logError(controller, err, 'Error connecting to RTM')
      return process.exit(1) // need the return for tests which mock our process.exit
    }

    cb(connectedBot)
  })
}

/**
 * Initializes plugins, called on Skellington initialization
 *
 * @param plugins
 * @param controller
 * @param bot
 */
function initializePlugins (plugins, controller, bot) {
  bot = bot || null // bot may be undefined for multi-teams
  _.forEach(plugins, (plugin) => {
    if (_.isFunction(plugin.init)) {
      // this interface is deprecated, but keep it for legacy bots
      try {
        plugin.init(controller, bot, controller.webserver)
      } catch (err) {
        logError(controller, err, 'error calling init on plugin')
      }
    }
  })
}

/**
 * Calls plugin botConnected callbacks when a bot is added
 *
 * @param plugins
 * @param controller
 * @param bot
 */
function botConnected (plugins, controller, bot) {
  _.forEach(plugins, (plugin) => {
    if (_.isFunction(plugin.botConnected)) {
      try {
        plugin.botConnected(controller, bot)
      } catch (err) {
        logError(controller, err, 'error calling botConnected on plugin')
      }
    }
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
