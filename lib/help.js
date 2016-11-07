'use strict'

const _ = require('lodash')

/**
 * Adds all help listeners for plugins
 *
 * @param controller
 * @param botName
 * @param plugins
 */
module.exports.addHelpListeners = (controller, plugins) => {
  _.forEach(plugins, (plugin) => {
    if (_.get(plugin, 'help.text') && _.get(plugin, 'help.command')) {
      registerHelpListener(controller, plugin.help)
    }
  })

  controller.hears('^help$', 'direct_mention,direct_message', (bot, message) => {
    let helpCommands = _.chain(plugins)
      .filter((plugin) => !!_.get(plugin, 'help.command'))
      .map((plugin) => `\`@${bot.identity.name} help ${_.get(plugin, 'help.command')}\``)
      .value()
      .join('\n')

    if (!helpCommands.length) {
      return bot.reply(message, 'I can\'t help you with anything right now. I still like you though :heart:')
    }

    return bot.reply(message, 'Here are some things I can help you with:\n' + helpCommands)
  })
}

/**
 * Adds a single help listener for a plugin
 *
 * @param controller
 * @param helpInfo
 */
function registerHelpListener (controller, helpInfo) {
  controller.hears('^help ' + helpInfo.command + '$', 'direct_mention,direct_message', (bot, message) => {
    let replyText = helpInfo.text

    if (typeof helpInfo.text === 'function') {
      let helpOpts = _.merge({botName: bot.identity.name}, _.pick(message, ['team', 'channel', 'user']))

      replyText = helpInfo.text(helpOpts)
    }

    bot.reply(message, replyText)
  })
}
