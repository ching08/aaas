
var request = require("request");
var hellowWorld=require('../index.js')
var base_url = "http://localhost:3000"

    describe("Hello World Server", function() {
	    describe("GET /applications?sort=title", function() {
		    it("returns status code 200", function(done) {
			    console.log("1");
			    request.get(base_url + "/applications?sort=title", function(error, response, body) {
				    console.log("status code " + response.statusCode);
				    expect(response.statusCode).toBe(200);
				    done();
				});
			});

		    xit("returns something in body", function(done) {
			    request.get(base_url + "/applications?sort=title", function(error, response, body) {
				    //console.log(" 2 got response: " + body);
				    //expect(body).toBe('abc');
				    done();
				});
			});
		});
	});


