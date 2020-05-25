
// const optionalImport = async target =>
//   import(target)
//     .catch(err => null);

  // static createDefaultRollupConfig({
  //   input = 'src/main.js',
  //   output = 'dist/index.js',
  //   sourcemap = true,
  //   external = [ 'aws-sdk' ],
  // } = {}) {
  //   const [
  //     // it's required so we'll force an error here
  //     // so it's immediately clear
  //     rollup,
  //     babel,
  //     nodeResolve,
  //     commonjs,
  //     json,
  //   ] = await Promise.all([
  //     import('rollup'), // fail if this doesn't exist
  //     optionalImport('@rollup/plugin-babel'),
  //     optionalImport('@rollup/plugin-node-resolve'),
  //     optionalImport('@rollup/plugin-commonjs'),
  //     optionalImport('@rollup/plugin-json'),
  //   ]);
  //   return {
  //     input,
  //     external,
  //     output: {
  //       file:             output,
  //       format:           'cjs',
  //       sourcemap,
  //     },
  //     plugins: [
  //       json && json(),
  //       nodeResolve && nodeResolve({
  //         jsnext:         true,
  //         main:           true,
  //       }),
  //       commonjs && commonjs({
  //         include:        'node_modules/**',
  //       }),
  //       babel && babel({
  //         babelHelpers:   'bundled',
  //         exclude:        'node_modules/**',
  //         babelrc:        false
  //       }),
  //     ].filter(v => !!v),
  //   }
  // }


// new RollupBuildTask({
//       // TODO: pull from somewhere
//       dependencies: {},
//       // TODO: expose way to pass a file and read
//       // rollupConfig,
//     });
//   } = {})

export const command = 'build';
export const desc    = 'Compiles and transpiles source into a lambda-ready build';
export const builder = {
  analyze: {
    boolean:        true,
    describe:       'Analyze the bundle and print the results',
  },
  watch: {
    boolean:        true,
    describe:       'Use rollup.watch to continuously monitor for changes and build as necessary.  Only helpful during dev to test your changes with serve.',
  },
  verbose: {
    boolean:        true,
    alias:          'v',
    describe:       'Verbose output',
  },
  'skip-interop-patch': {
    boolean:        true,
    describe:       'Skip the (hopefully) temporary workaround for rollup cjs interop build by patching output',
  },
  npm: {
    boolean:        true,
    describe:       'Force use of npm for installing external dependencies. Default is to first try yarn and fall back to npm',
  },
  nvm: {
    boolean:        true,
    describe:       'Run nvm use to select node version that matches configured runtime',
  },
  'no-sourcemaps': {
    boolean:        true,
    describe:       'Pass this option to disable sourcemaps from being created',
  }
};

export async function handler(argv) {
  global.log.info('build started');
  invokeHook('prebuild', { argv });
  global.log.debug({ argv }, 'arguments');
  let destination         = argv.main ? path.resolve(argv.main) : path.join(process.cwd(), 'dist/index.js');
  let destinationDir      = path.dirname(destination);
  let pkgJson             = tryLoad.json(path.join(process.cwd(), 'package.json')) || {};
  let pkgJsonDependencies = Object.keys(pkgJson.dependencies || {});
  let unbundledKeys = Object.keys(global.betty.build.unbundled || {}).filter(unbundledKey => {
    if (pkgJsonDependencies.indexOf(unbundledKey) > -1) {
      global.log.trace({ dependency: unbundledKey, source: 'package.json' }, 'unbundled dependency found');
      return true;
    }
    try {
      fs.statSync(path.join(process.cwd(), 'node_modules', unbundledKey));
      global.log.trace({ dependency: unbundledKey, source: 'node_modules' }, 'unbundled dependency found');
      return true;
    }
    catch (err) {
      global.log.trace({ dependency: unbundledKey, err }, 'unbundled dependency not found');
    }
    return false;
  });
  let defaultRollupOptions = {
    input:              path.join(process.cwd(), argv.source || 'src/main.js'),
    plugins: [
      json(),
      nodeResolve({
        jsnext:         true,
        main:           true,
        skip:           [ 'aws-sdk' ].concat(builtins, unbundledKeys),
      }),
      commonjs({
        include:        'node_modules/**',
      }),
      babel({
        exclude:        'node_modules/**',
        babelrc:        false,
        presets:        [ [ 'es2015', { modules: false } ] ],
        plugins:        [ 'external-helpers' ],
      }),
    ],
    external:           [ 'aws-sdk' ].concat(builtins, unbundledKeys),
  };
  let buildConfig = deepAssign({}, argv.rollup || defaultRollupOptions);
  let outputConfig = {
    file:         destination,
    format:       'cjs',
    sourcemap:    argv['no-sourcemaps'] ? false : true,
  };
  invokeHook('prebuildrollup', {
    // send the build config that will be used for modifications
    buildConfig,
    // also expose rollup and plugins
    rollup,
    babel,
    nodeResolve,
    commonjs,
    json,
    analyzer,
  });
  global.log.debug({ rollup: buildConfig }, 'build config');
  global.log.info('starting rollup');
  if (argv.watch) {
    buildConfig.watch = {
      // chokidar:       true,
      include:        path.dirname(buildConfig.input) + '/**', // limit watching to src directory only
      exclude:        'node_modules/**', // just in case user installing deps into src
      clearScreen:    false,
    };
    buildConfig.output = outputConfig;
    global.log.debug({ config: buildConfig }, 'watcher options');
    let watcher = rollup.watch(buildConfig);
    global.log.trace('attaching event handler');
    watcher.on('event', watcherEventHandler.bind(null, () => {
      postProcessBuild(argv, outputConfig);
    }));
  }
  else {
    rollup.rollup(buildConfig).then(bundle => {
      // break out of node promise error handling
      // swallowing errors
      setImmediate(() => {
        invokeHook('postbuildrollup', { buildConfig, bundle });
        if (argv.analyze) {
          console.log('\n\n');
          analyzer.formatted(bundle).then(console.log).catch(console.error);
        }
        global.log.trace({ destinationDir, unbundledKeys }, 'loading external dependencies');
        const packageManagers = argv.npm ? { npm: true, yarn: false } : { npm: true, yarn: true };
        const nvmUse = argv.nvm ? getNodeVersionForRuntime(global.config.configuration.runtime) : null;
        loadExternalDependencies({
          packageManagers,
          nvmUse,
          target: destinationDir,
          unbundledKeys,
          commands: global.betty.build.packgeManagerCommands,
        });
        bundle.write(outputConfig).then(() => {
          postProcessBuild(argv, outputConfig);
          global.log.info('build done');
          done(null);
        });
      });
    });
  }
}
