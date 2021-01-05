import { ok } from 'assert';
import { join, dirname, basename } from 'path';

import { Betty } from '../../lib/betty.js';

import { BuildContext, DEPENDENCY_WILDCARD_VALUE } from './build/build-context.js';
import { _createWebpackConfig } from './build/webpack.js';

import { renderAllTemplates } from './convert/templates.js';
import { writeMainStub, writeAllStubs } from './convert/stubs.js';
import { writeFileSync } from './convert/fs.js';

export const command = 'convert';
export const desc    = '';
export const builder = {
  secret: {
    type: 'array',
    alias: 's',
    describe: [
      'Previously, config values were left out of repo.  ',
      'With terraform the opposite is true. Because of this, ',
      'a list of all config properties that should be encrypted ',
      'can be passed.  All other values will be plaintext.',
    ].join(''),
    default:        [],
  },
  plaintext: {
    describe:       'If no secrets are required, this value must be true',
  },
  name: {
    alias:          'n',
    describe:       'The name of the file to output to',
    default:        'resource.tf',
  },
  //
  // These are all dupes of build options to be able to generate webpack config
  //
  'package-manager': {
    choices:        [ 'npm', 'yarn' ],
    default:        'npm',
    describe:       'If your project has external dependencies this will be used to install them',
  },
  external: {
    type:           'array',
    default:        [],
    describe:       'Dependencies that are not bundled and need to be installed. Exact match on dependency key is allowed.  Pass "*" to include all. ',
  },
  'external-builtins': {
    default:        true,
    describe:       'Specifically mark all node.js builtins as external. Disable with --no-external-builtins.  (You would only want to disable this if your project has a package that collides with a node.js built-in package.)',
  },
  'external-awssdk': {
    default:        true,
    describe:       'Specifically mark aws-sdk as external and do not install or bundle it. Disable with --no-external-awssdk. AWS Lambda automatically includes this package so it\'s not necessary to include in most situations.',
  },
  internal: {
    type:           'array',
    default:        [ DEPENDENCY_WILDCARD_VALUE ],
    describe:       'Dependencies that should not be installed prior to packaging. Exact match on dependency key is allowed.  Pass "*" to exclude all.',
  },
  alias: {
    type:           'array',
    default:        [],
    describe:       'Tells compiler to replace one dependency with another. Format is "from:to" e.g. from "@something/here:my-custom-here". Only applies to webpack.',
  },
  sourcemap: {
    type:           'boolean',
    default:        true,
    describe:       'On by default. Pass --no-sourcemap to disable',
  },
  minify: {
    type:           'boolean',
    default:        true,
    describe:       'On by default. Pass --no-minify to disable',
  },
};

export async function handler(argv) {
  const { betty, name, secret, plaintext } = argv;
  ok(secret.length > 0 || true === plaintext,
    'A list of secrets requiring encryption must be provided or the plaintext flag enabled so all config values are stored in plaintext');
  const destination = join(betty.context.cwd, name);
  const todo = [];
  todo.push('Add bundle.zip to .gitignore');
  todo.push('Make sure awsAccountId and awsRegion are correct for stage in configs/**/variables.tfvars');
  if (secret.length > 0) {
    todo.push('Edit configs/**/variables.tfvars and replace any secrets with encrypted values');
    todo.push('Add package.json build script so this works: npm run decrypt "encryptedvalue"');
  }
  if (argv.external.length > 0) {
    todo.push(`Externals are unsupported and there are ${argv.external.length} externals provided. These values should be handled as part of the build e.g. postbuild script`);
  }
  if (Object.keys(betty.resource.data.resources || {}).length > 0) {
    todo.push(`Project contains ${Object.keys(betty.resource.data.resources).length} managed resources. These will be left as-is and continue to work, but should be migrated to inline assets (policy "combined-assets")`);
  }
  const contents = renderAllTemplates(betty, { secrets: secret });
  writeFileSync(destination, contents + '\n');
  todo.push('Edit configs/**/backend.config');
  writeAllStubs(betty, {
    secrets: secret || [],
    stages: [
      'testing',
      'production',
    ],
  });
  const buildContext = await BuildContext.fromArgv(argv);
  const webpackConfig = await _createWebpackConfig(buildContext);
  webpackConfig.entry = '___ENTRY___';
  webpackConfig.output.path = '___OUTPUTPATH___';
  webpackConfig.output.filename = basename(betty.context.configuration.main);
  let renderedWebpackConfig = JSON.stringify(webpackConfig, null, 2);
  // note that all the search values are quoted because we're replacing json
  // string with a js literal
  renderedWebpackConfig = renderedWebpackConfig.replace(
    '"___ENTRY___"',
    '`${__dirname}/' + betty.context.configuration.source + '`'
  );
  renderedWebpackConfig = renderedWebpackConfig.replace(
    '"___OUTPUTPATH___"',
    '`${__dirname}/' + dirname(betty.context.configuration.main) + '`'
  );
  writeFileSync(join(betty.context.cwd, 'webpack.config.js'), `
module.exports = ${renderedWebpackConfig};
    `.trim() + '\n');
  todo.push('npm i webpack-cli webpack@4 -D');
  todo.push('Update webpack.config.js contents and fix unexpected values');
  todo.push('Change "npm run build" to: "webpack -c webpack.config.js"');
  todo.push('Change "npm run deploy" to: "./tf.sh -c apply -b -s" and run like "npm run deploy testing"');
  todo.push(`Delete existing _betty created_ resources: role "${betty.resource.name}" and function "${betty.resource.name}". Note: Managed policy "${betty.resource.name}" should be left alone and will not be managed by the terraform script. **WARNING:** Before doing this, be sure to backup any saved events in the console`);
  todo.push('If there are any other related services that have their own policies that refers to the resources to be deleted above. They will likely need to be addressed manually. Examples: S3, KMS. ');
  console.log('Done! Remember to do the following:', '\n\t- [ ] ' + todo.join('\n\t- [ ] '));
}


