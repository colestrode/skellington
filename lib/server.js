'use strict'

const utils = require('./utils')

/**
 * Starts an express server for slash commands, incoming webhooks, and OAuth flow
 *
 * @param controller
 * @param config
 */
module.exports.start = (controller, config) => {
  controller.setupWebserver(config.port, (err) => {
    if (err) {
      return utils.logError(controller, err, `Error setting up server on port ${config.port}`)
    }

    controller.createWebhookEndpoints(controller.webserver) // synchronous method

    controller.createOauthEndpoints(controller.webserver, (err, req, res) => {
      if (err) {
        utils.logError(controller, err, `Error setting up OAuth endpoints`)
        return res.status(500).send({message: `Error setting up OAuth endpoints`})
      }

      // TODO need to redirect
      res.status(200).send({message: `Success!`})
    })
  })
}
