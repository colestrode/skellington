'use strict'

const lifecycle = require('./plugin-lifecycle')
const utils = require('./utils')
const _ = require('lodash')

/**
 * Starts a single-team bot, i.e., not a Slack app (no slash commands, no incoming webhooks, etc.)
 *
 * @param config
 * @param controller
 */
module.exports.start = (controller, config) => {
  controller.spawn({
    token: config.slackToken
  }).startRTM((err, connectedBot) => {
    if (!err) {
      controller.on('rtm_close', _.partial(rtmCloseListener, controller, config))
      lifecycle.initialize(config.plugins, controller, connectedBot)
      lifecycle.botConnected(config.plugins, controller, connectedBot)
      return
    }

    utils.logError(controller, err, 'Could not connect bot to RTM')
    if (config.exitOnRtmFailure !== false) {
      return process.exit(1)
    }
  })
}

function rtmCloseListener (controller, config, bot) {
  controller.log(`rtm closed, attempting to reconnect bot ${utils.identity(bot)}`)

  bot.startRTM((err) => {
    if (!err) {
      return controller.log(`reconnected bot ${utils.identity(bot)}`)
    }

    utils.logError(controller, err, `Could not re-connect bot to RTM ${utils.identity(bot)}`)

    if (config.exitOnRtmFailure !== false) {
      process.exit(1)
    }
  })
}
