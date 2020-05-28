import inquirer from 'inquirer';

import { CwtailLogsTask } from '../../lib/tasks/logs.js';

import { Betty } from '../../lib/betty.js';

import { installRequiredPackages, inferPackageManager } from './common/packages.js';

export const command = 'logs';
export const desc    = 'Streams the cloudwatch log for the function';
export const builder = {
  name: {
    alias:          'n',
    describe:       'Override the target log group name. (Default is your resource.js -> "name")',
  },
  bunyan: {
    type:           'boolean',
    default:        false,
    describe:       'Format as bunyan log entries',
  },
};

const _missingRequirements = [
  'cwtail',
];

const _noCwtail = async argv => {
  const { packagePath } = argv.betty.context;
  if (argv.interactive) {
    const packageManager = await inferPackageManager(packagePath);
    const { answer } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'answer',
        message: [
          'cwtail is required but was not found in the target project ',
          `located in: "${packagePath}"\n`,
          '\n',
          'Would you like to install the requirements?\n',
          '\n',
          `This will install the following packages as devDependencies using "${packageManager}": `,
          _missingRequirements.join(', '),
        ].join(''),
        default: false,
      },
    ]);
    if (answer) {
      await installRequiredPackages(packageManager, packagePath, _missingRequirements);
      // console.log('Done installing requirements. Please run the previous command again.');
      process.exit(1);
    }
    else {
      // console.log('No packages installed');
    }
  }
  else {
    throw new Error(`cwtail is required; no cwtail found root "${packagePath}"`);
  }
};

export async function handler(argv) {
  const { betty, name: _name, bunyan } = argv;
  const { resource } = betty.context;
  const name = _name || resource.data.name;
  try {
    await Betty.runTask(argv.betty, new CwtailLogsTask({
      logGroupName: name,
      bunyan,
    }));
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      await _noCwtail(argv);
    }
    else {
      throw err;
    }
  }
}
