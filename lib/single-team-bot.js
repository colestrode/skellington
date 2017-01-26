'use strict'

const lifecycle = require('./plugin-lifecycle')
const utils = require('./utils')
const logger = require('./logger')

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
      controller.on('rtm_reconnect_failed', (bot, err) => rtmConnectFailed(err, config, bot))
      lifecycle.initialize(config.plugins, controller, connectedBot)
      lifecycle.botConnected(config.plugins, controller, connectedBot)
      return
    }

    rtmConnectFailed(err, config)
  })
}

function rtmConnectFailed (err, config, bot) {
  logger.error(`Bot ${bot ? utils.identity(bot) : 'UNKNOWN'} could not connect to the RTM API. Process will exit. If you want the process to keep running, set exitOnRtmFailure: true in your skellington config.`, err)

  if (config.exitOnRtmFailure !== false) {
    process.exit(1)
  }
}
