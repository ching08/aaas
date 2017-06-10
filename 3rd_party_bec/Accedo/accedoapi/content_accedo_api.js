var MODULE_ID = '[content_accedo_api]';
var logger = require("log")(MODULE_ID);
var aggregator = require('../../../lib/aggregator.js');
var errorHandler = require('./errorHandler.js');
var utils = require('./utils.js');
var config = require('config').thirdparty.appstore;

var currencyMapper = {
    USD : '$',
    EUR : '€',
    GBP : '£'
};

function createTasks(args, sessionInfo) {
    var tasks = {};
    var start = Date.now();
    var appId = args.contentId ? args.contentId.slice(3): ""; // skip APP in starting of id
    var sessionKey;
    //todo do it once per CMA + renew session when expired
    tasks.createAccedoSession = {
        method: function (data, cb) {
            var url = config.loginUrl + "/auth/createSession?apiKey=" + config.apiKey;
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.getApps = {
        deps :["createAccedoSession"],
        method: function (data, cb) {
            sessionKey = data.createAccedoSession.session.sessionKey;
            //logger.debug("The sort : " + args.sort + "; Genre: " + args.classificationId);
            var url = config.apiUrl + "/v3/applications/" + appId + "?sessionKey=" + sessionKey + "&fields=metadata,imagefiles,categories,offerings,licenseModels";
            switch (args.sort) {
                case "-dateTimeAdded" :
                    break;
                case "-starRating" :
                    url +="&sortBy=rating&sortOrder=desc";
                    break;
                case "popularity" :
                    url +="&sortBy=usage&sortOrder=desc";
                    break;
                case "title" :
                    url +="&sortBy=title";
                    break;
                default :
                    url +="&sortBy=usage&sortOrder=desc";
                    break;

            }
            //logger.debug("AAS request URL: " + url);
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.formatResponse = {
        deps :["getApps"],
        method: function (data, cb) {

            var error;

            if(!data.getApps || !data.getApps.response || !data.getApps.response.data) {
                error = new errorHandler.Error (500, "failed to get app response from accedo", "CTAP", "EGeneralError");
                cb.error(error);
            }
            else {
                cb.ok(data.getApps);
            }
        
       }
    };

    return tasks;
}


//*************** exported functions ****************//
// API: /content GET
// Retrieve a list of assets matching requested criteria
function getContent (requestParams, sessionInfo, cb) {

    //todo validate parameters

    function apiDone(err, bundledResult) {
        if (!err) {
            cb.ok(bundledResult.formatResponse);
        }
        else {
            errorHandler.he_api_errorHandler (err, cb.error);
        }
    }

    var tasks = createTasks (requestParams, sessionInfo);
    aggregator.executeTasks(tasks,  0 /* requestId */, "getContent-Accedo" /* midjetId */, sessionInfo.fc, apiDone);
}


exports.getContent = getContent;
