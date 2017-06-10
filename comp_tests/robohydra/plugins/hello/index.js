var RoboHydraHeadStatic = require("robohydra").heads.RoboHydraHeadStatic; // static request
var RoboHydraHead       = require("robohydra").heads.RoboHydraHead; //dynamic request
var RoboHydraHeadFilesystem = require("robohydra").heads.RoboHydraHeadFilesystem; //return from a real file system
var RoboHydraHeadProxy  	= require("robohydra").heads.RoboHydraHeadProxy; // proxy to anohter URL

exports.getBodyParts = function(conf) {
    return {
        heads: [
		//static head : http://171.71.50.214:4000/foo
		new RoboHydraHeadStatic({
			path: '/hello',
			content: {
			    "env_name": 'AAAS_HOME',
			    "env_value": process.env.AAAS_HOME
 		   	}   
		    }),
		// head created by code : http://171.71.50.214:4000/slow?millis=500
		new RoboHydraHead ({
			path: '/slow',
			handler: function(req,res) {
					setTimeout(function() {
					res.send("slow response with " + req.queryParams.millis + " millis delay" );
				},req.queryParams.millis || 1000 );
			}
		}),
		// static file system : http://171.71.50.214:4000/assets/test1.txt
		new RoboHydraHeadFilesystem ({
			mountPath:  'assets',
			documentRoot: 'robohydra/plugins/hello/fake-assets'
		}),
		// proxy to different url : http://171.71.50.214:4000/goto
		new RoboHydraHeadProxy ({
			mountPath: 'goto',
			proxyTo: "http://www.gooogle.com"
		}
			)
		]
		}; };
