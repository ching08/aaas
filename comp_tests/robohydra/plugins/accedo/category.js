var today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
var tomorrow = new Date(today.getTime() + 86400000);

module.exports = function(index) {
    return {
    	"id" : index.id,
    	"parentId": -1,
    	"name": index.name,
    	"visible": true,
        "visibleFrom": today,
        "visibleTo": tomorrow,
        "sortOrder": 0,
        "applications": [
            {
                "id": 303,
                "name": "vanguard",
                "platformId": 16,
                "externalId": "",
                "skuNumber": "",
                "developer": {
                    "companyName": "Default Organization    ",
                    "id": 18
                },
                "recommendedAge": 13,
                "contentOwner": "Default Organization    "
            },
            {
                "id": 267,
                "name": "Sports Video",
                "platformId": 16,
                "externalId": "",
                "skuNumber": "",
                "developer": {
                    "companyName": "Default Organization    ",
                    "id": 18
                },
                "recommendedAge": 5,
                "contentOwner": "Default Organization    "
            }
        ]
    };
};
