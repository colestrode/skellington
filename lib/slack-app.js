'use strict'

const lifecycle = require('./plugin-lifecycle')
const utils = require('./utils')
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
      utils.logError(controller, err, 'Could not reconnect teams')
      return process.exit(1)
    }

    _.forEach(teams, (team) => {
      if (!team.bot) return
      controller.spawn(team).startRTM(_.partial(onStartRtm, controller, config, team))
    })
  })

  controller.on('create_bot', _.partial(createBot, controller, config))
  controller.on('rtm_close', _.partial(onRtmClose, controller, config))
}

function createBot (controller, config, bot) {
  const teamId = bot.config.id

  // keep track of bots
  if (!config.connectedTeams.has(teamId)) {
    bot.startRTM((err, connectedBot) => {
      if (err) {
        return utils.logError(controller, err, 'Could not connect bot to RTM')
      }

      config.connectedTeams.add(connectedBot.team_info.id)

      lifecycle.botConnected(config.plugins, controller, connectedBot)
      controller.log(`added bot ${utils.identity(connectedBot)}`)
    })
  }
}

function onRtmClose (controller, config, bot) {
  controller.log(`rtm closed, attempting to reconnect bot ${utils.identity(bot)}`)

  bot.startRTM((err) => {
    if (!err) {
      return controller.log(`reconnected bot ${utils.identity(bot)}`)
    }

    utils.logError(controller, err, `Could not re-connect bot to RTM ${utils.identity(bot)}`)
    config.connectedTeams.delete(bot.team_info.id)
  })
}

function onStartRtm (controller, config, team, err, connectedBot) {
  if (!err) {
    config.connectedTeams.add(team.id)
    lifecycle.botConnected(config.plugins, controller, connectedBot)
    controller.log('bot added from storage', connectedBot.identity.id)
    return
  }

  utils.logError(controller, err, `Could not reconnect bot to team ${team.id}`)
  if (err === 'account_inactive' || err === 'invalid_auth') {
    controller.log(`authentication revoked for for ${team.id}`)
    delete team.bot
    controller.storage.teams.save(team, function () {}) // fail silently
  }
}
