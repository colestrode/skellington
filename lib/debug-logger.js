'use strict'

const logger = require('./logger')

module.exports.addLogger = (controller, config) => {
  const hearsOrig = controller.hears.bind(controller)
  const formatter = config.formatter || defaultFormatter

  // override controller.hears to add a logging middleware to each call
  controller.hears = function (patterns, events, middleware, cb) {
    // calledFrom must be detected in controller.hears, this is the method that will be called externally so will report correctly
    const calledFrom = getCallerFile()

    if (!cb) {
      cb = middleware
      middleware = controller.hears_test.bind(controller) // this is the default botkit test for middleware
    }

    hearsOrig(patterns, events, loggingMiddleware, cb)

    function loggingMiddleware (patterns, message) {
      // does this message pass the original middleware?
      if (!middleware(patterns, message)) return false

      // add skellington metadata that will be available in the log function formatter
      message.skellington = {
        file: calledFrom,
        config: config
      }

      logger.info(formatter(message))
      return true
    }
  }
}

/**
 * Default log message formatter
 * @param message
 * @returns {string}
 */
function defaultFormatter (message) {
  return `team: ${message.team} channel: ${message.channel} user: ${message.user} text: ${message.text}`
}

/**
 * Call this method to get the file path that contains the method that called the method this method was called in. simple.
 * Shamelessly cribbed from http://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
 * @returns {string}
 */
function getCallerFile () {
  const prepareStackTraceOrig = Error.prepareStackTrace
  let callerfile = 'unknown'

  try {
    Error.prepareStackTrace = function (error, stack) { return stack } // eslint-disable-line handle-callback-err

    const err = new Error()
    let currentfile = err.stack.shift().getFileName()

    // pop off the error stack until we find a file that is not this one :)
    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName()
      if (currentfile !== callerfile) break
    }
  } finally {
    Error.prepareStackTrace = prepareStackTraceOrig
  }

  return callerfile
}

