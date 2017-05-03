'use strict'

const _ = require('lodash')
const express = require('express')
let logger = require('skellington-logger')('skellington')

module.exports = (cfg) => {
  const config = _.defaults(_.cloneDeep(cfg), {debug: false, plugins: [], engines: []})
  const instance = { __config: config }

  if (config.logger) {
    logger = config.logger
  }

  startServer(config)
  startYourEngines(config)
  return instance
}

function startServer(config) {
  if (config.port) {
    config.server = express();
    config.server.listen(config.port, () => logger.info(`server listening on port ${config.port}`))
  }
}

function startYourEngines(config) {
  const pluginsByType = _.groupBy(config.plugins, (plugin) => plugin.type)

  _.forEach(config.engines, (engine) => {
    try {
      const engineConf = _.defaults({}, config[engine.type], { logger })
      engineConf.server = config.server // pass server if it exists
      engine.bootstrap(engineConf)

      // only add help and plugins if engine was successfully bootstrapped
      addHelp(engine, pluginsByType)
      addPlugins(engine, pluginsByType)
    } catch(e) {
      logger.error(`Error bootstrapping engine ${engine.type}`, e)
    }
  })
}

function addHelp(engine, pluginsByType) {
  try {
    engine.addHelp(helpArray(engine.type, pluginsByType))
  } catch(e) {
    logger.error(`Error adding help text for engine ${engine.type}`, e)
  }
}

function helpArray(engineType, pluginsByType) {
  return _.chain(pluginsByType[engineType])
    .filter((plugin) => plugin.help && plugin.help.keyword && plugin.help.text)
    .map((plugin) => {
      const help = plugin.help
      help.name = plugin.name
      return help
    })
    .value()
}

function addPlugins(engine, pluginsByType) {
  try {
    engine.addPlugins(pluginArray(engine.type, pluginsByType))
  } catch(e) {
    logger.error(`Error adding plugins for engine ${engine.type}`, e)
  }
}

function pluginArray(engineType, pluginsByType) {
  return _.map(pluginsByType[engineType], (plugin) => _.omit(plugin, 'help'))
}
