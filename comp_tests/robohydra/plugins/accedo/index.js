/**
 * Created by Rstern on 27/12/2015.
 */

var robohydra = require("robohydra");

var flow_context = require('node-flow-context');
var log4js = require('log4js');

var log4js_config = {
    "appenders": [{
        "type": "console",
        "layout": {
            "type": "pattern",
            "pattern": "%[%d{ISO8601_WITH_TZ_OFFSET} %p %c -%] %m",
            "tokens": {}
        }
    }]
};

log4js.configure(log4js_config, {});
var fc_factory = new flow_context.factory(log4js.getLogger('SERVER::accedo_mock:Mock'));

var RoboHydraHead = require("robohydra").heads.RoboHydraHead;
var request = require('request');
var utils = require(process.env.AAAS_HOME + '/comp_tests/robohydra/plugins/accedo/lib/utils.js');

var createSession_path = "/auth/createSession"; //?apiKey=:apiKey;
var createConsumer_path = "/v2/consumer/:fingerprint"; //?sessionKey=:sessionKey;
var browseApps_path = "/v3/applications"; //?sessionKey=:sessionKey
var getOffering_path = "/v3/applications/:appId/offering"; //?sessionKey=:sessionKey
var getAppInfo_path = "/v3/applications/:appId"; //?sessionKey=:sessionKey
var getAppCategories_path = "/v3/categories"; //?sessionKey=:sessionKey
var libraryInfo_path = "/v2/consumer/:fingerprint/license"; //?sessionKey=:sessionKey&metadata=false
var purchase_POST_path = "/v2/offering/:offeringId/purchase"; //?sessionKey=:sessionKey&licenseModel=22&fingerprint=:fingerprint
var license_DELETE_path = "/consumer/:fingerprint/license/:licenseId"; //?sessionKey=:sessionKey

var App = require("./app.js");
var License = require("./license.js");
var Offering = require("./offering.js");
var Category = require("./category.js");
var fc = fc_factory.create({});
var cmaConfig = require(process.env.AAAS_HOME + "/etc/default.json");

var config = {
    availableApps: [121,122,151,152,153,154,155,156,157,158,159,160],
    categories: [
        {
            "name" : "News And Weather",
            "id" : "101"
        },
        {
            "name" : "Video",
            "id" : "100"
        },
        {
            "name" : "Audio",
            "id" : "99"
        },
        {
            "name" : "Default",
            "id" : "50"
        }
    ]

}

function Consumer(id) {
    this.fingerprint = id;
    this.licensedOfferings = [];
}

var consumers = [];
var apiKey = getApiKey();

exports.getBodyParts = function(conf) {
    var he_config = utils.getHeConfig (conf);

    return {
        scenarios : {
            dynResults : {
                heads: [
                    //createSession
                    new RoboHydraHead({
                        path: createSession_path,
                        method: "get",
                        handler:function(req,res,next) {
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + createSession_path);
                            if(req.queryParams.apiKey !== undefined) {
                                if(req.queryParams.apiKey === apiKey) {
                                    var now = new Date();
                                    var resp = {
                                        session: {
                                            authenticated : false,
                                            created : now,
                                            sessionKey : req.queryParams.apiKey + now.getTime().toString(16),
                                            userId : 0
                                        }
                                    };
                                    sendJsonResponse(res, resp);
                                } else {
                                    sendError({
                                        error : {
                                            status : "401 UNAUTHORIZED",
                                            message : "Invalid API Key: " + req.queryParams.apiKey,
                                            code : "401"
                                        }
                                    }, res);
                                }
                            } else {
                                sendError({
                                    error : {
                                        status : "500 INTERNAL SERVER ERROR",
                                        message : "Required String parameter 'apiKey' is not present",
                                        code : "500"
                                    }
                                }, res);
                            }
                        }
                    }),
                    //createConumer
                    new RoboHydraHead({
                        path: createConsumer_path,
                        method: "get",
                        handler:function(req,res,next) {
                            var fingerprint = req.params.fingerprint;

                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + createConsumer_path);

                            if(handleSessionKeyErrors(req, res)) {
                                resp = {
                                    consumer: {
                                        fingerprint : fingerprint,
                                        canPurchaseLicense : true
                                    }
                                };

                                if(consumers[fingerprint] === undefined) {
                                    consumers[fingerprint] = new Consumer(fingerprint);
                                }
                                sendJsonResponse(res, resp);
                            }
                        }
                    }),
                    //browserApps
                    new RoboHydraHead({
                        path: browseApps_path,
                        method: "get",
                        handler:function(req,res,next) {
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + browseApps_path);
                            fc.info('cwd>>'+process.cwd());
                            if(handleSessionKeyErrors(req, res)) {
                                var resp = {
                                    response : {
                                        "data" : []
                                    }
                                };

                                fc.info("Current array of available apps>>" + config.availableApps.valueOf());
                                config.availableApps.forEach(function(appId) {
                                    resp.response.data.push(new App(appId));
                                });

                                sendJsonResponse(res, resp);
                            }
                        }
                    }),
                    //getOffering
                    new RoboHydraHead({
                        path: getOffering_path,
                        method: "get",
                        handler:function(req,res,next) {
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + getOffering_path);
                            if(handleSessionKeyErrors(req, res)) {

                                var appId = parseInt(req.params.appId);
                                if (config.availableApps.indexOf(appId) === -1) {
                                    sendError({
                                        error : {
                                            "status" : "404 NOT FOUND",
                                            "message" : "Application does not exist",
                                            "code" : "404"
                                        }
                                    }, res);
                                } else {
                                    var resp = {
                                        offerings : {
                                            "offering" : [
                                                new Offering(10000 + appId)
                                            ],
                                            count: 1
                                        }
                                    };
                                    sendJsonResponse(res, resp);
                                }
                            }
                        }
                    }),
                    //getAppInfo
                    new RoboHydraHead({
                        path: getAppInfo_path,
                        method: "get",
                        handler:function(req,res,next) {
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + getAppInfo_path);
                            if(handleSessionKeyErrors(req, res)) {

                                var appId = parseInt(req.params.appId);
                                if (config.availableApps.indexOf(appId) === -1) {
                                    sendError({
                                        error : {
                                            "status" : "404 NOT FOUND",
                                            "message" : "Application does not exist",
                                            "code" : "404"
                                        }
                                    }, res);
                                } else {
                                    var resp = {
                                        response : {
                                            "data" : [
                                                new App(appId)
                                            ]
                                        }
                                    };

                                    sendJsonResponse(res, resp);
                                }
                            }
                        }
                    }),
                    //getAppCategories
                    new RoboHydraHead({
                        path: getAppCategories_path,
                        method: "get",
                        handler:function(req,res,next) {
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + getAppCategories_path);
                            fc.info('cwd>>'+process.cwd());
                            if(handleSessionKeyErrors(req, res)) {
                                var resp = {
                                    response : {
                                        "_metadata": {
                                            "_links": {}, 
                                            "availableItems": config.categories.length, 
                                            "availablePages": 1, 
                                            "page": 1, 
                                            "pageSize": 1000
                                        }, 
                                        "data" : []
                                    }
                                };

                                fc.info("Current array of categories>>" + config.categories.valueOf());
                                config.categories.forEach(function(category) {
                                    resp.response.data.push(new Category(category));
                                });

                                sendJsonResponse(res, resp);
                            }
                        }
                    }),
                    //LibraryInfo
                    new RoboHydraHead({
                        path: libraryInfo_path,
                        method: "get",
                        handler:function(req,res,next) {
                            var fingerprint = req.params.fingerprint;
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + libraryInfo_path);
                            if(handleSessionKeyErrors(req, res)) {

                                if (consumers[fingerprint] === undefined) {
                                    sendError({
                                        error : {
                                            "status" : "400 BAD REQUEST",
                                            "message" : "Consumer with fingerprint: " + fingerprint + " does not exist.",
                                            "code" : "400"
                                        }
                                    }, res);
                                } else {
                                    var resp = {

                                        licenses : {
                                            "license" : []
                                        }
                                    };

                                    consumers[fingerprint].licensedOfferings.forEach(function(item) {
                                        resp.licenses.license.push(new License(item))
                                    });
                                    fc.info("licenses>>"+ JSON.stringify(resp));
                                    sendJsonResponse(res, resp);
                                }
                            }
                        }
                    }),
                    //purchase
                    new RoboHydraHead({
                        path: purchase_POST_path,
                        method: "post",
                        handler:function(req,res,next) {
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + purchase_POST_path);
                            if(handleSessionKeyErrors(req, res)) {
                                var fingerprint = req.queryParams.fingerprint;
                                var offeringId = parseInt(req.params.offeringId);
                                var appId = offeringId - 10000;

                                fc.info("Current array of available apps>>" + config.availableApps.valueOf());
                                if (consumers[fingerprint] === undefined) {
                                    sendError({
                                        error : {
                                            "status" : "400 BAD REQUEST",
                                            "message" : "Could not find consumer with fingerprint: " + fingerprint + ", on instance <n>..",
                                            "code" : "400"
                                        }
                                    }, res);
                                } else if (consumers[fingerprint].licensedOfferings.indexOf(offeringId) > -1) {
                                    sendError({
                                        error : {
                                            "status" : "400 BAD REQUEST",
                                            "message" : "The consumer: " + fingerprint + " has already a valid license of this offering " + offeringId,
                                            "code" : "400"
                                        }
                                    }, res);
                                } else if (config.availableApps.indexOf(appId) === -1) {
                                    sendError({
                                        error : {
                                            "status" : "404 NOT FOUND",
                                            "message" : "Offering does not exist " + offeringId,
                                            "code" : "404"
                                        }
                                    }, res);
                                } else {

                                    fc.info("Current array of licensed offerings>>" + consumers[fingerprint].licensedOfferings.valueOf());

                                    var resp = {
                                        result: {
                                            "success" : true,
                                            "details" : {
                                                "licenseId" : ""+Math.floor(Math.random() * 89999 + 10000).toString()
                                            }
                                        }
                                    };


                                    consumers[fingerprint].licensedOfferings.push(offeringId);
                                    fc.info("New array of licensed offerings>>" + consumers[fingerprint].licensedOfferings.valueOf());
                                    sendJsonResponse(res, resp);
                                }
                            }
                        }
                    }),
                    //License_DELETE
                    new RoboHydraHead({
                        path: license_DELETE_path,
                        method: "delete",
                        handler:function(req,res,next) {
                            var licenseId = parseInt(req.params.licenseId);
                            var fingerprint = req.params.fingerprint;

                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo: ' + license_DELETE_path);

                            if(handleSessionKeyErrors(req, res)) {
                                var index = consumers[fingerprint].licensedOfferings.indexOf(licenseId);
                                fc.info("Current array of licensed offerings>>" + consumers[fingerprint].licensedOfferings.valueOf());
                                if (consumers[fingerprint] === undefined || index === -1) {
                                    resp = {
                                        result: {
                                            "success" : false,
                                            "value" : "Couldn't delete license"
                                        }
                                    };
                                } else {
                                    resp = {
                                        result: {
                                            "success" : true,
                                            "value" : "Succesfully canceled license"
                                        }
                                    };

                                    consumers[fingerprint].licensedOfferings.splice(index, 1);
                                }

                                fc.info("New array of licensed offerings>>" + consumers[fingerprint].licensedOfferings.valueOf());
                                sendJsonResponse(res, resp);
                            }
                        }
                    })
                ]
            },
            proxy:{
                heads:[
                    new RoboHydraHead({
                        path:'.*',
                        handler:function(req,res){
                            var fc = fc_factory.create(req.headers);
                            fc.info('accedo proxy handler: .*');
                            var domain;
                            if(req.url.indexOf(createSession_path) > -1) {
                                domain = he_config.accedo.login;
                            } else {
                                domain = he_config.accedo.api;
                            }
                            fc.info("Proxy to: " + req.method + ' http://' + domain + req.url);
                            var options={
                                url:'http://' + domain + req.url,
                                method: req.method,
                                headers: {
                                    "User-Agent" : "Cisco CTAP CMA NodeJS"
                                }
                            };
                            if (
                                (req.rawBody) &&
                                (req.rawBody.length) &&
                                (['PUT','POST','PATCH'].indexOf(req.method)>-1)
                            ){
                                options.body=req.rawBody;
                            }
                            request(options,function (error, response, body){
                                var fc = fc_factory.create(req.headers);
                                if (!error){
                                    res.headers=response.headers;
                                    //fc.add_header(res.headers);
                                    fc.info("returning " + response.statusCode + "with body " + body);
                                    res.statusCode=response.statusCode;
                                    res.send(body);
                                }else{
                                    fc.error('proxy error',error);
                                    res.end();
                                }
                            });
                        }
                    })
                ]
            }
        }
    };
};

function sendJsonResponse(res, resp) {
    res.writeHead(200, {"Content-Type":"application-json"});
    res.send(JSON.stringify(resp));

}

function sendError(error, res) {
    var fc = fc_factory.create(res.headers);
    res.writeHead(error.error.code, {"Content-Type":"application-json"});
    res.send(JSON.stringify(error));
}

function handleSessionKeyErrors(req, res) {
    if (req.queryParams.sessionKey !== undefined) {
        if (req.queryParams.sessionKey.indexOf(apiKey) != 0) {
            sendError({
                error : {
                    status : "401 UNAUTHORIZED",
                    message : "Access is denied without valid Session Key",
                    code : "401"
                }
            }, res);

            return false;
        }
    } else {
        sendError({
            error : {
                status : "401 UNAUTHORIZED",
                message : "Access is denied",
                code : "401"
            }
        }, res);

        return false;
    }

    return true;
}

function getApiKey() {
    var appStore = cmaConfig.thirdparty.appstore;
    if(appStore.provider === "accedo") {
        return appStore.apiKey;
    } else {
        return null;
    }

}
