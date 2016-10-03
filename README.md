<img src="site/assets/images/logo-0.1-horizontal.png" alt="Skellington: the logo is jack the chat bubble, get it???" style="max-width: 500px; display:block; margin: 0 0 20px;">

[![Build Status](https://travis-ci.org/colestrode/skellington.svg?branch=master)](https://travis-ci.org/colestrode/skellington)
[![Coverage Status](https://coveralls.io/repos/github/colestrode/skellington/badge.svg?branch=master)](https://coveralls.io/github/colestrode/skellington?branch=master)

The skeleton for your bots.

## Composable Botkit Bots

Skellington is a skeleton for your [Botkit](https://github.com/howdyai/botkit) bots. It handles the boilerplate connection
and error handling and let's you get down to the business of bot-making.

The real power of Skellington lies in it's composability. You can import plugins into Skellington to mix and
match functionality. This will let you keep your code isolated while keeping your deployments simple.

## Usage

This is all the code you need to write to make a Skellington bot:

```js
require('skellington')({
  slackToken: 'xoxb-abc123-def-456',
  plugins: [require('gobot'), require('awesom-o')]  
});
```

## Config Options

### slackToken

Defaults to `process.env.SLACK_API_TOKEN`.

### plugins

An array of plugins. See [below](#writing-bot-plugins) for details.

### storage

A storage module for Botkit. Defaults to the botkit default storage.

### port

If passed, will create an express server listening on the port. If not set, the express server won't be created.

### debug

Toggles debug mode for botkit. Defaults to `false`.


## Writing Bot Plugins

Each plugin passed to Skellington should export an object with an `init` function that will take a botkit `controller`, `bot`,
and optionally an Express `app` (this will only exist if `config.port` was set):

```js
module.exports = {
  init: function(controller, bot, expressApp) {
    // build your bot logic here!
    controller.hears('hello', 'direct_mention', function(bot, message) {
      bot.reply(message, 'Hi!');
    });  
  }
};
```

Learn more about the botkit API in [the howdyai/botkit docs](https://github.com/howdyai/botkit/blob/master/readme.md).

### Help Text

You can optionally include help text for your plugin. To do this, you will need a a `help` object with `command` and `text`
properties on your exported object. As in life, `help` is optional, but it does make things easier.

`command`: the command the user will use to get help about your plugin. For example if `command` is `funny gifs`, users
will get help by typing `@bot help funny gifs`.

`text`: either a string or a function. The string will be displayed as is. If text if a function, it will be passed an
options object with the following properties:

| Property | Description |
| ---------|-------------|
| botName  | The user facing name of the bot. Useful if you have commands that require @-mentioning the bot. |
| team     | The team ID the help message came from. |
| channel  | The channel ID the help message came from. |
| user     | The ID of the user who initiated the help message. |



### Be Considerate With Data

There will potentially be several other plugins running in the same Skellington instance, so be considerate when you put
things into the Botkit storage. Namespace any data specific to your plugin and don't modify things you didn't set.

When you read from storage, remember to always merge your updates with what was present in storage before.
Here's an example of how to do that using lodash's `merge` method:

```js
var myTeamData = {funnyGifs: 'some data'};
controller.storage.teams.get('teamId', function(err, team) {
  var mergedData = _.merge({id: 'teamId'}, team, myTeamData);
  controller.storage.teams.save(mergedData, function(err) {
    console.log('data updated!')
  });
})
```

### Namespace Express Paths

If you are writing slash commands and need access to the express server, use a namespaced path,
like `/funny-gifs/endpoint`. Don't add things to the root path, those are likely to conflict with another bot.
