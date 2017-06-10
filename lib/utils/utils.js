var os = require('os');

var cachedHostname = os.hostname();

module.exports = {
    enumDef : function(enumObject) {
        return Object.freeze(enumObject);
    },
    extend : function(destination, source) {
        if (source) {
            for ( var property in source) {
                if (source.hasOwnProperty(property)) {
                    destination[property] = source[property];
                }
            }
        }
        return destination;
    },
    myHostname: function () {
        return cachedHostname;
    }
};