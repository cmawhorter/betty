module.exports = {
  "universe": "aws",
  "region": "us-west-2",
  "name": "some-service",
  "description": "this is some service",
  "version": "0000-00-00",
  "repository": "github",
  "author":  "Bob",
  "contributors": [
    { "name": "Jim" },
  ],
  "maintainers": [
    { "name": "Ted" },
  ],
  "configuration": {
    memory: 128,
    timeout: 10,
    source: "src/main.js",
    main: "dist/index.js",
    entry: "index.handler",
    environment: {
      "some": "variable"
    }
  },
  "assets": [
    { service: "s3", name: "some-bucket/with-prefix", permissions: [ "s3:GetObject", "s3:PutObject" ] },
    { service: "sns", name: "some-service-dlq", permissions: [ "sns:Publish" ] },
  ],
  "policy": [
    { service: "lambda", name: "some-service", permissions: [ "lambda:InvokeFunction" ] },
  ],
  "resources": {
    "some-image-processing-dependency": "*"
  },
  "client": "github:blah/some-service.git",
  "health": "url for cloudwatch",
  "manage": "url for s3 or wherever",
  "readme": "README.md",
  "keywords": [
    "image",
    "thumbnail"
  ],
};
