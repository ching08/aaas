//*************** Constants ****************//
var MODULE_ID  = '[router]';

// *************** Require External Modules ****************//

var cma  = require('./cma.js');
var url = require('url');
var flow_context = require('node-flow-context');
var logger = require("log")(MODULE_ID);
var config = require('config');
var utils = cmaRootRequire('lib/utils/utils.js');
//*************** Global vars ****************//

var fc_factory = new flow_context.factory(logger);


//*************** External Functions ****************//

function route(request,response) {
	var fc = fc_factory.create(request.headers);
    
    var midjetId  = request.headers.requestid;
    fc.midjetId = midjetId;

    // save info for debugging purpose, and performance checks
    request.fc = fc;
    response.midjetId = midjetId;
	response.startTime = Date.now();
	response.url = 'http://' + utils.myHostname()+  ":" + config.server.port  + request.url;
	
	exports.headers = request.headers;
   if (request.url === '/favicon.ico') {
       response.writeHead(200, {'Content-Type': 'image/x-icon'} );
       response.end();
       logger.debug(0, 'favicon requested');
	   return;
   }
   var pathname = url.parse(request.url).pathname;
  //logger.debug(pathname);
  logger.debug(fc.fcid, "msg=About to route a request for " + pathname);
  if (pathname.split('/').length<3){
      response.writeHead(200, {"Content-Type": "text/plain"});
      response.write("ERROR - wrong url");
      response.end();
  }
  else{
      cma.handleCueRequest(request,response);
  }
}

exports.route = route;
