var express = require('express');
var app = module.exports = express();
var accedo = require('../3rd_party_bec');
var nodeutil = require('util');

app.get("/applications", function (req, res) { //root dir
    var requestParams = { sort: req.query.sort };
    var cb = {
        ok: function (data) {
            //console.log(nodeutil.inspect(data['response']['data'][0],false,null));
            res.send(data);

        },
        error: function (e) {
            console.error(e);
        }
    }
    try {
        var sessionInfo = { fc: "no" };

        accedo.accedo.getContent(requestParams, sessionInfo, cb);
    }
    catch (e) {
        // var error = new utils.Error(500, "thirdParty api error:getContent " + "configuration.asset.becSource", "CTAP", "EGeneralError");
        cb.error(e);
    }
});
app.get("/categories", function (req, res) { //root dir
    var cb = {
        ok: function (data) {
            //console.log(nodeutil.inspect(data['response']['data'][0],false,null));
            res.send(data);

        },
        error: function (e) {
            console.error(e);
        }
    }
    var requestParams = {};
    try {
        var sessionInfo = { fc: "no" };
        accedo.accedo.getCategories(requestParams, sessionInfo, cb);
    }
    catch (e) {
        // var error = new utils.Error(500, "thirdParty api error:getContent " + "configuration.asset.becSource", "CTAP", "EGeneralError");
        cb.error(e);
    }
});