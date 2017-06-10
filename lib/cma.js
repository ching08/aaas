var fs = require('fs');
var config = require('config');
var urlParse = require('url').parse;
var path = require("path");
var dir = require("node-dir");
var querystring = require('querystring');
var Aggregator = require('./aggregator.js');
var MODULE_ID = '[cma]';
var ACTION_MIDJET_ID = "action";
var pathToMidjetMap = {};
var actionMap = {};
var router = require('./router');
var flow_context = require('node-flow-context');
var logger = require("log")(MODULE_ID);
var utils = cmaRootRequire('lib/utils/midjet-utils.js').utils;
var responseFormatter = cmaRootRequire("plugins/he_api/" + utils.getHeApi() + "/responseFormatter.js");
var util= require('util');

var fc_factory = new flow_context.factory(logger);

function initActionMap(doneCb){
    var actionDir = config.useCmue  ? '../cma/actions' : './actions';
    var key;
    var reSep = new RegExp("\\" + path.sep, "g");
    dir.files(actionDir, function(err, files) {
        if (err) {
            throw err;
        }
        for ( var i = 0; i < files.length; i++) {



            key = files[i];
            key = path.relative(actionDir, key);
            key = key.replace(reSep, "/"); // normalized to unix style sep'
            var pathToFile = path.relative(__dirname, files[i]);
            if (key.indexOf('.js') > -1) {
                actionMap[key] = require(pathToFile);
            }
        }
        // logger.debug(actionMap);
        if (doneCb){
            doneCb();
        }
    });
}
function init(doneCb) {
    var midjets_dir = config.useCmue ? '../cma/midjets' : './midjets';
    var key;
    var reSep = new RegExp("\\" + path.sep, "g");
    dir.files(midjets_dir, function(err, files) {
        if (err) {
            throw err;
        }
        for ( var i = 0; i < files.length; i++) {



            key = files[i];
            key = path.relative(midjets_dir, key);
            key = key.replace(reSep, "/"); // normalized to unix style sep'
            var pathToFile = path.relative(__dirname, files[i]);
            if (key.match(/\.js$/)) {
                pathToMidjetMap[key] = require(pathToFile);
            }
        }
        // logger.debug(pathToMidjetMap);
        initActionMap(doneCb);
    });

}


// localhost:8888/tenant/grid [post]

function getMidjetIdFromUrl(url) {
    return url.split('/')[2];
}




function getMidjet( midjetId) {
    var key =  midjetId + '.js';
    return pathToMidjetMap[key];
}



function getActionResource(actionParams){
    var key =  actionParams.actionResource + '.js';
    return actionMap[key];
}

function logEndTime (midjetId, response, fc, http_code) {
    var endTime = Date.now();
	var duration =  endTime - response.startTime;
    if (!response.sessionInfo) {
        response.sessionInfo = {};
        response.sessionInfo.householdId = "error";
        response.sessionInfo.deviceId = "error";
        response.sessionInfo.api = "error";
        response.fc=fc;
    }
    var loggerFunc = http_code >=400 ? logger.error : logger.info;
    var logStr = utils.createLogStashStr (response.url, "POST", undefined/*shortUrl*/, undefined/*beError*/, response.startTime, endTime, duration, response.sessionInfo, "cma", http_code, undefined/*body*/);
    loggerFunc((fc ? fc.fcid : "0"), logStr);
}

function processPost(request, response, onDone) {
    var queryData = "";
    if (typeof onDone !== 'function') {
        return null;
    }

    if (request.method === 'POST') {
        request.setEncoding('utf8');
        request.on('data', function(data) {
            queryData += data;
            if (queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });

        request.on('end', function() {
            onDone(queryData);
        });

    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.write("Only POST for now");
        response.end();
        
        logEndTime ("", response, request.fc, 405);
    }
}


var requestCompleted = function(response, err, data, midjetId, fc) {
    if (err) {
        var http_code = err.http_code ? err.http_code : 404;
        response.writeHead(http_code, {
            "Content-Type" : "application/json",
            "Access-Control-Allow-Origin" : "*"
        });
        var result ;
        try {
            result = JSON.stringify(err.errorBody);
        } catch (stringifyErr) {
            logger.error(fc.fcid, "msg=\"cant stringify error " + err.errorBody.toString().replace(/,/g, ";") + "\"");
            result = stringifyErr.toString();
        }
        if (!result){
            result = "Cant handle task";
        }

        response.write(result);
        response.end();
        
        logEndTime (midjetId, response, fc, http_code);
     } else {
        logger.debug(" after build data");
        response.writeHead(200, {
            "Content-Type" : "application/json",
            "Access-Control-Allow-Origin" : "*"
        });

        response.write(JSON.stringify(data));
        response.end();
        
        logEndTime (midjetId, response, fc, 200);
    }
};


function handleCmueRequest(midjetId, clientConfig,callback, cueObject){
    var tasks ={};
    var error;
    var errMessage;
    function midjetDone(err,bundledResult){
        var aggregatedResult = {};
        if (err) {
            callback(err, err.errorBody);
        } else {
            // var aggregate = getAggregateFromMidjet(midjet);
            logger.debug(cueObject.fc.fcid+" before getSchema");
            try {
                var startTime = Date.now();
                logger.debug(cueObject.fc.fcid, "BF", 'ResponseFormatter', "task=buildData");
                aggregatedResult = responseFormatter.buildData(bundledResult, cueObject.midjetConfig,cueObject.reqParams);
                logger.debug(cueObject.fc.fcid, "AFOK", 'ResponseFormatter', "task=buildData", 'duration=' + (Date.now()-startTime));
            } catch (err1) {
                err = new utils.Error (404, err1.stack, "CTAP", "EGeneralError");
            }
            callback(err, aggregatedResult);
        }
    }

    if (midjetId===ACTION_MIDJET_ID){
        var actionParams = cueObject.actionParams;
        var actionResource = getActionResource(actionParams);
        if (actionResource) {
            var actionMidgetcb = function(err, data) {
                if (err) {
                    callback(err, err.errorBody);
                }else {
                    callback(err, (data.formatedResponse || {}));
                }
            };
            //createTasks will use the given action and data to create the task that performs the action on the resouce
            tasks = actionResource.createTasks(actionParams.action,cueObject.reqParams, cueObject.sessionInfo,cueObject.actionConfig);
            if(!tasks){
                errMessage = "Can't find action " + actionParams.action +" for resource " + actionResource ;
                logger.error(cueObject.fc.fcid, "msg=" + errMessage);
                error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
                callback(error,{});
            }
            else{
                logger.debug(cueObject.fc.fcid_token, " before executeTasks");
                Aggregator.executeTasks(tasks, 0, actionParams.actionResource+"/"+actionParams.action, cueObject.fc, actionMidgetcb);
                logger.debug(cueObject.fc.fcid_token, " after executeTasks");
            }
        }
        else{
            errMessage = "Can't find action resource";
            logger.error(cueObject.fc.fcid, "msg=" + errMessage);
            error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
            callback(error,{});
        }
    }
    else{
        var midjet = getMidjet(midjetId);
        if (midjet) {
            tasks = midjet.createTasks(cueObject.midjetConfig, cueObject.reqParams, cueObject.sessionInfo);
            logger.debug(cueObject.fc.fcid + " before executeTasks");
            Aggregator.executeTasks(tasks, 0, midjetId, cueObject.fc, midjetDone);
            logger.debug(cueObject.fc.fcid + " after executeTasks");
        }
        else{

            errMessage = "Can't find midjet midjetId=" + midjetId;
            logger.error(cueObject.fc.fcid, "msg=" + errMessage);
            error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
            callback(error, {});
        }
    }

}

function handleCueRequest(request, res) {
    var errMessage;
    var error;
	var fc = request.fc ? request.fc : fc_factory.create();
    var requestStartTime = Date.now();
    function runAction( midjetId, clientConfig,response, bodyData){
        var reqParams = bodyData.reqParams;
        var actionParams = bodyData.actionParams;
        if (!actionParams) {
            errMessage = "Can't find actionParams in body";
            logger.error(fc, "msg=" + errMessage);
            error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
            requestCompleted(response, error, {}, request.url, fc);
            return;
        }
        var actionResource = getActionResource(actionParams);
        
        function actionDone(err,data){
            requestCompleted(response,err, (data.formatedResponse || {}), actionParams.actionResource, fc);
        }
        if (actionResource) {
            //createTasks will use the given action and data to create the task that performs the action on the resouce 
            var tasks = actionResource.createTasks(actionParams.action,reqParams, bodyData.sessionInfo,bodyData.actionConfig);
            if(!tasks){
                errMessage = "Can't find action " + actionParams.action +" for resource " + actionResource ;
                error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
                requestCompleted(response, error, {}, actionParams.actionResource, fc);
            }
            else{
                logger.debug(fc.fcid_token, " before executeTasks");
                Aggregator.executeTasks(tasks, 0, midjetId + "-" + actionParams.actionResource+"/"+actionParams.action, fc, actionDone);
                logger.debug(fc.fcid_token, " after executeTasks");
            }

        } else {
            errMessage = "Can't find actionResource";
            error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
            logger.error(fc.fcid, "msg=" + errMessage);
            requestCompleted(response, error, {}, actionParams.actionResource, fc);
        }
    }
    function runMidjet(midjetId, clientConfig,response, bodyData) {
        var midjet = getMidjet( midjetId); // this is the project
        function midjetDone(err,bundledResult){
            var aggregatedResult = {};
            if (!err){
                try {
                    aggregatedResult = responseFormatter.buildData(bundledResult, bodyData.midjetConfig,bodyData.reqParams, bodyData.sessionInfo);
                } catch (err1) {
                    err = new utils.Error (404, err1.stack, "CTAP", "EGeneralError");
                }
            }
            requestCompleted(response,err, aggregatedResult,midjetId, fc);
        }
        if (midjet) {
            var tasks = midjet.createTasks(bodyData.midjetConfig,bodyData.reqParams, bodyData.sessionInfo, bodyData.actionConfig);
            logger.debug(fc.fcid+"before executeTasks");
            Aggregator.executeTasks(tasks, 0 /*requestId*/, midjetId, fc, midjetDone);
            logger.debug(fc.fcid+"after executeTasks");
        } else {
            errMessage = "Can't find midjet midjetId=" + midjetId;
            error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
            requestCompleted(response, error, {}, midjetId, fc);
        }
    }

    processPost(request, res, function(queryData) {
        var midjetId;
        try {
            var bodyData;
            logger.debug(fc.fcid, "msg=" + queryData);
            try {
                bodyData = JSON.parse(queryData);
                // add flow context to pass to H/E
                bodyData.sessionInfo.fc = fc;
                res.sessionInfo = bodyData.sessionInfo;
                var url = res.url;
                var clientIp = request.headers['x-forwarded-for'] ||
                    request.connection.remoteAddress;

                var logStr = utils.createLogStashRequestStr(url, "POST", res.sessionInfo, "cma");
                logger.info(bodyData.sessionInfo.fc.fcid, logStr, "clientIp="+clientIp.toString().replace(/,/g, ";"));
            }
            catch (parseErr) {
                errMessage ="error in parsing body";
                logger.error(fc.fcid, "msg=" + errMessage);
                error = new utils.Error (404, errMessage, "CTAP", "EGeneralError");
                requestCompleted(res, error, {}, request.url, fc);
                return;
            }
            var url_parts = urlParse(request.url, true);
            var urlPath = url_parts.pathname;
            midjetId = getMidjetIdFromUrl(urlPath);
            var clientConfig="";
            if (midjetId===ACTION_MIDJET_ID){
                runAction(midjetId, clientConfig,res, bodyData);
               
            }
            else{
                runMidjet(midjetId, clientConfig,res, bodyData);
            }
        } catch (err) {
            logger.error(fc.fcid, "msg=" + err.stack);
            logger.error(fc.fcid, "msg=\"" + err.toString().replace(/,/g, ";")+ "\"");
            requestCompleted(res, err, {}, midjetId, fc);
        }

    });

}

exports.init = init;
exports.handleCueRequest = handleCueRequest;
exports.handleCmueRequest = handleCmueRequest;
