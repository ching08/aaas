/**
 * Created by Rstern on 06/01/2016.
 */
var today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
var yesterday = new Date(today.getTime() - 86400000);
var tomorrow = new Date(today.getTime() + 86400000);

module.exports = function(index) {
    return {
        "imageFiles" : [],
        "id" : index,
        "name" : "Number " + index + " Offering",
        "description" : "free license",
        "beginDate" : today,
        "endDate" : tomorrow,
        "creationDate" : yesterday,
        "lastUpdate" : today,
        "deleted" : false,
        "active" : true,
        "adFunded" : false,
        "licenseModels" : [
            {
                "id" : 22,
                "name" : "Free",
                "description" : "Free, unlimited usage",
                "price" : 0,
                "currency" : "USD",
                "licenseType" : 4,
                "numberOfUses" : 0,
                "autoRenewal" : false,
                "instanceId" : 11
            }
        ]
    };
};