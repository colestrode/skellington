<img src="site/assets/images/logo-0.1-horizontal.png" alt="Skellington: the logo is jack the chat bubble, get it???" style="max-width: 500px; display:block; margin: 0 0 20px;">

[![Build Status](https://travis-ci.org/colestrode/skellington.svg?branch=master)](https://travis-ci.org/colestrode/skellington)
[![Coverage Status](https://coveralls.io/repos/github/colestrode/skellington/badge.svg?branch=master)](https://coveralls.io/github/colestrode/skellington?branch=master)

The skeleton for your Slack bots.

## Composable Slack Bots

Skellington is a skeleton for your [Botkit](https://github.com/howdyai/botkit) bots. It handles the boilerplate connection
and error handling and let's you get down to the business of bot-making. You can write a new bot in just a few of lines of code! 

Skellington has a robust plugin architecture letting you import plugins into your Skellington bot to mix and
match functionality. This will let you keep your bot small, code clean, and your deployments simple.


## Usage

This is all the code you need to write to make a Skellington bot for a single team:

```js
require('skellington')({
  slackToken: 'xoxb-abc123-def-456',
  plugins: [require('gobot'), require('awesom-o')]  
});
```

### Creating a Slack App

Skellington will also set up a Slack app for incoming webhooks, slash commands, and multiteam support. Just pass a few configs:

```js
require('skellington')({
  clientId: 'jack',
  clientSecret: 'shhhhhh',
  port: 433,
  scopes: ['bot'], // scopes can come from the config or from plugins
  state: {}, // optional state passed back during the OAuth authentication flow
  redirectUri: 'http://skellington.is.cool', // optional redirect URI configured in Slack for your app
  plugins: [require('gobot'), require('awesom-o')]  
});
```

OAuth and slash command endpoints will be created for you. The oauth path will be `/oauth` and
the slash command endpoint will be `/slack/receive`.


## Skellington Config Options

Skellington will allow you to create a single team bot for that team or 
a Slack app capable of multi-team bots, slash commands, and incoming webhooks. 
These types are mutually exclusive and which type you create depends on the options you pass.

### botkit

An optional object of options passed directly to `Botkit.slackbot`.

### plugins

An array of plugins. See [below](#plugin-api) for details.

### slackToken

**Required for Single Team Bot**

If this is a single team bot, the Slack API token used to connect to the Slack API.

### port

**Required for a Slack App, Optional for a Single Team Bot**

If passed, will create an express server listening on the port. The express app will be passed to plugins in the `init` and `botConnected` callbacks.

### clientId

**Required for a Slack App**

Your Slack OAuth client ID.

### clientSecret

**Required for a Slack App**

Your Slack OAuth client secret.

### redirectUri

**Optional for a Slack App**

A redirect URI to pass to Slack during the OAuth flow.

### state

**Optional for a Slack App**

State that will be returned from Slack as part of the OAuth flow. This is usually used
to verify the callback from the Identity Provider (Slack, in this case) is legitimate.

### scopes

**Optional for a Slack App**

The [OAuth scopes](https://api.slack.com/docs/oauth-scopes) your app will be requesting. Defaults to no scopes. Scopes can be passed from plugins as well.

### debug

Whether to turn on debug mode. By default this value will be used for the `botkit.debug` option, but this can be overridden
in the botkit config.

### debugOptions

Used if `debug` is true. 

`debugOptions.formatter` A formatter function that will be used to log any message to a `hears` call. Will be passed
the `message` object. Additional debug information will be added onto the message on the `skellington` key.

## Plugin API

### init

Each plugin passed to Skellington can export an object with an `init` function that will take a botkit `controller`, `bot`,
and optionally an Express `app` (this will only exist if `config.port` was set). This callback will be called once when Skellington is started.
This is when most plugins will set up their listeners for Slack and Botkit events. Learn more about the Botkit API in [the howdyai/botkit docs](https://github.com/howdyai/botkit/blob/master/readme.md).

NOTE: the *bot* parameter will be `null` for Slack Apps, since `init` is called only once before any teams have connected.
If you want access to the team bot, you can write a `botConnected` callback that will be called whenever a new team initiates
an RTM session with Slack.


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


### botConnected
The `botConnected` callback is called any time a bot connects to an RTM session with Slack. It is called for both Slack Apps
and single team bots. It has the same method signature as `init`. `botConnected` can be used for building a cache of team specific
entities (like channels or users) or gather whatever information about a team you could need.

`botConnected` is called for single team bots and Slack apps, though for single team bots it is equivalent (and called at the same moment
in the lifecycle) as `init`.

It is only fired if the RTM session can be established unlike the Botkit `create_bot` event, which is called after a successful OAuth
authorization flow, but before an RTM session is established


```js
module.exports = {
  botConnected: function(controller, bot, expressApp) {
    // do some interesting things with the connected bot!  
  }
};
```


### scopes
For plugins that are specifically for Slack apps, you can pass an array of OAuth [scopes](https://api.slack.com/docs/oauth-scopes) your plugin will require.

```js
module.exports = {
  init: function(controller, bot, expressApp) {
    // what an awesome multi-team bot!  
  },
  scopes: ['bot']
};
```

### Adding Help Text

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

```js
module.exports = {
  init: function(controller, bot, expressApp) {
    // initialize plugin
  },
  help: {
    command: 'funny gifs',
    text: function(opts) {
      console.log(`${opts.botName} ${opts.team} ${opts.channel} ${opts.user}`);
    }
  }
};
```

### Be Considerate With Data

There will potentially be several other plugins running in the same Skellington instance, so be considerate when you put
things into the shared Botkit storage. Namespace any data specific to your plugin and don't modify things you didn't set.

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

If you are adding additional routes to the express app use a namespaced path,
like `/funny-gifs/endpoint`. Don't add things to the root path, those are likely to conflict with another bot.
