import { Lambda } from 'aws-sdk';

export const command = 'info';
export const desc    = 'Outputs info about the current project context';
export const builder = {
  bunyan: {
    type:           'boolean',
    default:        false,
    describe:       'Format as bunyan log entries',
  },
};
export async function handler(argv) {
  const client = new Lambda();
  await argv.betty.info();
}
