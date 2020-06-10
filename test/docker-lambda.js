import { buildDockerRunArgs } from '../lib/tasks/common/docker-lambda.js';

describe('docker-lambda', () => {
  describe('buildDockerRunArgs', () => {
    it('should build an array of args for: build=false, interactive=true', () => {
      const result = buildDockerRunArgs({
        env: { a: 'variable' },
        inheritEnv: [ 'AWS_ACCESS_KEY_ID' ],
        port: 1234,
        build: false,
        interactive: true,
        distPath: '/some/abs/path',
        dockerImage: 'docker-image',
        dockerTag: 'docker-tag',
        distEntry: 'index.handler',
      });
      expect(result).to.deep.equal([
        '--rm',
        '-e',
        'a=variable',
        '-e',
        'AWS_ACCESS_KEY_ID',
        '-p',
        'target=1234,published=9001',
        '-v',
        '/some/abs/path:/var/task:ro,delegated',
        'docker-image:docker-tag',
        'index.handler',
      ]);
    });
    it.only('should build an array of args for: build=false, interactive=false', () => {
      const result = buildDockerRunArgs({
        env: { a: 'variable' },
        inheritEnv: [ 'AWS_ACCESS_KEY_ID' ],
        port: 1234,
        build: false,
        interactive: false,
        distPath: '/some/abs/path',
        dockerImage: 'docker-image',
        dockerTag: 'docker-tag',
        distEntry: 'index.handler',
        event: '{}',
      });
      expect(result).to.deep.equal([
        '--rm',
        '-e',
        'a=variable',
        '-e',
        'AWS_ACCESS_KEY_ID',
        '-v',
        '/some/abs/path:/var/task:ro,delegated',
        'docker-image:docker-tag',
        'index.handler',
        '"{}"',
      ]);
    });
    it.only('should build an array of args for: build=true', () => {
      const result = buildDockerRunArgs({
        env: { a: 'variable' },
        inheritEnv: [ 'AWS_ACCESS_KEY_ID' ],
        port: 1234,
        build: true,
        buildCommand: 'npm run rebuild',
        distPath: '/some/abs/path',
        dockerImage: 'docker-image',
        dockerTag: 'docker-tag',
        distEntry: 'index.handler',
      });
      expect(result).to.deep.equal([
        '--rm',
        '-e',
        'a=variable',
        '-e',
        'AWS_ACCESS_KEY_ID',
        '-v',
        '/some/abs/path:/var/task:ro,delegated',
        'docker-image:docker-tag',
        'npm run rebuild',
      ]);
    });
  });
});
