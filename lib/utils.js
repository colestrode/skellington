'use strict'

/**
 * Returns a String version of this bot's identity.
 * Useful for logging messages.
 *
 * @param bot
 * @returns {String} A stringified version of the bot's identity
 */
module.exports.identity = (bot) => {
  return JSON.stringify({name: bot.identity.name, id: bot.identity.id})
}
