'use strict';

const Hapi = require('hapi');
const createContext = require('./mocks/lambda-context.js');
const createApiGatewayEvent = require('./mocks/api-gateway-event.js');

let apigatewayRequestHandler = function(lambdaHandler) {
  return (request, reply) => {
    let context = createContext((err, invocationOutcome) => {
      if (err) {
        console.log('[Betty] Error Result: ', err.stack || err);
        reply(err);
      }
      else {
        console.log('[Betty] Success Result: ', invocationOutcome);
        let response = reply(JSON.parse(invocationOutcome.body || 'null'));
        response.type('application/json');
        response.code(invocationOutcome.statusCode);
        let headers = invocationOutcome.headers || {};
        for (let k in headers) {
          response.header(k, headers[k]);
        }
      }
    });
    let event = createApiGatewayEvent(request);
    lambdaHandler(event, context, context.done);
  };
};

module.exports = function(lambdaHandler, type) {
  let server = new Hapi.Server();

  server.connection({
    port: process.env.PORT || 3000,
  });

  let requestHandler;
  switch (type) {
    default:
    case 'apigateway':
      requestHandler  = apigatewayRequestHandler;
    break;
  }
  server.route({
    method: [ 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE' ],
    path: '/{mock*}',
    handler: requestHandler(lambdaHandler),
  });

  server.start(err => {
    if (err) throw err;
    console.log('Server running at: ', server.info.uri);
  });

  return server;
};
