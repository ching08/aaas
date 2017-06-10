var MODULE_ID = '[content_accedo_api]';
var logger = require("log")(MODULE_ID);
//var utils = cmaRootRequire('lib/utils/midjet-utils').utils;
var aggregator = cmaRootRequire('lib/aggregator.js');
var errorHandler = require('./errorHandler.js');
var utils = require('./utils.js');
var config = require('config').thirdparty.appstore;

function createTasks(args, sessionInfo) {
    var tasks = {};
    var fingerprint = sessionInfo.householdId;
    var sessionKey;
    //todo do it once per CMA + renew session when expired
    tasks.createAccedoSession = {
        method: function (data, cb) {
            var url = config.loginUrl + "/auth/createSession?apiKey=" + config.apiKey;
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.getConsumer = {
        //Prior to using methods with consumer fingerprints please make sure to use
        //Get Consumer method to provision potentially unregistered fingerprints
        //If this consumer/STB has not called the API previously (i.e. it is a new consumer) the consumer entity
        //will be created and the response will contain the "created" boolean (for existing this will be omitted).

        deps :["createAccedoSession"],
        method: function (data, cb) {
            sessionKey = data.createAccedoSession.session.sessionKey;
            var url = config.apiUrl + "/v2/consumer/" + fingerprint +"?sessionKey=" + sessionKey;
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.purchaseApp = {
        deps :["getConsumer"],
        method: function (data, cb) {
            // Accedo parameters
            //licenseModel  Integer true    License Model ID
            //fingerprint   String  true    Consumer fingerprint

            var offerId = args.offerId;
            var licenseModel = args.licenseId;
            var url = config.apiUrl  + "/v2/offering/" + offerId + "/purchase?sessionKey=" + sessionKey + "&licenseModel="+ licenseModel + "&fingerprint=" + fingerprint;

            utils.jsonPost(url, sessionInfo, null, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.formatResponse = {
        deps :["purchaseApp"],
        method: function (data, cb) {
            var error;

            if(!data.purchaseApp || !data.purchaseApp.result) {
                logger.debug (0, "msg=ERROR failed to get purchase response");
                error = new errorHandler.Error (500, "failed to purchase app from accedo", "CTAP", "EGeneralError");
                cb.error(error);
            }
            else {
                 /* Example Response (page 57)
                 {
                    "result": {
                        "success": true,
                        "details": {
                            "licenseId": 287421
                        }
                    }
                 }
                */
                if (data.purchaseApp.result && data.purchaseApp.result.success === true) {
                    var response = {
                        success: true,
                        licenseId: data.purchaseApp.result.details.licenseId
                    };
                    cb.ok(response);
                }
                else {
                    error = new errorHandler.Error (500, "error response from accedo for purchase app request", "accedo", "EGeneralError");
                    cb.error(error);
                }
            }
       }
    };


    return tasks;
}



function createDeleteTasks(args, sessionInfo) {
    var tasks = {};
    var fingerprint = sessionInfo.householdId;
    var sessionKey;
    //todo do it once per CMA + renew session when expired
    tasks.createAccedoSession = {
        method: function (data, cb) {
            var url = config.loginUrl + "/auth/createSession?apiKey=" + config.apiKey;
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.deleteApp = {
        deps :["createAccedoSession"],
        method: function (data, cb) {
            sessionKey = data.createAccedoSession.session.sessionKey;
            var offerId = args.itemId;
            var url = config.apiUrl  + "/consumer/" + fingerprint + "/license/" + offerId + "?sessionKey=" + sessionKey;

            utils.deleteReq(url, sessionInfo, null, null, cb.ok, cb.error, "accedo");
        }
    };
    return tasks;
}


//*************** exported functions ****************//
// POST /personalItems
// POST /personalItems/{itemId}
// purchase application
function postPersonalItems (requestParams, sessionInfo, cb) {

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
    aggregator.executeTasks(tasks,  0 /* requestId */, "postPersonalItems-Accedo" /* midjetId */, sessionInfo.fc, apiDone);
}


// API: /personalItems/{item} DELETE
// Delete the item
function deleteGivenPersonalItems (requestParams, sessionInfo, cb) {

    var apiDone = function (err, bundledResult) {
        var formatteddResult = {};
        if (!err) {
            formatteddResult = {response : 200};
            logger.debug("delete response", bundledResult);
            /* actually we igonre the response, which might be
                 {
                    "result": {
                        "success": false,
                         "value": "Couldn't delete license"
                    }
                 }
            */
            cb.ok(formatteddResult);
        }
        else {
            errorHandler.he_api_errorHandler (err, cb.error);
        }
    };
    var tasks = createDeleteTasks (requestParams, sessionInfo);
    aggregator.executeTasks(tasks,  0 /* requestId */, "deleteGivenPersonalItems-Accedo" /* midjetId */, sessionInfo.fc, apiDone);
}


exports.postPersonalItems = postPersonalItems;
exports.deleteGivenPersonalItems = deleteGivenPersonalItems;