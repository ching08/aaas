/* jshint node:true, bitwise: false */ 

var MODULE_ID = "[UTILS]";
var logger = require("log")(MODULE_ID);
var os = require('os');
var config = require("config");
var errorHandler = require('./errorHandler.js');
var util = require('util');
var utils = cmaRootRequire("lib/utils/midjet-utils").utils;

var jsonHandleTransportSuccess = function(onSuccess, onError, body, response) {
    var obj = null;
    
    // body may be empty, and it's ok -- just return null.
    if (body) {
        try {
            obj = JSON.parse(body);
        } catch (parseError) {
            onError({
                error: parseError
            });
            return;
        }
    }

    onSuccess(obj, response);
};

var jsonHandleTransportError = function(onError, errorData) {
    onError(errorData);
};

var extend = function(destination, source) {
    destination = destination || {};
    if (source) {
        for (var property in source) {
            if (source.hasOwnProperty(property)) {
                destination[property] = source[property];
            }
        }
    }
    return destination;
};


module.exports = {

    // Make a request, expect response to be json. onSuccess will get the parsed object.
    // If bodyObject is not null, it is stringified, and content-type is set to json as well.
    jsonReq: function(url, sessionInfo, method, extraHeaders, bodyObject, onSuccess, onError, source) {

        var startTime = Date.now();

        var logStr = utils.createLogStashRequestStr(url, method, sessionInfo, source);
        logger.info(sessionInfo.fc.fcid, logStr);

        // Prepare request
        var options = {
            url: url,
            method: method || "GET",
            headers: {
                "accept": "application/json",
                "user-agent" : "Cisco CTAP CMA NodeJS"
            },
            body: bodyObject ? JSON.stringify(bodyObject) : null
        };
        if (bodyObject) {
            options.headers["content-type"] = "application/json";
        }
        if (extraHeaders) {
            extend(options.headers, extraHeaders);
        }
        
        onSuccess = onSuccess || logger.debug.bind(logger, "Operation successful, but no callback provided.");
        onError = onError || logger.debug.bind(logger, "Operation FAILED, but no callback provided.");
        
        utils.httpReq(options, function(error, response, body) {
            var endTime = Date.now();
            var duration = endTime - startTime;
            var errorData;
            var heError;
            var shortUrl = url.split("?")[0]; // todo :set short url for accedo

            if (error) {
                logger.debug (sessionInfo.fc.fcid, "latency="+duration, "msg=Response from UHE:" + error.code + " for request: " + util.format(options));
                errorData= new errorHandler.Error (null, body,source, undefined, error);

                // Treated separately because response is likely null or undefined.
                jsonHandleTransportError(onError, errorData);
            } else {
                logger.debug(sessionInfo.fc.fcid, "latency="+duration, "msg=Response from UHE:" + response.statusCode + " for request: " + util.format(options));
                if (response.statusCode < 400) {
                    // Success
                    jsonHandleTransportSuccess(onSuccess, onError, body, response);
                }
                else {
					logger.debug(duration, "Response from Accedo:", response.statusCode, " for request: ", options);
                    errorData= new errorHandler.Error (response.statusCode ,body, source, undefined, error);
                     // http error -- statusCode >= 400 (and not 404).
                    jsonHandleTransportError( onError, errorData);
                }
            }
            if (errorData) {
                // Call he_api_errorHandler in order to get the original HE error code and text, to report to logstash
                heError=errorHandler.he_api_errorHandler(errorData,null,true);
            }
            var httpCode = response ? response.statusCode: error && error.code && !isNaN(error.code)? error.code: 500;
            logStr = utils.createLogStashStr(url, method, shortUrl, heError, startTime, endTime, duration, sessionInfo, source, httpCode, options.body);
            var loggerFunc = httpCode >=400 ? logger.error : logger.info;
            loggerFunc(sessionInfo.fc.fcid, logStr);
        });
    },

    jsonGet: function(url, sessionInfo, extraHeaders, onSuccess, onError,source) {
        return this.jsonReq(url, sessionInfo, "GET", extraHeaders, null, onSuccess, onError, source);
    },
    
    jsonPost: function(url, sessionInfo, extraHeaders, bodyObject, onSuccess, onError,source) {
        return this.jsonReq(url, sessionInfo, "POST", extraHeaders, bodyObject, onSuccess, onError,source);
    },
    jsonPut: function(url, sessionInfo, extraHeaders, bodyObject, onSuccess, onError,source) {
        return this.jsonReq(url, sessionInfo, "PUT", extraHeaders, bodyObject, onSuccess, onError,source);
    },
	
	deleteReq: function(url, sessionInfo, extraHeaders, bodyObject, onSuccess, onError,source) {
        return this.jsonReq(url, sessionInfo, "DELETE", extraHeaders, bodyObject, onSuccess, onError,source);
    }
};
