# betty
Simple command line utility for developing and deploying AWS Lambda functions.

## Prerequisites

- Create an IAM role for your lambda function
- Make sure you have `AWS_PROFILE` or equivilent required env variables set so aws-sdk can pick them up
- Create a `project.json` file as described below (based on the apex file)

## Getting started

### Creating a sample project
```sh
mkdir my-project && cd my-project
echo '{}' > project.json
echo '{ "name": "test-betty-function", "role":  }'
npm install cmawhoter/betty --save-dev
mkdir dist
echo 'exports.handler = function(event, context, callback) { callback(null, "hello " + Date.now()); };' > dist/index.js
```

### Running betty

All commands should be from project root.

#### Serving locally

You can serve your lambda function locally as an emulated API Gateway proxied function.

```sh
betty serve
Server running at:  http://localhost:3000
```

Open http://localhost:3000 up in a browser and the console will output `hello 1234567890`.  (Note: There will be an error too because our function isn't returning a properly formatted API Gateway response.)

#### Update AWS

Bundles the contents of `dist/` into a zip file suitable for lambda and creates/updates the remote function.

```sh
betty update --region us-west-2
```

Alternatively, you can run the following to just create the zip and exit without making any calls to aws lambda:

```sh
betty update --test
```

## project.json

```js
{
  "name": "some-function-name",
  "description": "the description displayed with the function in aws lambda",
  "runtime": "nodejs4.3",
  "memory": 512,
  "timeout": 25,
  // can be a full 'arn:' path or relative role
  "role": "ulp_lambda_function", 
  // the local entry point for the function.  depending on if you're using
  // a build tool or not, this may be different than the source files
  "main": "dist/index.js",
  // the lambda entry point.  (this is what you'd manually type into lambda)
  "entry": "index.handler",
  // can either be a key/string object or a javascript string
  // *** 
  // don't store secrets here.  store them 
  // in separate file not in git.
  // see below for strategy
  // ***
  "environment": { "some": "env variable" }
}
```

### project.environment

If `project.environment` is a string, it'll be eval'd and the result populate environment.

This allows you to do this for staged env vars.

```
  "environment": "load(`env-${process.env.NODE_ENV}.json`)"
```

Because `require` is relative to the source file it can't be used.  `load()` basically does the same thing so you don't have to JSON.parse(fs.read blah blah.
