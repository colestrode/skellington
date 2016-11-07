'use strict'

/* eslint-disable no-unused-vars */

/**
 * Fires up a single-team bot for testing.
 *
 * Required env-vars
 * SLACK_TOKEN: a valid Slack bot token
 */
const instance = require('../../index')({
  debug: false,
  debugOptions: {
    formatter: function (message) {
      return `slackApp: ${message.text} ${message.skellington.file}`
    }
  },
  botkit: {
    json_file_store: './db-single/',
    debug: false
  },
  slackToken: process.env.SLACK_TOKEN,
  plugins: [{init: init, botConnected: botConnected}]
})

function init (controller) {
  controller.hears('hello', 'direct_message', (bot, message) => {
    bot.reply(message, 'GO CUBSSSS')
  })
}

function botConnected (controller) {
  controller.log('bot connected! this would be a good time to dm somebody or post to general or build a cache or something')
}
