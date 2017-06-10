var MODULE_ID = '[errorHandler_he_api]';
var logger = require("log")(MODULE_ID);
var utils = cmaRootRequire('lib/utils/midjet-utils').utils;


function Error (http_code, errorBody, source, errorId, systemError) {
    var self = this;

    self.source = source;
    self.http_code = http_code;
    self.errorBody = errorBody;
    self.errorId = errorId;
    self.error = systemError;
}

/* This function receives errors as reported by vsoapi components.
*  Each vsoapi component has its own spec for error codes.
*  This function reports the errors in a general form,
*  with general error codes as defined by he_api requirements.
 */
function he_api_errorHandler(data, cb , returnErrorObject) {

    var errorId = "EGeneralError";
    var errorMsg = "----- no error message ???? -----";
    var errMap;
    var errorBodyObj;
    var source = data.source;
    var heCode="500";
    var heText="No Text";

    /* data keys returned by  pbc/CTAP errors callback:
    *     error: // error relevant if no http code
    *     http_code: // http code
    *     errorBody:  // http body. body structure depends on source. see below
    *     source:  // he component causing the error (cmdc / pps/ upm/ sm/ etc
    *     errorId:  // just if source === CTAP
    * */

    /* have error printed only once.
       currently this function is called twice on he component error. once with (cb=null,returnErrorObject=true) and once with (cb != null, returnErrorObject=false) */
    //if (cb) {
        logger.debug(0, "msg=ERROR original accedo error:"+ data);
    //}
    var http_code = data.http_code ? data.http_code :
                    data.error && data.error.code && !isNaN(data.error.code) ?  data.error.code:
                     500;

    // system error. we don't expect errorBody
    if (data.error) {
        errorMsg = data.error.toString();
        heCode = http_code.toString();
        heText = errorMsg;
    }
    else {
        if (data.errorBody) {
            try {
                errorBodyObj = JSON.parse(data.errorBody);
            } catch (parseError) {
                errorMsg = data.errorBody;
            }
        }

        if (data.source === "CTAP") {
            errorId = data.errorId;
            // ctap errorBody msg is plain text and not json. it was already assigned by the try-catch above
        }
        else  if (data.source === "CTAP-AGGREGATOR") {
            // this is a spceial case of exceptions caught by the aggregator. in this case the structure of the error is as defined by the general Error() constructor
            // defined in lib/utils/midjet-util.js. (as opposed to vsoapi Error() constructor defined in this file)
            errorId = data.errorBody.error.id;
            errorMsg = data.errorBody.error.message;
            source = "CTAP";
        }
        else if (data.source === "accedo") {
            /*
            * {
             "error": {
                 "status": "412 PRECONDITION FAILED",
                 "message": "Cannot automatically detect platform version and no platformId parameter specified",
                 "code": "412"
                 }
             }
            * */
            /*errMap = {
                "412": "EGeneralError", // bad request
            };*/

            var accedoError = errorBodyObj && errorBodyObj.error ? errorBodyObj.error : {};

            errorId = "EGeneralError";
            errorMsg = accedoError.message && accedoError.code ? accedoError.code + "-" + accedoError.message : "no accedo message";

            heCode = accedoError.code ? accedoError.code : heCode;
            heText = errorMsg;
        }

        else {
            logger.debug (0, "msg=ERROR unknown accedo HE_API error source.  please contact Daniella or Amir");
        }
    }

    // generate error in requested format
    var error = new utils.Error (http_code, errorMsg, source, errorId);

    /* have error printed only once.
     currently this function is called twice on he component error. once with (cb=null,returnErrorObject=true) and once with (cb != null)*/
    //if (cb) {
        logger.debug(0, "msg=ERROR reported error:"+ error);
    //}

    if ((returnErrorObject === undefined) || (returnErrorObject === false)){
        cb(error);

    }
    else{
        return{
            heCode:heCode,
            heText:heText
        };
    }

}

exports.Error=Error;
exports.he_api_errorHandler=he_api_errorHandler;
