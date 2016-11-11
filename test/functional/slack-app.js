'use strict'

/* eslint-disable no-unused-vars */

/**
 * Fires up a Slack app for testing.
 * You will need to use a project like localtunnel (https://www.npmjs.com/package/localtunnel)
 * to expose your locally running app to Slack for the OAuth and slash command flow.
 *
 * Required env-vars
 * CLIENT_ID: You Slack client ID
 * CLIENT_SECRET: Your Slack client Secret
 * PORT: The port to run the bot on
 */
const instance = require('../../index')({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  port: process.env.PORT,
  debug: true,
  successRedirectUri: 'https://www.google.com',
  debugOptions: {
    formatter: function (message) {
      return `slackApp: ${message.text} ${message.skellington.file}`
    }
  },
  botkit: {
    json_file_store: './db-app/',
    debug: false
  },
  plugins: [{init: init, botConnected: botConnected}, {init: anotherInit}]
})

function init (controller) {
  controller.on('slash_command', (bot, message) => {
    if (message.command !== '/rick') {
      return true
    }

    bot.replyPrivate(message, 'WUBALUBDUBDUB')
    return false // stop event propagation
  })

  controller.hears('hello', 'direct_message', (bot, message) => {
    bot.reply(message, 'WHAT?')
  })
}

function anotherInit (controller) {
  // register a second slash command
  controller.on('slash_command', (bot, message) => {
    if (message.command !== '/morty') {
      return true
    }

    bot.replyPrivate(message, `I don't know about this Rick!`)
    return false // stop event propagation
  })
}

function botConnected (controller) {
  controller.log('bot connected! this would be a good time to dm somebody or post to general or build a cache or something')
}
