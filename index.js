'use strict'

const Botkit = require('botkit')
const _ = require('lodash')
const debugLogger = require('./lib/debug-logger')
const server = require('./lib/server')
const help = require('./lib/help')
const utils = require('./lib/utils')

const botkitDefaults = {
  debug: false,
  status_optout: true
}

module.exports = (cfg) => {
  const instance = {}
  const config = _.cloneDeep(cfg)
  const controller = Botkit.slackbot(getSlackbotConfig(config))

  formatConfig(config, controller)

  // start debugging before help listeners are added
  if (config.debug) {
    instance.__config = config // expose internal config during debug mode
    debugLogger.addLogger(controller, config.debugOptions)
  }

  help.addHelpListeners(controller, config.plugins)

  if (config.port) {
    server.start(controller, config)
  }

  if (config.isSlackApp) {
    require('./lib/slack-app').start(controller, config)
  } else {
    require('./lib/single-team-bot').start(controller, config)
  }

  return instance
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
  config.connectedTeams = new Set()

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
    utils.logError(controller, new Error('Missing configuration. Config must include either slackToken AND/OR clientId, clientSecret, and port'))
    process.exit(1)
  }
}

