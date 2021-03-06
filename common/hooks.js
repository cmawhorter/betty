'use strict';

const { execSync } = require('child_process');

const invokeHookJs = exports.invokeHookJs = function invokeHookJs(hook, env, config, options) {
  hook(options, { env, config });
};

const invokeHookExec = exports.invokeHookExec = function invokeHookExec(hook, env, config, options) {
  const envVars = Object.assign({}, process.env);
  Object.keys(options).forEach(key => {
    envVars['betty_' + key.toLowerCase()] = '' + options[key];
  });
  execSync(hook, {
    stdio:      'inherit',
    env:        envVars,
  });
};

const invokeHook = exports.invokeHook = function invokeHook(eventName, options) {
  global.log.debug({ eventName }, 'attempting to invoke hook');
  const hook = global.betty.hooks[eventName];
  if (!hook) return;
  global.log.info({ eventName }, 'invoking hook');
  if (typeof hook === 'string') {
    invokeHookExec(hook, global.betty, global.config, options);
  }
  else {
    invokeHookJs(hook, global.betty, global.config, options);
  }
}
