# skellington
[![Build Status](https://travis-ci.org/colestrode/skellington.svg?branch=master)](https://travis-ci.org/colestrode/skellington)
[![Coverage Status](https://coveralls.io/repos/github/colestrode/skellington/badge.svg?branch=master)](https://coveralls.io/github/colestrode/skellington?branch=master)

:sparkles::skull::sparkles: The skeleton for your bots.

## Composable Botkit Bots

Skellington is a skeleton for your [Botkit](https://github.com/howdyai/botkit) bots. It handles the boilerplate connection 
and error handling and let's you get down to the business of bot-making. 

The real power of Skellington lies in it's composability. You can import any compatible bot into Skellington to mix and
match functionality. This will let you keep your code isolated while keeping your deployments simple. 

## Usage

This is all the code you need to write to make a Skellington bot:

```js
require('skellington')({
  slackToken: 'xoxb-abc123-def-456',
  bots: [require('gobot'), require('awesom-o')]  
});
```

## Config Options

### slackToken

Defaults to `process.env.SLACK_API_TOKEN`. 

### bots

An array of bots to plug in. See [below](#bot-interface) for details.

### port

If passed, will create an express server listening on the port. If not set, the express server won't be created.

### debug

Toggles debug mode for botkit. Defaults to `false`.


## Writing Bot Plugins

Each plugin bot passed to Skellington should export a function that will take a botkit `controller`, `bot`, 
and optionally an Express `app` (this will only exist if `config.port` was set):

```js
module.exports = function(controller, bot, expressApp) {
  // build your bot here!
  controller.hears('hello', 'direct_mention', function(bot, message) {
    bot.reply(message, 'Hi!');
  });  
};
```

### Be Considerate: Namespace Data

There will potentially be several other bots running in the same Skellington instance, so 
be considerate when you put things into the Botkit storage. Namespace your data and don't modify things you didn't set.

When you read from storage, remember to always merge your updates with what was present in storage before.
Here's an example of how to do that using lodash's `merge` method:

```js
var myTeamData = {myNamespace: 'some data'};
controller.storage.teams.get('teamId', function(err, team) {
  var mergedData = _.merge({}, team, myTeamData);
  controller.storage.teams.save(mergedData, function(err) {
    console.log('data updated!')
  });
})
```

### Namespace Express Paths

If you are writing slash commands and need access to the express server, use a namespaced path, 
like `/my-cool-bot/endpoint`. Don't add things to the root path, those are likely to conflict with another bot.
