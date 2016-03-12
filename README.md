# skellington
[![Build Status](https://travis-ci.org/colestrode/skellington.svg?branch=master)](https://travis-ci.org/colestrode/skellington)
[![Coverage Status](https://coveralls.io/repos/github/colestrode/skellington/badge.svg?branch=master)](https://coveralls.io/github/colestrode/skellington?branch=master)

:sparkles::skull::sparkles: The skeleton for your bots.

## Composable Botkit Bots

Skellington is a skeleton for your [Botkit](https://github.com/howdyai/botkit) bots. It handles the boilerplate connection and error handling and let's you get
down to the business of bot-making. 

The real power of Skellington lies in it's composability. You can import any compatable bot into Skellington to mix and
match functionality. This will let you keep your code isolated while keeping your deployments simple. 

## Usage

```js
require('skellington')({
  slackToken: 'xoxb-abc123-def-456',
  bots: [require('gobot'), require('awesomo')]  
});
```

## Config Options

### slackToken

Defaults to `process.env.SLACK_API_TOKEN`. 

### bots

An array of bots to plug in. See [below](#bot-interface) for details.

### port

Sets the port for the built in express server. Defaults to `8080`.

### debug

Toggles debug mode for botkit. Defaults to `false`.


## Bot Interface

Each entry in the bots array should export a function that will take a botkit `controller`, `bot`, and an Express `app`:

```js
module.exports = function(controller, bot, expressApp) {
  // build your bot here!
  controller.hears('hello', 'direct_mention', function(bot, message) {
    bot.reply(message, 'Hi!');
  });  
};
```
