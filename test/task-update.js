import { LambdaUpdateTask } from '../lib/tasks/update.js';

import { Resource } from '../lib/resource.js';

const noop = () => {};

const testResource = new Resource({
  name: 'some-function',
  description: 'the description',
  region: 'us-east-2',
  configuration: {
    memory: 512,
    timeout: 25,
    source: 'src/main.js',
    main: 'dist/index.js',
    entry: 'index.handler',
    runtime: 'nodejs12.x',
    environment: {
      a: 'variable',
      non_string: 123,
      object: {}, // this will result in "[object Object]"
    },
  },
  assets: [
    {
      service:        'dynamodb',
      name:           'table/some-table',
      permissions:    [ 'dynamodb:GetItem' ],
    },
  ],
  resources: {
    'some-other-function': '*',
  },
  policy: [
    {
      service: 'lambda',
      region: '*',
      name: 'function:some-function',
      permissions: [
        'lambda:InvokeFunction'
      ],
    },
  ],
});

const mockBettyContext = {
  awsAccountId: '123',
  distPath: null, // null disables bundling
  resource: testResource,
};

const mockBettyInstance = {
  resource: mockBettyContext.resource,
  context: mockBettyContext,
};

const createInstanceWithResource = data => {
  const resource = new Resource(Object.assign({}, testResource.data, data));
  return Object.assign({}, mockBettyInstance, {
    resource,
    context: Object.assign({}, mockBettyContext, {
      resource,
    }),
  });
};

describe('update tasks', () => {
  describe('LambdaUpdateTask', () => {
    describe('::buildDeadLetterQueueConfig', () => {
      it('should pass through an arn', () => {
        const arn = 'arn:aws:sqs:us-east-2:444455556666:queue1';
        const result = LambdaUpdateTask.buildDeadLetterQueueConfig(arn);
        expect(result).to.equal(arn);
      });
      it('should return an arn for a dead letter queue', () => {
        const result = LambdaUpdateTask.buildDeadLetterQueueConfig('queue1', 'sqs', {
          region: 'us-east-2',
          account: '444455556666'
        });
        expect(result).to.equal('arn:aws:sqs:us-east-2:444455556666:queue1');
      });
      it('should allow changing target service', () => {
        const result = LambdaUpdateTask.buildDeadLetterQueueConfig('topic', 'sns', {
          region: 'us-east-2',
          account: '444455556666'
        });
        expect(result).to.equal('arn:aws:sns:us-east-2:444455556666:topic');
      });
    });
    describe('#_before', () => {
      it('should load a service role', async () => {
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask();
        let targetMethodRan = false;
        // noop everything except for what we're testing
        task._loadServiceRole = () => {
          targetMethodRan = true;
        };
        task._attachExectionRole = noop;
        task._writeInlinePolicy = noop;
        task._attachManagedPolicies = noop;
        task._writeManagedPolicy = noop;
        await task._before(betty);
        ok(targetMethodRan);
      });
      it('should attach an exection role', async () => {
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask();
        let targetMethodRan = false;
        // noop everything except for what we're testing
        task._loadServiceRole = noop;
        task._attachExectionRole = (awsAccountId, functionName) => {
          targetMethodRan = true;
          expect(awsAccountId).to.equal('123');
          expect(functionName).to.equal('some-function');
        };
        task._writeInlinePolicy = noop;
        task._attachManagedPolicies = noop;
        task._writeManagedPolicy = noop;
        await task._before(betty);
        ok(targetMethodRan);
      });
      it('should not create inline policies if no assets defined', async () => {
        const betty = createInstanceWithResource({
          assets: [],
        });
        const task = new LambdaUpdateTask();
        // noop everything except for what we're testing
        task._loadServiceRole = noop;
        task._attachExectionRole = noop;
        task._writeInlinePolicy = () => {
          throw new Error('should not be called');
        };
        task._attachManagedPolicies = noop;
        task._writeManagedPolicy = noop;
        await task._before(betty);
      });
      it('should attach an exection role', async () => {
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask();
        let targetMethodRan = false;
        // noop everything except for what we're testing
        task._loadServiceRole = noop;
        task._attachExectionRole = noop;
        task._writeInlinePolicy = () => {
          targetMethodRan = true;
        };
        task._attachManagedPolicies = noop;
        task._writeManagedPolicy = noop;
        await task._before(betty);
        ok(targetMethodRan);
      });
      it('should not attach managed policies if none defined', async () => {
        const betty = createInstanceWithResource({
          resources: {},
        });
        const task = new LambdaUpdateTask();
        // noop everything except for what we're testing
        task._loadServiceRole = noop;
        task._attachExectionRole = noop;
        task._writeInlinePolicy = noop;
        task._attachManagedPolicies = () => {
          throw new Error('should not be called');
        };
        task._writeManagedPolicy = noop;
        await task._before(betty);
      });
      it('should attach an exection role', async () => {
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask();
        let targetMethodRan = false;
        // noop everything except for what we're testing
        task._loadServiceRole = noop;
        task._attachExectionRole = noop;
        task._writeInlinePolicy = noop;
        task._attachManagedPolicies = () => {
          targetMethodRan = true;
        };
        task._writeManagedPolicy = noop;
        await task._before(betty);
        ok(targetMethodRan);
      });
      it('should create a managed policy for itself', async () => {
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask();
        let targetMethodRan = false;
        // noop everything except for what we're testing
        task._loadServiceRole = noop;
        task._attachExectionRole = noop;
        task._writeInlinePolicy = noop;
        task._attachManagedPolicies = noop;
        task._writeManagedPolicy = () => {
          targetMethodRan = true;
        };
        await task._before(betty);
        ok(targetMethodRan);
      });
    });
    describe('#_loadServiceRole', () => {
      it('should create a service role', async () => {
        const betty = mockBettyInstance;
        const mockClient = {
          async createLambdaRole(awsAccountId, functionName) {
            return {
              Role: {
                Arn: [awsAccountId,functionName].join(':'),
              },
            };
          },
        };
        const task = new LambdaUpdateTask();
        ok(!task._serviceRoleArn, 'should not be set yet');
        await task._loadServiceRole(betty, mockClient);
        expect(task._serviceRoleArn).to.equal('123:some-function');
      });
    });
    describe('#_writeInlinePolicy', () => {
      it('should create a service role', async () => {
        const betty = mockBettyInstance;
        let attached = false;
        const mockClient = {
          documentFromAssets() {
            return { a: 'policy document' };
          },
          async createManagedPolicy(awsAccountId, name, policyDocument) {
            attached = true;
            expect(awsAccountId).to.equal('123');
            expect(name).to.equal('some-function');
            expect(policyDocument).to.deep.equal({ a: 'policy document' });
          }
        };
        const task = new LambdaUpdateTask();
        ok(!task._serviceRoleArn, 'should not be set yet');
        await task._writeManagedPolicy(betty, mockClient);
        ok(attached, 'failed to run');
      });
    });
    describe('#_attachManagedPolicies', () => {
      it('should attach resources as managed policies', async () => {
        const betty = createInstanceWithResource({
          resources: {
            one: '*',
            two: '*',
            three: '*',
          },
        });
        const createdManagedPolicies = [];
        const attachedPolicyArns = [];
        const mockClient = {
          createManagedPolicyArnForResource(awsAccountId, resourceName) {
            createdManagedPolicies.push(resourceName);
            return 'arn:' + resourceName;
          },
          async attachManagedPolicy(functionName, policyArn) {
            expect(functionName).to.equal('some-function');
            attachedPolicyArns.push(policyArn);
          },
        };
        const task = new LambdaUpdateTask();
        await task._attachManagedPolicies(betty, mockClient, mockClient);
        expect(createdManagedPolicies.sort()).to.deep.equal([
          'one',
          'two',
          'three',
        ].sort());
        expect(attachedPolicyArns.sort()).to.deep.equal([
          'arn:one',
          'arn:two',
          'arn:three',
        ].sort());
      });
    });
    describe('#_processFunction', () => {
      it('should create a function if it does not exist', done => {
        const mockClient = {
          getFunctionConfiguration(params, callback) {
            const err = new Error();
            err.code = 'ResourceNotFoundException';
            callback(err);
          },
          createFunction(params, callback) {
            expect(params).to.deep.equal({
              FunctionName:       'some-function',
              Description:        'the description',
              Handler:            'index.handler',
              MemorySize:         512,
              Role:               null,
              Runtime:            'nodejs12.x',
              Timeout:            25,
              DeadLetterConfig:   undefined,
              Environment: {
                Variables: { a: 'variable', non_string: '123', object: '[object Object]' },
              },
              VpcConfig:          undefined,
              TracingConfig:      undefined,
              Code: {
                ZipFile: null,
              },
              Publish: true,
            });
            callback(null);
          },
        };
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask();
        task._processFunction(betty, 'us-east-2', mockClient)
          .then(() => done())
          .catch(done);
      });
      it('should update function code if it does exist', done => {
        const mockClient = {
          getFunctionConfiguration(params, callback) {
            callback(null, {});
          },
          updateFunctionCode(params, callback) {
            // console.log('updateFunctionCode', params);
            expect(params).to.deep.equal({
              FunctionName:       'some-function',
              ZipFile: null,
              DryRun: false,
              Publish: true,
            });
            callback(null);
          },
        };
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask();
        task._processFunction(betty, 'us-east-2', mockClient)
          .then(() => done())
          .catch(done);
      });
      it('should update function code and configuration if it does exist, and asked', done => {
        let configurationUpdated = false;
        const mockClient = {
          getFunctionConfiguration(params, callback) {
            callback(null, {});
          },
          updateFunctionConfiguration(params, callback) {
            // console.log('updateFunctionConfiguration', params);
            configurationUpdated = true;
            expect(params).to.deep.equal({
              FunctionName:       'some-function',
              Description:        'the description',
              Handler:            'index.handler',
              MemorySize:         512,
              Role:               null,
              Runtime:            'nodejs12.x',
              Timeout:            25,
              DeadLetterConfig:   undefined,
              Environment: {
                Variables: { a: 'variable', non_string: '123', object: '[object Object]' },
              },
              VpcConfig:          undefined,
              TracingConfig:      undefined,
            });
            callback(null);
          },
          updateFunctionCode(params, callback) {
            // console.log('updateFunctionCode', params);
            expect(params).to.deep.equal({
              FunctionName:       'some-function',
              ZipFile: null,
              DryRun: false,
              Publish: true,
            });
            callback(null);
          },
        };
        const betty = mockBettyInstance;
        const task = new LambdaUpdateTask({
          updateConfiguration: true,
        });
        task._processFunction(betty, 'us-east-2', mockClient)
          .then(() => {
            ok(configurationUpdated, 'configuration was not updated');
            done();
          })
          .catch(done);
      });
    });
  });
});
