/**
 * Created by Rstern on 06/01/2016.
 */

var offering = require("./offering.js");
var today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
var yesterday = new Date(today.getTime() - 86400000);
var tomorrow = new Date(today.getTime() + 86400000);

module.exports = function(index) {

    return {
        "startDate" : today,
        "cancelled" : false,
        "applications" : [
            {
                "imageFiles" : [
                    {
                        "id" : 907,
                        "filename" : "image_11" + index + ".jpg",
                        "uploaded" : today,
                        "identifier" : index - 10000,
                        "mimeType" : "image/jpeg",
                        "url" : "http://aas-api.cloud.accedo.tv/file/907/blackjackroyale200x300.jpg",
                        "type" : "200x300",
                        "realm" : "application",
                        "maxlimit" : 1,
                        "width" : 200,
                        "height" : 300
                    }
                ],
                "id" : index - 10000,
                "name" : "App number " + index + " Name",
                "categories" : [
                    {
                        "id" : 50,
                        "parentId" : -1,
                        "name" : "Default",
                        "description" : "",
                        "visible" : true,
                        "visibleFrom" : today,
                        "visibleTo" : tomorrow,
                        "sortOrder" : 3
                    }
                ],
                "platformId" : 16,
                "skuNumber" : "",
                "developer" : {
                    "companyName" : "Default Organization    ",
                    "id" : 18
                },
                "version" : [
                    {
                        "imageFiles" : [],
                        "id" : 235,
                        "applicationId" : index - 10000,
                        "name" : "1.0",
                        "state" : {
                            "id" : 29,
                            "name" : "Live",
                            "isLive" : true,
                            "isInitial" : true,
                            "isContentEditable" : true,
                            "isDeleted" : false
                        },
                        "url" : "https://s3.amazonaws.com/appstreaming/ces2015/TooGoggles_screen.jpg",
                        "buildNumber" : "",
                        "nativeIdentifier" : "",
                        "packageSignature" : "",
                        "patch" : false,
                        "creationDate" : yesterday,
                        "liveDate" : today,
                        "tags" : []
                    }
                ]
            }
        ],
        "licenseModelId" : 22,
        "offeringId" : index,
        "daysLeft" : -1,
        "autoRenewal" : false,
        "id" : 10000 + index
    };
};
    
