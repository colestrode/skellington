'use strict'

const lifecycle = require('./plugin-lifecycle')
const utils = require('./utils')
const logger = require('./logger')
const _ = require('lodash')

/**
 * Starts a slack app and adds support for a incoming webhooks, slash commands, and bot users that can be invited to multiple teams
 *
 * @param controller
 * @param config
 */
module.exports.start = (controller, config) => {
  controller.configureSlackApp({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri, // optional
    state: config.state,
    scopes: config.scopes
  })

  lifecycle.initialize(config.plugins, controller, null)

  controller.storage.teams.all((err, teams) => {
    if (err) {
      logger.error(`Could not reconnect teams`, err)
      return process.exit(1)
    }

    _.forEach(teams, (team) => {
      if (!team.bot) return
      controller.spawn(team).startRTM(_.partial(onStartRtm, controller, config, team))
    })
  })

  controller.on('create_bot', _.partial(createBot, controller, config))
  controller.on('rtm_reconnect_failed', (bot, err) => rtmReconnectFailed(config, bot, err))
}

function createBot (controller, config, bot) {
  const teamId = bot.config.id

  // keep track of bots
  if (!config.connectedTeams.has(teamId)) {
    bot.startRTM((err, connectedBot) => {
      if (err) {
        return logger.error('Could not connect bot to RTM', err)
      }

      config.connectedTeams.add(connectedBot.team_info.id)

      lifecycle.botConnected(config.plugins, controller, connectedBot)
      logger.info(`added bot ${utils.identity(connectedBot)}`)
    })
  }
}

function rtmReconnectFailed (config, bot, err) {
  logger.error(`Bot ${utils.identity(bot)} could not connect to the RTM API.`, err)
  config.connectedTeams.delete(bot.team_info.id)
}

function onStartRtm (controller, config, team, err, connectedBot) {
  if (!err) {
    config.connectedTeams.add(team.id)
    lifecycle.botConnected(config.plugins, controller, connectedBot)
    logger.info('bot added from storage', connectedBot.identity.id)
    return
  }

  logger.error(`Could not reconnect bot to team ${team.id}`, err)
  if (err === 'account_inactive' || err === 'invalid_auth') {
    logger.info(`authentication revoked for for ${team.id}`)
    delete team.bot
    controller.storage.teams.save(team, function () {}) // fail silently
  }
}
