'use strict'

const Botkit = require('botkit')
const _ = require('lodash')
const debugLogger = require('./lib/debug-logger')
const connectedTeams = new Set()
const botkitDefaults = {
  debug: false,
  status_optout: true
}

module.exports = (cfg) => {
  const config = _.cloneDeep(cfg)
  const controller = Botkit.slackbot(getSlackbotConfig(config))

  formatConfig(config, controller)

  // start debugging before help listeners are added
  if (config.debug) {
    module.exports.__config = config // expose internal config during debug mode
    debugLogger(controller, config.debugOptions)
  }

  addHelpListeners(controller, config.plugins)

  if (config.port) {
    startServer(controller, config.port)
  }

  if (config.isSlackApp) {
    startSlackApp(config, controller)
  } else {
    startSingleBot(config, controller)
  }

  // used for slack apps that will connect multiple bots
  controller.on('create_bot', (bot) => {
    const teamId = bot.config.id

    // keep track of bots
    if (!connectedTeams.has(teamId)) {
      bot.startRTM((err, connectedBot) => {
        if (err) {
          return logError(controller, err, 'Could not connect bot to RTM')
        }

        connectedTeams.add(connectedBot.team_info.id)

        botConnected(config.plugins, controller, connectedBot)
        controller.log(`added bot ${identity(connectedBot)}`)
      })
    }
  })

  // restart if disconnected
  controller.on('rtm_close', (bot) => {
    controller.log(`rtm closed, attempting to reconnect bot ${identity(bot)}`)

    bot.startRTM((err) => {
      if (!err) {
        return controller.log(`reconnected bot ${identity(bot)}`)
      }

      logError(controller, err, `Could not re-connect bot to RTM ${identity(bot)}`)

      if (config.isSlackApp) {
        connectedTeams.delete(bot.team_info.id)
      } else if (config.exitOnRtmFailure !== false) {
        process.exit(1)
      }
    })
  })
}

function identity (bot) {
  return JSON.stringify({name: bot.identity.name, id: bot.identity.id})
}

/**
 * Gets the config object for Botkit.slackbot
 * @param config
 */
function getSlackbotConfig (config) {
  return _.defaults(config.botkit, {debug: !!config.debug}, botkitDefaults)
}

/**
 * Formats config values so they are normalized, will exit the process with an error if required config is missing
 *
 * @param config
 * @param controller
 */
function formatConfig (config, controller) {
  _.defaults(config, {debug: false, plugins: []})

  config.debugOptions = config.debugOptions || {}

  if (!Array.isArray(config.plugins)) {
    config.plugins = [config.plugins]
  }

  config.scopes = _.chain(config.plugins)
    .map('scopes')
    .flatten()
    .concat(_.isArray(config.scopes) ? config.scopes : [])
    .uniq()
    .remove(_.isString.bind(_))
    .value()

  config.isSlackApp = !config.slackToken

  if (!config.slackToken && !(config.clientId && config.clientSecret && config.port)) {
    logError(controller, new Error('Missing configuration. Config must include either slackToken AND/OR clientId, clientSecret, and port'))
    process.exit(1)
  }
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

  bot.startRTM((err, connectedBot) => {
    if (err) {
      logError(controller, err, 'Could not connect bot to RTM') // what information could we log??
      if (config.exitOnRtmFailure !== false) {
        return process.exit(1)
      }
      return
    }

    connectedTeams.add(bot.team_info.id)
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
  controller.configureSlackApp({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri, // optional
    state: config.state,
    scopes: config.scopes
  })

  initializePlugins(config.plugins, controller, null)

  controller.storage.teams.all((err, teams) => {
    if (err) {
      logError(controller, err, 'Could not reconnect teams')
      return process.exit(1)
    }

    _.forEach(teams, (team) => {
      if (!team.bot) return

      controller.spawn(team).startRTM((err, connectedBot) => {
        if (!err) {
          connectedTeams.add(team.id)
          botConnected(config.plugins, controller, connectedBot)
          controller.log('bot added from storage', connectedBot.identity.id)
          return
        }

        logError(controller, err, `Could not reconnect bot to team ${team.id}`)
        if (err === 'account_inactive' || err === 'invalid_auth') {
          controller.log(`authentication revoked for for ${team.id}`)
          delete team.bot
          controller.storage.teams.save(team, function () {}) // fail silently
        }
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
      res.status(200).send({message: `Success!`})
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
      .map((plugin) => `\`@${bot.identity.name} help ${_.get(plugin, 'help.command')}\``)
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
