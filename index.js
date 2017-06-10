global.cmaRootRequire = function (name) {
    return require(__dirname + '/' + name);
};

var express = require("express");
var app = express();
var router = require('./router');
// app.use(app.router);
app.use(router); //use both root and other routes below
// app.get('/applications', function (req, res) {


// });
app.listen(3000, "0.0.0.0");

console.log("NODE_CONFIG_DIR: " + process.env.NODE_CONFIG_DIR );
console.log("aaas Server running at http://localhost:3000/");
