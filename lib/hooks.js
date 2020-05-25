// import { ok } from 'assert';
import { execSync } from 'child_process';

export function invokeHookJs(hook, env, config, options) {
  hook(options, { env, config });
};

export function invokeHookExec(hook, env, config, options) {
  const envVars = Object.assign({}, process.env);
  for (const key of Object.keys(options)) {
    envVars[`betty_${key.toLowerCase()}`] = '' + options[key];
  }
  execSync(hook, {
    stdio:      'inherit',
    env:        envVars,
  });
};

// FIXME: this needs a rewrite and probably instead belongs in consumer
// export function invokeHook(eventName, options, hooks) {
//   ok(Array.isArray(hooks), 'hooks must be array');
//   const hook = hooks[eventName];
//   if (hook) {
//     if (typeof hook === 'string') {
//       invokeHookExec(hook, global.betty, global.config, options);
//     }
//     else {
//       invokeHookJs(hook, global.betty, global.config, options);
//     }
//   }
// }
