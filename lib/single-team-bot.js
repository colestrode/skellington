'use strict'

const lifecycle = require('./plugin-lifecycle')
const utils = require('./utils')
const logger = require('./logger')
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

    logger.error(`Could not connect bot to RTM`, err)
    if (config.exitOnRtmFailure !== false) {
      return process.exit(1)
    }
  })
}

function rtmCloseListener (controller, config, bot) {
  logger.info(`rtm closed, attempting to reconnect bot ${utils.identity(bot)}`)

  bot.startRTM((err) => {
    if (!err) {
      return logger.info(`reconnected bot ${utils.identity(bot)}`)
    }

    logger.error(`Could not re-connect bot to RTM ${utils.identity(bot)}`, err)

    if (config.exitOnRtmFailure !== false) {
      process.exit(1)
    }
  })
}
