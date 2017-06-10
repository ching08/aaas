// Accedo app store
// implementation of be.api as defined in
// https://anypoint.mulesoft.com/apiplatform/cisco-dev/#/portals/organizations/de91ddd1-9fb8-4731-8bce-03f47c3ba41a/apis/22231/versions/23676
// look at cma/plugins/IH/1.0.0/index.js for more info

var accedo = require('./accedoapi/index.js');

module.exports = {
    // GET /content
    // GET /content/{contentId}
    getContent:
        function getContent(requestParams, sessionInfo, cb) {
            accedo.content_accedo_api.getContent(requestParams, sessionInfo, cb);
        },
    // POST /personalItems
    // POST /personalItems/{itemId}
    setPersonalItems:
        function setPersonalItems(requestParams, sessionInfo, cb) {
            accedo.personalItems_actions_accedo_api.postPersonalItems(requestParams.setData, sessionInfo, cb);
        },
    // GET /personalItems
    getPersonalItems:
        function getPersonalItems(requestParams, sessionInfo, cb) {
            accedo.personalItems_accedo_api.getPersonalItems(requestParams, sessionInfo, cb);
        },
    // DELETE /personalItems/{itemId}
    deletePersonalItems:
        function deletePersonalItems(requestParams, sessionInfo, cb) {
            accedo.personalItems_actions_accedo_api.deleteGivenPersonalItems(requestParams, sessionInfo, cb);
        },
    // GET /categories
    getCategories:
        function getCategories(requestParams, sessionInfo, cb) {
            accedo.app_categories_accedo_api.getCategories(requestParams, sessionInfo, cb);
        },

};
