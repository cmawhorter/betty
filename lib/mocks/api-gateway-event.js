'use strict';

var uuid = require('uuid');

module.exports = function(request) {
  return {
    "resource": "/{proxy+}",
    "path": "/" + request.params.mock,
    "httpMethod": request.method.toUpperCase(),
    "headers": request.headers,
    "queryStringParameters": request.query,
    "pathParameters": {
      "proxy": request.params.mock
    },
    "stageVariables": null,
    "requestContext": {
      "accountId": "754649399213",
      "resourceId": "aaihdz",
      "stage": "test-invoke-stage",
      "requestId": uuid.v4(),
      "identity": {
        "cognitoIdentityPoolId": null,
        "accountId": "754649399213",
        "cognitoIdentityId": null,
        "caller": "754649399213",
        "apiKey": "test-invoke-api-key",
        "sourceIp": "test-invoke-source-ip",
        "accessKey": "ASIAIMPHTMEZBZ6BZ5OA",
        "cognitoAuthenticationType": null,
        "cognitoAuthenticationProvider": null,
        "userArn": "arn:aws:iam::754649399213:root",
        "userAgent": "Apache-HttpClient/4.5.x (Java/1.8.0_102)",
        "user": "754649399213"
      },
      "resourcePath": "/{proxy+}",
      "httpMethod": request.method.toUpperCase(),
      "apiId": "f9pocn2kn4"
    },
    "body": JSON.stringify(request.body),
    "isBase64Encoded": false
  };
};
