import { Lambda } from 'aws-sdk';

export const command = 'invoke';
export const desc    = 'Outputs info about the current project context';
export const builder = {
  event: {
    demand:     true,
    describe:   'The event to send to the function',
  },
  qualifier: {
    describe:   'The function alias or version',
    default:    '$LATEST',
  },
};
export async function handler(argv) {
  const { betty, event, qualifier } = argv;
  const client = new Lambda();
  const params = {
    FunctionName:       betty.resource.name,
    Payload:            JSON.stringify(event),
    Qualifier:          qualifier,
  };
  const result = await client.invoke(params).promise();
  console.log('Region:', process.env.AWS_REGION); // eslint-disable-line no-console
  console.log('Raw response:'); // eslint-disable-line no-console
  console.dir(result, { depth: 6, colors: true }); // eslint-disable-line no-console
  console.log('Response payload:'); // eslint-disable-line no-console
  console.dir(JSON.parse(result.Payload), { depth: 6, colors: true }); // eslint-disable-line no-console
}
