export const command = 'info';
export const desc    = 'Outputs info about the current project context';
export const builder = {};
export async function handler(argv) {
  console.log('info handler');
  await argv.betty.info();
}
