<img src="site/assets/images/logo-0.1-horizontal.png" alt="Skellington: the logo is jack the chat bubble, get it???" style="max-width: 500px; display:block; margin: 0 0 20px;">

[![Build Status](https://travis-ci.org/colestrode/skellington.svg?branch=master)](https://travis-ci.org/colestrode/skellington)
[![Coverage Status](https://coveralls.io/repos/github/colestrode/skellington/badge.svg?branch=master)](https://coveralls.io/github/colestrode/skellington?branch=master)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

The skeleton for your Slack bots.

# Composable Slack Bots

Skellington is a skeleton for your [Botkit](https://github.com/howdyai/botkit) Slack bots. It handles the boilerplate connection
and error handling and let's you get down to the business of bot-making. You can write a new bot in just a few of lines of code! 

Skellington has a robust plugin architecture letting you import plugins into your Skellington bot to mix and
match functionality. This will let you keep your bot small, code clean, and your deployments simple.


# Usage

This is all the code you need to write to make a Skellington bot for a single team:

```js
require('skellington')({
  slackToken: 'xoxb-abc123-def-456',
  plugins: [require('gobot'), require('awesom-o')]  
});
```

## Creating a Slack App

You can also use Skellington to set up a Slack app for incoming webhooks, slash commands, and multiteam support. Just pass a few configs:

```js
require('skellington')({
  clientId: 'jack',
  clientSecret: 'shhhhhh',
  port: 433,
  scopes: ['bot'], // optional, scopes can come from the config or from plugins
  state: 'kentucky', // optional state passed back during the OAuth authentication flow
  redirectUri: 'http://skellington.is.cool', // optional redirect URI configured in Slack for your app
  plugins: [require('gobot'), require('awesom-o')]  
});
```

OAuth and slash command endpoints will be created for you. The oauth path will be `/oauth` and the slash command endpoint will be `/slack/receive`.

If required configs are missing, Skellington will exit with a helpful error message to get you up and running.

# Built-in Help Commands

Want to know what commands your bot supports? Direct mention (`@bot help`) or direct message your bot `help` and your bot 
will give you a list of help topics. Each plugin you register with your bot can add it's own help commands.

# Skellington Config Options

Skellington will allow you to create a single team bot for that team or a Slack app capable of multi-team bots, slash commands, 
and incoming webhooks. These types are mutually exclusive and which type you create depends on the options you pass.

- `botkit` (Object) An optional object of options passed directly to `Botkit.slackbot`.

- `logger` (Object) A custom logger, defaults to Skellington's internal logging. Logger must implement `debug`, `info`, and `error` methods.

- `plugins` (Array, Required) An array of plugins. See [below](#plugin-api) for details.

- `port` (Number, Required for Slack App) If passed, will create an express server listening on the port. The express app will be passed to 
plugins in the `init` callback. The paths `/oauth` and `/slack/receive` are reserved.

- `debug` (Boolean) Whether to turn on debug mode. By default this value will be used for the `botkit.debug` option, but this can be overridden
in the botkit config.

- `debugOptions` (Object) Used if `debug` is true. 

  - `debugOptions.formatter` (Function) A formatter function that will be used to log any message to a `hears` call. Will be passed
the `message` object. Additional debug information will be added onto the message on the `skellington` key.


### Single Team Bot Options

- `slackToken` (String, Required) If this is a single team bot, the Slack API token used to connect to the Slack API.
When `slackToken` is passed, Skellington will create a single team bot. Otherwise Skellington will attempt to build a Slack app.

- `exitOnRtmFailure` (Boolean) Whether to exit the process if an RTM connection cannot be established. Defaults to `true`.


### Slack App Options

- `clientId` (String, Required) Your Slack OAuth client ID.

- `clientSecret` (String, Required) Your Slack OAuth client secret.

- `redirectUri` (String) A redirect URI to pass to Slack during the OAuth flow. If passed, Slack will redirect to this URI therefore
it should be the Skellington host. To redirect from Skellington after the OAuth flow is complete, use
`successRedirectUri` and `errorRedirectUri`.

- `state` (String) State that will be returned from Slack as part of the OAuth flow. This is usually used
to verify the callback from the Identity Provider (Slack, in this case) is legitimate.

- `scopes` (Array) The [OAuth scopes](https://api.slack.com/docs/oauth-scopes) your app will be requesting. Defaults to no scopes. Scopes can be passed from plugins as well.

- `successRedirectUri` (String) A URI to for Skellington to redirect to after a successful OAuth
authentication flow.

- `errorRedirectUri` (String) A URI to for Skellington to redirect to after a failed OAuth
authentication flow.

# Botkit Versions

Botkit is a core dependency of Skellington and is caret matched in `package.json`. This means that any bug fixes (patch releases) and new features (minor releases)
in Botkit will be automatically picked up each time you install Skellington. This is a bet on semver which the Botkit project has appeared to follow well.

Note: Botkit is currently in 0.X.Y versioning, so a `^` match will only pick up "patch" releases.

When/if Botkit publishes a breaking change, I will file a Skellington issue to track it and for the community to comment on.
The subsequent Skellington version bump will either be a minor or major release, depending on the impact.

If you find an issue related to a Botkit version picked up by Skellington, please file an [issue](https://github.com/colestrode/skellington/issues/).

## Tips on Managing the Botkit Dependency

- Shrinkwrap your bot, this will give you consistency from build to build.
- Test your bot before you deploy to production. Fire it up and click around and look for anything weird (don't forget to check your logs).
- If you run into an issue due to a Botkit bug, try downgrading Botkit:
  - `cd node_modules/skellington && npm install botkit@<version> && cd ../..`
  - If this solves the issue, shrinkwrap your bot and please file an [issue](https://github.com/colestrode/skellington/issues/). 


# Plugin API

### `init`

- `init(controller, bot, expressApp)`

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


### `botConnected`

- `botConnected(controller, bot)`

The `botConnected` callback is called any time a bot connects to an RTM session with Slack and is passed a reference to the controller
and the bot. `botConnected` can be used for building a cache of team specific entities (like channels or users) or gather whatever 
information about a team you could need.

`botConnected` is called for single team bots and Slack apps, though for single team bots it is called at the same moment
in the lifecycle as `init`.

It is only fired if the RTM session can be established unlike the Botkit `create_bot` event, which is called after a successful OAuth
authorization flow, but before an RTM session is established.


```js
module.exports = {
  botConnected: function(controller, bot) {
    // do some interesting things with the connected bot!  
  }
};
```


### `scopes`
- Array 

For plugins that are for Slack apps you can pass an array of OAuth [scopes](https://api.slack.com/docs/oauth-scopes) your plugin will require.

```js
module.exports = {
  init: function(controller, bot, expressApp) {
    // what an awesome multi-team bot!  
  },
  scopes: ['bot']
};
```

### `help`

- Object 

You can optionally include help text for your plugin. This is a great way for  To do this, you will need a a `help` object with `command` and `text`
properties on your exported object. As in life, `help` is optional, but it does make things easier.

- `command` (String, required) The command the user will use to get help about your plugin. For example if `command` is `funny gifs`, users
will get help by typing `@bot help funny gifs`.

- `text` (String or function, required) Either a string or a function. The string will be displayed as is. If text if a function, it will be passed an
options object with the following properties:

| Property | Description |
| ---------|-------------|
| botName  | The user facing name of the bot. Useful if you have commands that require @-mentioning the bot. |
| team     | The team ID the help message came from. |
| channel  | The channel ID the help message came from. |
| user     | The ID of the user who initiated the help message. |

```js

// basic help
module.exports = {
  init: function(controller, bot, expressApp) {
    // initialize plugin
  },
  help: {
    command: 'funny gifs',
    text: 'They are so funny!'
  }
}

// advanced formatting
module.exports = {
  init: function(controller, bot, expressApp) {
    // initialize plugin
  },
  help: {
    command: 'funny gifs',
    text: function(opts) {
      return `${opts.botName} ${opts.team} ${opts.channel} ${opts.user}`
    }
  }
};
```

## Considerations When Building a Plugin

### Plan for Multiple Teams and Multiple Bots

Your plugin could be part of a Slack app or a single team bot. Users can also be running multiple Skellington bots within 
the same process, see the [functional tests](test/functional/) for an example. If possible, build your plugin to 
be stateless, but if you need to build a data store make sure to key it by team ID and/or bot ID.

### Be Considerate With Data

Assume there will be several other plugins running in the same Skellington instance, so be considerate when you put
things into the shared storage. Namespace any data specific to your plugin and don't modify things you didn't set.

When you read from storage, remember to always merge your updates with what was present in storage before.
Here's an example of how to do that using lodash's `merge` method:

```js
var myTeamData = {funnyGifs: 'some data'};
controller.storage.teams.get('teamId', function(err, team) {
  var mergedData = _.merge({id: 'teamId'}, team, myTeamData);
  controller.storage.teams.save(mergedData, function(err) {
    console.log('data updated!')
  })
})
```

### Namespace Express Paths

If you are adding additional routes to the express app use a namespaced path,
like `/funny-gifs/endpoint`. Don't add things to the root path, those are likely to conflict with another bot.
The paths `/oauth` and `/slack/receive` are reserved.
