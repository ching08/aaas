var MODULE_ID = '[content_accedo_api]';
var logger = require("log")(MODULE_ID);
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


    //todo remove it once UPM creates consumers for all households in accedo
    tasks.getConsumer = {
        //Prior to using methods with consumer fingerprints please make sure to use
        //Get Consumer method to provision potentially unregistered fingerprints
        //If this consumer/STB has not called the API previously (i.e. it is a new consumer) the consumer entity
        //will be created and the response will contain the "created" boolean (for existing this will be omitted).

        deps :["createAccedoSession"],
        method: function (data, cb) {
            if(!data.createAccedoSession){
                cb.error(new errorHandler.Error (500, "failed to  create AccedoSession", "CTAP", "EGeneralError"));
            }
            else{
                sessionKey = data.createAccedoSession.session.sessionKey;
                var url = config.apiUrl + "/v2/consumer/" + fingerprint +"?sessionKey=" + sessionKey;
                utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
            }

        }
    };


    tasks.getApps = {
        deps :["getConsumer"],
        method: function (data, cb) {
            var metadata =  args.detailLevel ? "true" : "false";
            var url = config.apiUrl  + "/v2/consumer/" + fingerprint + "/license?sessionKey=" + sessionKey + "&metadata=" + metadata;
            utils.jsonGet(url, sessionInfo, null, cb.ok, cb.error, "accedo");
        }
    };

    tasks.formatResponse = {
        deps :["getApps"],
        method: function (data, cb) {
            var error;

            if(!data.getApps || !data.getApps.licenses) {
                error = new errorHandler.Error (500, "failed to get licenses response from accedo", "CTAP", "EGeneralError");
                cb.error(error);
            }
            else {
                var licenseArr = data.getApps.licenses.license || [];
                var licenses;
                var totalLength;
                if (args.contentIdList === undefined) {
                    totalLength = licenseArr.length;
                    var offset = args.offset ? args.offset : 0;
                    var count = args.count ? args.count : totalLength;
                    //todo for now we are doing the sorting here, which is wrong
                    licenseArr.sort(function(a,b){
                        switch (args.sort){
                            case "title" :
                                var aTitle = a.applications ? a.applications[0].name : "zzzzzz";
                                var bTitle = b.applications ? b.applications[0].name : "zzzzzz";
                                return aTitle - bTitle;
                            default :
                                //sort by purchase time desc.
                                return Date.parse(b.startDate) - Date.parse(a.startDate);

                        }
                    });
                    // accedo doesn't support paging for Get applications for consumer  (/v2/consumer/fingerprint/license)
                    // so get all consumer's applications and return by paging request
                    licenses = licenseArr.splice(offset, count);
                }
                else {
                    // we have to find if the passed application is in the list of applications owned ny the user
                    totalLength = 0;
                    licenses = licenseArr;
                }

                var apps=[];
                licenses.forEach(function (licenseData) {
                    licenseData.applications.forEach(function (application) {

                        // contentIdList contains APP as appi prefix
                        if (args.contentIdList === undefined  ||
                            args.contentIdList.indexOf("APP" + application.id.toString()) !== -1 ) {
                            var personalItem = {};
                            personalItem.title = application.name;
                            personalItem.assetId =  "APP" + application.id;
                            personalItem.assetType = "app";
                            personalItem.isEntitled = true;
                            personalItem.source = "app";
                            personalItem.purchaseDate =  Date.parse(licenseData.startDate);

                            var thumbnails = [];
                            if (args.detailLevel) {

                                if (application.imageFiles && application.imageFiles.length > 0) {
                                    application.imageFiles.forEach(function (poster) {
                                        var aggApiPoster = {};
                                        //aggApiPoster.classification = "urn:nnds:Metro:metadata:MediaTypeCS:2007:2.6";
                                        aggApiPoster.size = "small";
                                        aggApiPoster.type = "regular";
                                        aggApiPoster.mimeType = poster.mimeType;
                                        aggApiPoster.uri = poster.url;
                                        aggApiPoster.height = poster.height;
                                        aggApiPoster.width = poster.width;
                                        thumbnails.push(aggApiPoster);
                                    });
                                }
                                personalItem.genre = application.categories && application.categories.length > 0 ? application.categories[0].name : undefined;
                                personalItem.shortSynopsis = application.metadata && application.metadata.length > 0 ? application.metadata[0].value : undefined;
                                //rentalTime - endAvailability
                                //duration
                            }
                            personalItem.thumbnails = thumbnails;
                            apps.push(personalItem);
                        }
                    });
                });

                var response = {
                    assetList: apps,
                    total: totalLength === 0 ? apps.length : totalLength
                };
                cb.ok(response);
            }
        }
    };


    return tasks;
}


//*************** exported functions ****************//
// API: /personalItems GET
// Return a list of the user's personal applications
// todo This API can be called with either list of specific content to fetch, or using offset+count for paging.
function getPersonalItems (requestParams, sessionInfo, cb) {

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
    aggregator.executeTasks(tasks,  0 /* requestId */, "getPersonalItems-Accedo" /* midjetId */, sessionInfo.fc, apiDone);
}

exports.getPersonalItems = getPersonalItems;