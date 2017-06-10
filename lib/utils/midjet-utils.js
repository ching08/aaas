var MODULE_ID = '[midjet-utils]';
var logger = require("log")(MODULE_ID);
var config = require('config');
var urlLib = require('url');
var http = require('http');
var util = require('util');

var requiredHeaders = ["x-cisco-vcs-identity", "x-routing-labels"];

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

exports.utils = {
    /**
     * an helper function , takes a requested key from an array of object and returns an array of the requestes key
     * @method getValuesFromObjectArray
     * @param array  [{"a" : 1, "b": 2}, {"a" :2 , "c" :4}]
     * @param key "a"
     * @return newArray
     */
    getValuesFromObjectArray: function(array,key){
        var newArray = [];
        for(var i = 0; i<array.length; i++){
            if(array[i] && array[i][key]){
                newArray.push(array[i][key]);
            }

        }
        return newArray;
    },

  /**
    * converts time into duration
    * @method getDuration
    * @return number, calculated duration or -1 if failed
    */
    getDuration: function(time,asSeconds) {
        var timeBase = asSeconds? 1: 1000;
        var timeInAMinute = timeBase * 60;
        var timeInAnHour = timeInAMinute * 60;
        var timeArray = time.split(":");
        return timeArray[0] * timeInAnHour + timeArray[1] * timeInAMinute + timeArray[2] * timeBase;
    },
    findEntitlement : function(assetOffers, titles, subscriptions){
        var entitledOffer;
        if (titles) {
            titles.some(function (title) {
                if (assetOffers.indexOf(parseInt(title.authorizationId)) !== -1) {
                    entitledOffer = title;
                    return true;
                }
            });
        }
        if (!entitledOffer && subscriptions) {
            subscriptions.some(function (sub) {
                if (assetOffers.indexOf(parseInt(sub.authorizationId)) !== -1) {
                    entitledOffer = sub;
                    return true;
                }
            });
        }
        return entitledOffer;
    },
    findValidEntitlement : function(assetOffers, titles, subscriptions){
        var entitledOffer;
        /* go over subscriptions and try to find one that the asset has an offer for it */
        if(subscriptions){
            subscriptions.some(function (sub) {
                if (assetOffers.indexOf(parseInt(sub.authorizationId)) !== -1) {
                    entitledOffer = sub;
                    return true;
                }
            });
        }
        /* go over titles and try to find one that the asset has an offer for it. Then check if this title is not expired. */
        if (!entitledOffer && titles) {
            titles.some(function (title) {
                if (assetOffers.indexOf(parseInt(title.authorizationId)) !== -1) {
                    if(!title.expirationDate || (Date.parse(title.expirationDate)>=Date.now() && (!title.startTime || title.startTime<=Date.now()))) {
                        entitledOffer = title;
                        return true;
                    }
                }
            });
        }
        return entitledOffer;
    },
    checkForErrors: function (deps,data){
         var error = false;
        deps.forEach(function (depName){
            if(!data[depName]){
                error = true;
            }
        });
        return error;
    },
    sortMapper : {
        "AZ" : "title",
        "ZA" : "-title",
        "NEW" : "-dateTimeAdded" ,
        "OLD" : "dateTimeAdded",
        "DATE_ASCND" : "startTime" ,
        "BROADCAST_DATE" : "-broadcastDateTime",
        "BROADCAST_DATE_ASCND" : "broadcastDateTime",
        "RATING" : "-starRating",
        "RELEVANCY" : "relevancy",
        "POPULARITY" : "popularity",
        "SOURCE_LTV_FIRST" : "relevancy" ,
        "SOURCE_PVR_FIRST" : "relevancy" ,
        "SOURCE_VOD_FIRST" : "relevancy" ,
        "AZ,DATE" :"title,-startTime",
        "DATE,AZ" :"-startTime,title",
        "AZ,DATE_ASCND" :"title,startTime",
        "DATE_ASCND,AZ" :"startTime,title",
        "future" : {
            "AZ,DATE" :"title,-created",
            "DATE,AZ" :"-created,title"
        },
        "completed" : {
            "AZ,DATE" :"title,-startTime",
            "DATE,AZ" :"-startTime,title"
        },
        "failed" : {
            "AZ,DATE" :"title,-startTime",
            "DATE,AZ" :"-startTime,title"
        }
    },
    getHeApi : function() {
        var tenant = config.HE.lab;
        var he = config.tenants[tenant].he;
        return he;
    },
    addFilters : function(args,sources,query){
        var filterSources = [];
        if (args.filters || sources.length > 0 ){
            var filters =  args.filters ?args.filters.split(",") : sources;
            filters.forEach(function (filter) {
                switch (filter){
                    case "HD" :
                        query.videoFormat = "hd";
                        break;
                    case "SD" :
                        query.videoFormat = "sd";
                        break;
                    case "16:9" :
                        query.aspectRatio = "16:9";
                        break;
                    case "store" :
                        filterSources.push("vod");
                        break;
                    case "library" :
                        filterSources.push("pvr");
                        break;
                    case "ltv" :
                        filterSources.push("ltv");
                        break;
                    case "app" :
                        filterSources.push("widget");
                        break;
                    case "all" :
                        filterSources.push("ltv","vod","pvr");
                        break;
                    default :
                        filterSources.push(filter);
                        break;
                }
            });
        }
        query.source = filterSources.length > 0 ? filterSources.toString() : "ltv,vod,pvr";
    },
    Error: function (http_code, errorMsg, source, errorId, extraData) {
        // this function generates error in the form that should be returned by cma
        // (and actually also returned by he_api. see he_api/vsoapi_he_api/errorHandler)
        var self = this;

        var errorBody = {
            "error" : {
                "id" : errorId,
                "source" : source,
                "message" : errorMsg,
                "extraData" : extraData
            }
        };
        self.source = source;       // some code needs access to source at object level, and not "inside" errorBody
        self.http_code = http_code;
        self.errorBody = errorBody;
    },
    getContentId :function (content){
        return content.id + "~" + content.instanceId;
    },
    mergeArrays :function (destArray,arrayTobeInserted,indexForStartInserting,numberOfItemsToDelete){
        arrayTobeInserted.unshift(indexForStartInserting, numberOfItemsToDelete);
        Array.prototype.splice.apply(destArray, arrayTobeInserted);
    },
    removeExtraChannels :function (destArray, linearFirstChannelIndex, indexForInsertingFavorites, pageSize, data){
        if (destArray.length > pageSize){
            if (((indexForInsertingFavorites <= linearFirstChannelIndex)&&(indexForInsertingFavorites !== 0))|| // e.g. [92,..,99,F,F,F,*1*,..,11]
                (indexForInsertingFavorites === pageSize)) // e.g. [80,..,99,F,F,*F*]
            {
                //Update prev page
                var prev = destArray[destArray.length - pageSize - 1];
                data.getSchedule.paramBag.prevChannelId = prev.id || prev.channelId;

                data.getSchedule.paramBag.prevChannelIndex = prev.index;
                // remove extra from the beginning
                destArray.splice(0, destArray.length - pageSize);

            }else{ // e.g. [91,..98,*99*,F,F,F,1,..,10], [*F*,F,F,1,..,20]
                //Update next page
                var next = destArray[pageSize];
                data.getSchedule.paramBag.nextChannelId = next.id || next.channelId;
                data.getSchedule.paramBag.nextChannelIndex = destArray[pageSize].index;
                // remove extra from the ending
                destArray.splice(pageSize, destArray.length - pageSize);
            }
        }
    },
    createMapFromArray: function(array,key,value,indexValue){
        var res = {};
        array.forEach(function (item,i){
            res[item[key]] = indexValue ? i :value ?item[value] : item;
        });
        return res;
    },
    hasSessionId: function (args,sessionInfo) {
        if(sessionInfo.currentSessionInfo){
            return true;
        }
        return args.sessionId !== undefined && args.sessionId !== "{sessionId}" && args.sessionId !== "null" ;
    },
    httpReq: function(options, callback) {
        // callback: function(error, response, body)
        // valid options: url, body, headers, timeout, method
        var HETimeout = config.HE.timeout;
        var parts = urlLib.parse(options.url,true);
        var httpOptions = {
            //agent: false, - uncomment when running tests on windows
            hostname : parts.hostname,
            port : parts.port,
            path : parts.pathname+parts.search,
            method: options.method,
            headers: options.headers

        };

        var req = http.request(httpOptions, function(res) {
            res.setEncoding('utf8');
            var data = "";
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end',function(){
                callback(null,res,data);
            });
        });
        req.on('error', function(e) {
            if (!req.errorReported) {
                // timeouts are reported twice: once from onSocketTimeout function which reports the timeout (ETIMEDOUT),
                // and once here, where the error reported it ECONNRESET (because request was aborted on timeout)
                // we don't want the duplicate report, so we check if error was not already reported
                logger.debug("0", 'msg=ERROR problem with request: ' + e.message);
                callback(e, null, null);
            }

        });


        if (HETimeout>0) {

            req.setTimeout(HETimeout, function onSocketTimeout(){
                logger.debug("0", 'msg=ERROR socket timeout');
                req.abort();
                var e = new Error('ETIMEDOUT');
                e.code = 503;
                req.errorReported=true;
                callback(e,null,null);
            });
        }

        if (((options.method === "POST") || (options.method === "PUT")) && options.body)
        {
            req.write(options.body);
        }

        req.end();
    },
    objectToKeyValueStr: function (logObject) {
        var logArr = [];
        for (var key in logObject) {
            if (logObject[key]) {
                if (typeof (logObject[key]) === "string") {
                    logArr.push(key + "=\"" + logObject[key] + "\"");
                }
                else {
                    logArr.push(key + "=" + logObject[key]);
                }
            }
        }
        return logArr.toString();
    },
    createLogStashRequestStr: function (url, method, sessionInfo, source) {
        var logObject= {
            reportType: "req",
            api: sessionInfo.api,
            householdId: sessionInfo.householdId,
            deviceId: sessionInfo.deviceId,
            url : url,
            method: method,
            service: source === "pps_v1" ? "pps" : source,
            widgetId: sessionInfo.fc.midjetId
        };
        return this.objectToKeyValueStr(logObject);
    },

    createLogStashStr: function (url, method, shortUrl, beError, startTime, endTime, duration, sessionInfo, source, httpCode, body) {
        var logObject= {
            reportType: "res",
            api: sessionInfo.api,
            householdId: sessionInfo.householdId,
            deviceId: sessionInfo.deviceId,
            url : url,
            method: method,
            service: source === "pps_v1" ? "pps" : source,
            widgetId: sessionInfo.fc ? sessionInfo.fc.midjetId : undefined,
            httpCode : httpCode ? httpCode.toString(): undefined,
            shortUrl : shortUrl,
            serviceErrorCode : beError && beError.heCode ? beError.heCode.toString() :undefined,
            serviceErrorText : beError && beError.heText ? util.format(beError.heText).replace(/"/g, " ") : undefined,
            startTime : startTime,
            endTime : endTime,
            latency: duration,
            httpBody: body && httpCode >=400 ? util.format(body): undefined
        };
        return this.objectToKeyValueStr(logObject);
    },
    getMandatoryHeaders:function (sessionInfo) {
        var mandatoryHeaders = {};
        if (sessionInfo) {
            requiredHeaders.forEach(function (entry) {
                if (sessionInfo[entry]) {
                    mandatoryHeaders[entry] = sessionInfo[entry];
                    logger.debug(entry, 'added to header');
                }
            });
        }
        return mandatoryHeaders;
    }
};


