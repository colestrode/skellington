'use strict'

/**
 * Logs an error to the `controller.log.error` method
 *
 * @param controller
 * @param err {Error} The error object to log
 * @param message {String} A user-facing error message
 */
module.exports.logError = (controller, err, message) => {
  controller.log.error(message)
  controller.log.error(err)
}

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
