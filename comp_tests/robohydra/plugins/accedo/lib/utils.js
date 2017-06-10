var fs = require("fs");

var getHeConfig = function (conf) {
    var he_json;

    if (conf.he) {
        he_json = process.env.AAAS_HOME + '/comp_tests/robohydra/plugins/accedo/etc/' + conf.he;
    }
    else {
        he_json = process.env.AAAS_HOME + '/comp_tests/robohydra/plugins/accedo/etc/he.json';
    }
    console.log("he_json", he_json);
    var he_config = JSON.parse(fs.readFileSync(he_json));
    return he_config;
};

module.exports.getHeConfig = getHeConfig;
