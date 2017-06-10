/* global PBC_:true */

//*************** Constants ****************//
var MODULE_ID = '[Aggregator]';

var logger = require("log")(MODULE_ID);
var flow_context = require('node-flow-context');
var fc_factory = new flow_context.factory(logger);
var utils = cmaRootRequire('lib/utils/midjet-utils.js').utils;
var util = require('util');
// *************** Require External Modules ****************//

// helper method to get object size, since JS doesn't have a built-in one
function getSize(obj) {
    return Object.keys(obj).length;
}

/* internal function to avoid jshint's loofunc issue */
var addNextDependencies = function(tc, task) {
    tc[task].deps.forEach(function(dependency) {
        if (tc[dependency].next === undefined) {
            tc[dependency].next = {};
        }
        tc[dependency].next[task] = "";
    });
};

/*
 * preprocess - pre processing a task chain (aggregation job's tasks part).
 * should be called only once per tc instance, maybe need to be moved to the
 * module where those instances are instantiated.
 * 
 * add next field to each task in the task chain, which contains the tasks which
 * depends on this task. this way, when the task is done we can check if those
 * tasks are ready to run.
 */
function preProcess(tc) {
    for ( var task in tc) {
        if (tc.hasOwnProperty(task) && tc[task].deps&& tc[task].deps.length > 0) {
            addNextDependencies(tc, task);
        }
    }
}

var checkIfAllDependeciesRan = function(task, bundledResult) {
    var needToWait = task.deps.some(function(d) {
        return bundledResult[d] === undefined;
    });
    return !needToWait;
};

/*
 * report task exception
 */
function taskException (task, taskErr, progressInfo, allDoneCB) {
    var errMessage = "TASK-END-ERR:" + task + " widgetId:" + progressInfo.midjetId + " " + taskErr.stack;
    logger.error(progressInfo.fc.fcid, "msg=\""+ errMessage +"\"");
    var error = new utils.Error(500, errMessage, "CTAP-AGGREGATOR", "EGeneralError");
    progressInfo.errorOccured = true;
    allDoneCB(error, progressInfo.bundledResult);
}


/*
 * wrapper to run a task in the task chain, more specifically, the PBC_tepmlate
 * part. called once per task. prepares callback and arguments before calling.
 * the callback saves the result and checks if any dependent queries are ready
 * to run. the callback also checks if all queries are done.
 * 
 * arguments: task - the name/ID of the task to run, i.e. key in the tc object.
 * contains bundled result, the tc itself, hasTaskRun array.
 * 
 */
function run(task, progressInfo, allDoneCB) {
    var bundledResult = progressInfo.bundledResult;
    var tc = progressInfo.tc;
    var hasTaskRan = progressInfo.hasTaskRan;
    var taskStartTime;
    var fc = progressInfo.fc ? progressInfo.fc.fcid : "undefined flow context";

    var cb = {
        ok : function(result) {
        	
            var taskEndTime = Date.now();
            var taskDuration = taskEndTime - taskStartTime;
            logger.debug(progressInfo.fc.fcid, "TASK-END-OK=" + task, "widgetId=" + progressInfo.midjetId, 'latency=' + taskDuration + ",");


            if (progressInfo.errorOccured) {
                logger.debug(progressInfo.fc.fcid , "msg=ERROR task:" + task , " completed but error has occurred");
                return;
            }

            // adding the results
            bundledResult[task] = result;
            if(!tc[task].dontWaitForResponse){
                progressInfo.doneOrNoNeedToWaitFor++;
            }

            // check if we are done with all queries
            if (progressInfo.doneOrNoNeedToWaitFor === progressInfo.totalTaskNum && !progressInfo.responseReturned) {
                logger.debug(progressInfo.fc.fcid, "done with all the queries, widgetId=" + progressInfo.midjetId);
                allDoneCB(null, bundledResult);
                return;
            }

            // updating the queries that depend on us (if any), and running them
            // if all deps done
            if (tc[task].next) {
                for ( var nextTask in tc[task].next) {
                    if (tc[task].next.hasOwnProperty(nextTask)) {
                        if (checkIfAllDependeciesRan(tc[nextTask],
                                bundledResult)) {
                            if (hasTaskRan[nextTask] === false) {
                                hasTaskRan[nextTask] = true;
                                try {
                                    run(nextTask, progressInfo, allDoneCB);
                                }
                                catch (taskErr) {
                                    taskException (task, taskErr, progressInfo, allDoneCB);
                                    return;
                                }

                                if(tc[nextTask].dontWaitForResponse && ++progressInfo.doneOrNoNeedToWaitFor === progressInfo.totalTaskNum ){
                                    logger.debug(progressInfo.fc.fcid, "not all done but returning results to CUE");
                                    //means that we don't need to wait for responses
                                    progressInfo.responseReturned = true;
                                    allDoneCB(null,bundledResult);
                                }
                            }
                        }
                    }
                }
            }
        },
        error : function(err) {
            var taskEndTime = Date.now();
            var taskDuration = taskEndTime - taskStartTime;
            logger.debug(progressInfo.fc.fcid, "TASK-END-ERR=" + task , "widgetId=" + progressInfo.midjetId, 'latency=' + taskDuration, (err ? util.format(err) : ''));
            // The default behaviour on error is halting the aggregator.
            if (tc[task].haltOnTaskError === false) {
                logger.debug(progressInfo.fc.fcid,"continue anyway because haltOnTaskError is false");
                //TODO - this is better way to handle the case - more info for the next task to decide what to do. for now using null for backward compatibility.
                // cb.ok({"taskError":err});    
                cb.ok(null);
            } else {
                progressInfo.errorOccured = true;
                allDoneCB(err, bundledResult);
            }
        }
    };
    
    taskStartTime = Date.now();
    logger.debug(progressInfo.fc.fcid, "TASK-START=" + task, "widgetId=" + progressInfo.midjetId);
    tc[task].method(bundledResult, cb);


}

/*
 * execute aggregation job. does dome prepare work, then run the queries without
 * deps. Those queries when done will call run for the queries that depends on
 * them.
 * 
 * Arguments: tasks - Aggregation tasks from job req - object of the request
 * received by the user, generated by Express module allDoneCB - callback to use
 * when all queries have finished.
 */

var executeTasks = function(tasks, requestId, midjetId, fc, allDoneCB) {

    if  (!fc ){
        fc=fc_factory.create();
    }

    var tc = tasks;
    preProcess(tc);

    var progressInfo = {
        bundledResult : {},
        tc : tc,
        doneOrNoNeedToWaitFor :0,
        totalTaskNum : getSize(tc),
        responseReturned : false
    };
    var hasTaskRan = {};
    for ( var task in tc) {
        if (tc.hasOwnProperty(task)) {
            hasTaskRan[task] = false;
        }
    }
    
    // this trick is to make sure the CB is called once only.
    var onceCB = (function() {
        var executed = false;
        return function(error, result) {
            if (executed === false) {
                executed = true;
                allDoneCB(error, result);
            }
        };
    })();
    progressInfo.errorOccured = false;
    progressInfo.hasTaskRan = hasTaskRan;
    progressInfo.midjetId = fc.midjetId === midjetId ? midjetId : fc.midjetId + "/" + midjetId;
    progressInfo.fc = fc;
    
    // check which queries don't have deps and run then all
    for (task in tc) {
        if (tc.hasOwnProperty(task) && (tc[task].deps === undefined || tc[task].deps.length === 0)) {
            try {
                run(task, progressInfo, onceCB);
            }
            catch (taskErr) {
                taskException (task, taskErr, progressInfo, allDoneCB);
                return;
            }
            if(tc[task].dontWaitForResponse && ++progressInfo.doneOrNoNeedToWaitFor === progressInfo.totalTaskNum ){
                //means that we don't need to wait for responses
                progressInfo.responseReturned = true;
                allDoneCB(null,{});
            }
        }
    }
};

module.exports.executeTasks = executeTasks;
