var MODULE_ID = '[categories_accedo_api]';
var logger = require("log")(MODULE_ID);
var aggregator = cmaRootRequire('lib/aggregator.js');
var errorHandler = require('./errorHandler.js');
var utils = require('./utils.js');
var config = require('config').thirdparty.appstore;

function Category(obj){
    var self = this;
    self.description = obj.name;
    self.id = obj.id;
    self.title = obj.name;
    self.shortName = obj.name;
    self.type = 1;
    self.leaf = true;
}

function createTasks(args, sessionInfo) {
    var tasks = {};
    var start = Date.now();
    var sessionKey;
    //todo do it once per CMA + renew session when expired
    tasks.createAccedoSession = {
        method: function (data, cb) {
            var url = config.loginUrl + "/auth/createSession?apiKey=" + config.apiKey;
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.getAppCategories = {
        deps :["createAccedoSession"],
        method: function (data, cb) {
            sessionKey = data.createAccedoSession.session.sessionKey;
            var url = config.apiUrl + "/v3/categories?sessionKey=" + sessionKey + "&fields=applications";
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.formatResponse = {
        deps :["getAppCategories"],
        method: function (data, cb) {

            var error;

            if(!data.getAppCategories || !data.getAppCategories.response || !data.getAppCategories.response.data) {
                error = new errorHandler.Error (500, "failed to get app catgory response from accedo", "CTAP", "EGeneralError");
                cb.error(error);
            }

            else {
                cb.ok(data.getAppCategories);
            }
        }

    };

    return tasks;

}




//*************** exported functions ****************//
// API: /getCategories GET
// Obtain a list of categories for apps
function getCategories (requestParams, sessionInfo, cb) {

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
    aggregator.executeTasks(tasks,  0 /* requestId */, "getCategories-Accedo" /* midjetId */, sessionInfo.fc, apiDone);
}



exports.getCategories = getCategories;