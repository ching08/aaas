/**
 * Created by Rstern on 06/01/2016.
 */

var Offering = require("./offering.js");
var today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
var tomorrow = new Date(today.getTime() + 86400000);

module.exports = function(index) {
    return {
        "imageFiles": [
            {
                "id": 11 + index,
                "filename": "image_11" + index + ".jpg",
                "uploaded": "2015-12-03 00:29:33.0",
                "identifier": 366,
                "mimeType": "image/jpeg",
                "url": "http://aas-api.cloud.accedo.tv/file/1132/MarvelAgentofshield.jpg",
                "type": "200x300",
                "realm": "application",
                "maxlimit": 1,
                "width": 322,
                "height": 211
            },
            {
                "id": 12 + index,
                "filename": "image_12" + index + ".jpg",
                "uploaded": "2015-12-22 21:41:58.0",
                "identifier": 366,
                "mimeType": "image/jpeg",
                "url": "http://aas-api.cloud.accedo.tv/file/1213/AAS000000000000366poster.jpg",
                "type": "320x180",
                "realm": "application",
                "maxlimit": 1,
                "width": 320,
                "height": 180
            }
        ],
        "id": index,
        "name": "App number " + index + " Name",
        "platformId": 16,
        "externalId": "",
        "skuNumber": "",
        "developer": {
            "companyName": "Default Organization    ",
            "id": 18
        },
        "metadata": [
            {
                "key": "blurb",
                "value": "App number " + index + " blurb..."
            }
        ],
        "offerings": [
            new Offering(10000 + parseInt(index))
        ],
        "categories": [
            {
                "id": 100,
                "parentId": -1,
                "name": "Video",
                "visible": true,
                "visibleFrom": today,
                "visibleTo": tomorrow,
                "sortOrder": 0
            },
            {
                "id": 99,
                "parentId": -1,
                "name": "Audio",
                "visible": true,
                "visibleFrom": today,
                "visibleTo": tomorrow,
                "sortOrder": 1
            },
            {
                "id": 50,
                "parentId": -1,
                "name": "Default",
                "visible": true,
                "visibleFrom": today,
                "visibleTo": tomorrow,
                "sortOrder": 3
            }
        ],
        "recommendedAge": 18,
        "contentOwner": "Default Organization    "
    };
};

