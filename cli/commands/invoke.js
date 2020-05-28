import repl from 'repl';

import { Lambda } from 'aws-sdk';
import { readJsonSync } from 'fs-extra';

import { APPDATA_PATH } from '../appdata.js';

export const command = 'invoke';
export const desc    = 'Outputs info about the current project context';
export const builder = {
  event: {
    default:    '{}',
    describe:   'The event to send to the function. Can be json string or path to file containing json relative to --project',
    coerce: arg => {
      try {
        return JSON.parse(arg);
      }
      catch (err) {
        return JSON.parse(readJsonSync(arg));
      }
    },
  },
  qualifier: {
    describe:   'The function alias or version',
    default:    '$LATEST',
  },
  local: {
    describe:   'When provided, the lambda endpoint will be set localhost. Optionally provide a port number, otherwise it defaults to 9001',
  },
  interactive: {
    type:       'boolean',
    default:    false,
    describe:   'Start interactive mode for running commands',
  },
};

const createLambdaApi = ({ betty, qualifier, local }) => {
  const api = {
    async invoke(event = {}) {
      if (local) {
        return await api.invokeLocal(event, typeof local === 'string' ? local : '9001');
      }
      else {
        return await api.invokeRemote(process.env.AWS_REGION, event);
      }
    },
    async invokeLocal(event = {}, port) {
      const endpoint = `http://localhost:${port || '9001'}`;
      const client = new Lambda({ endpoint });
      return await api._invoke(client, event);
    },
    async invokeRemote(region = process.env.AWS_REGION, event = {}) {
      const client = new Lambda({ region });
      return await api._invoke(client, event);
    },
    async _invoke(client, event) {
      const params = {
        FunctionName:       betty.resource.name,
        Payload:            JSON.stringify(event),
        Qualifier:          qualifier,
      };
      return await client.invoke(params).promise();
    },
  };
  return api;
};

// for direct repl invocation. don't return anything and log results instead
const _wrapInvokeIgnorePromise = method => (...args) => {
  method(...args)
    .then(result => {
      logger.write(logger.chalk.bold.green('Success'));
      logger.write(JSON.parse(result.Payload));
    })
    .catch(err => {
      logger.error('Failed');
      logger.write(err);
    });
};

const _attachRepl = (argv, replContext) => {
  const lambda = createLambdaApi(argv);
  Object.assign(replContext, {
    lambda,
    invoke:       _wrapInvokeIgnorePromise(lambda.invoke),
    invokeLocal:  _wrapInvokeIgnorePromise(lambda.invokeLocal),
    invokeRemote: _wrapInvokeIgnorePromise(lambda.invokeRemote),
  });
};

export async function handler(argv) {
  const { betty, event, qualifier, interactive } = argv;
  if (interactive) {
    logger.write(logger.chalk.underline('Available commands'));
    logger.write([
      'invoke',
      'invokeLocal',
      'invokeRemote',
      'lambda.*',
    ], '\n');
    logger.write(logger.debugText('The difference between invoke and lambda.invoke is the lambda variant returns a promise whereas the unprefixed version logs the result.'));
    logger.spacer();
    const r = repl.start('> ');
    _attachRepl(argv, r.context);
    // setup history; node >= 11
    // NOTE: for < 11 node there is no history at all
    r.setupHistory && r.setupHistory(APPDATA_PATH);
  }
  else {
    const client = new Lambda();
    const params = {
      FunctionName:       betty.resource.name,
      Payload:            JSON.stringify(event),
      Qualifier:          qualifier,
    };
    const result = await client.invoke(params).promise();
    logger.write(logger.chalk.bold.grey('Region'),process.env.AWS_REGION); // eslint-disable-line no-console
    logger.write(logger.chalk.bold.grey('Success'));
    logger.write(result);
    logger.write(logger.chalk.bold('Response payload'));
    logger.write(JSON.parse(result.Payload));
  }
}
