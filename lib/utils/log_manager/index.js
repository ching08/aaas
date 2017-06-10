/**
 * Created by dgoldber on 6/12/14.
 */

//*************** Constants ****************//
var MODULE_ID = '[LogManager]';

//*************** Require External Modules ****************//
var config = require('config');
var fs = require('fs');
var moment = require('moment-timezone');
var util=  require('util');
var stackTrace = require('stack-trace');
var logrotate = require('logrotator');
var allDebugLevel;
var loggerFunc;
var stream;
var fileName='log/cma.log';
var dgram = require('dgram');

var udp = dgram.createSocket('udp4');
var logstashPort = config.log.config.logstashPort;

var colours = {
    "DEBUG":"\x1b[36m", //"cyan",
    "INFO": "\x1b[32m",//"green",
    "WARN":  "\x1b[33m",//"yellow",
    "ERROR": "\x1b[31m",//"red",
};

// use the global rotator
var rotator = logrotate.rotator;

function sendLog(host, port, line) {
    var buffer = new Buffer(line);
    udp.send(buffer, 0, buffer.length, port, host, function(err, bytes) {
        if(err) {
            console.error(
                "logstashUDP - %s:%p Error: %s", host, port, util.inspect(err)
            );
        }
    });
}

var writeToFile = function (level,args_in ) {
    var date = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    try{

        var trace;
        var args = [].slice.call(args_in);

        stream.write(date + ', CTAP, CMA, ' + level + ' ,FCID='+  args);
        if (allDebugLevel === "ALL" || allDebugLevel === "DEBUG"  ) {
            trace = stackTrace.get();
            stream.write( '(' + trace[2].getFileName() +':' +  trace[2].getLineNumber() + ')\n');
        }
        else {
            stream.write('\n');
        }


        if (config.log.config.console) {
            trace = stackTrace.get();
            var color = colours[level];
            console.log(color, date + ', CTAP, CMA, ', level, "\x1b[0m ,FCID="+ args + ' (' + trace[2].getFileName() +':' +  trace[2].getLineNumber() + ')\n');
        }

        // send to logstash through udp
        if (level !== "DEBUG") {
            var logstashHost = config.log.config.logstashHost;

            if (logstashHost !== "127.0.0.1") {
                //var line = "FCID=" + args.join(",");
                var line = date + ', CTAP, CMA, ' + level + ' ,FCID=' + args.join(",");
                sendLog(logstashHost, logstashPort, line);
            }
        }

    } catch (e) {
        stream.write( date + ', CTAP, CMA,  ERROR  In write to file  \n');
    }
};

var writeErrorToFile = function (){
    writeToFile("ERROR", arguments);
};

var writeWarnToFile = function (){
    writeToFile("WARN", arguments);
};

var writeInfoToFile = function (){
    writeToFile("INFO", arguments);
};

var writeDebugToFile = function (){
    writeToFile("DEBUG", arguments);
};


function EmptyLogger(xx)
{
    // add dummy logger functions when diabling logger
    this.error = function() {};
    this.warn = function() {};
    this.info = function() {};
    this.debug = function() {};
}

function MyLogger(moduleid){

        this.error = writeErrorToFile;
        this.warn = writeWarnToFile;
        this.info = writeInfoToFile;
        this.debug = writeDebugToFile;

        if (allDebugLevel === "OFF") {
            this.error = function() {};
            this.warn = function() {};
            this.info = function() {};
            this.debug = function() {};
        } else if (allDebugLevel === "ERROR") {
            this.warn = function () {};
            this.info = function () {};
            this.debug = function () {};
        } else if (allDebugLevel === "WARN") {
            this.info = function () {};
            this.debug = function () {};
        } else if (allDebugLevel === "INFO") {
            this.debug = function () {};
        }
    }

if (!config.log.disable) {
    // create log dir, if it required by appender and the dir doesn't exist
    var maxFileZise = '150m';
    var backups = 10;
    if (config.log.config.levels.all) {
        allDebugLevel = config.log.config.levels.all;
    }
    if (config.log.config.filename) {
        fileName = config.log.config.filename;
    }
    if (config.log.config.maxLogSize){
        maxFileZise = config.log.config.maxLogSize;
    }
    if(config.log.config.backups) {
        backups = config.log.config.backups;
    }

    try {
        var logdir = "./log";
        fs.mkdirSync(logdir, 0777);
    } catch (e) {
        // ignore existence error
    }

    stream = fs.createWriteStream(
        fileName,
        { encoding: "utf8",
            mode: parseInt('0644', 8),
            flags: 'a' }
        );

    rotator.register(fileName, {schedule: '1h', size: maxFileZise, compress: false, count: backups});
    loggerFunc =function(moduleid){ return  new  MyLogger(moduleid); };

} else {
    loggerFunc = function(){
        return new EmptyLogger();
    };
}


module.exports = loggerFunc;
