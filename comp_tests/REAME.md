cd aaas_cannie
source ENV.sh

========================================
A. Robohydra TOI 
========================================



A.1 hello server plugin
========================================
cd comp_tests
node ./robohydra/node_modules/robohydra/bin/robohydra.js hello.conf 
or 
node ./robohydra/node_modules/robohydra/bin/robohydra.js -n -I robohydra/plugins -P hello,logger -p 4000

Test URL:
 - admin URL: http://171.71.50.214:4000/robohydra-admin
 - static head : http://171.71.50.214:4000/foo
 - head created by code : http://171.71.50.214:4000/slow?millis=500
 - static file system : http://171.71.50.214:4000/assets/test1.txt
 - proxy to different url : http://171.71.50.214:4000/goto



A.2 Accedo plugin
========================================
# start accedo plugin
cd comp_tests
node robohydra/node_modules/robohydra/bin/robohydra.js -n -I robohydra/plugins -P accedo_mock,logger -p 4000
or node robohydra/node_modules/robohydra/bin/robohydra.js robohydra/accedo.conf

Test:
http://171.71.50.214:4000/robohydra-admin

case A. enable scenario 'dnyResult' from GUI 
or curl -X POST -d "active=true" http://171.71.50.214:4000/robohydra-admin/rest/plugins/accedo_mock/scenarios/dynResults

case B. enable scenario 'proxy' from GUI

# ctap ( not working for this folder yet, working for ctap)
http://171.71.50.214:4000/auth/createSession?apiKey=06147cc8adfe7bb678acec5c08b489fa
http://171.71.50.214:4000/v3/applications?sessionKey=<sessionKey>



========================================
C.  component test via aaas_server ---> robhoydra proxy to real accedo server
========================================

1) start aaas server to use real he
cd aaas_cannie
source ENV.sh
update etc/default.js "appstore" to use real accedo server
node index.js

2) start robohydra  server in proxy mode
(make sure comp_tests/robohydra/plugins/he.json , make 'accedo' point to localhost:3000)
cd comp_tests
node robohydra/node_modules/robohydra/bin/robohydra.js robohydra/accedo.conf -p 4000


3) go to http://171.71.50.214:4000/robohydra-admin and enable 'proxy' scenarios

4) Test:

http://171.71.50.214:4000/applications?sort=title  ( request to robohydra)

http://171.71.50.214:3000/applications?sort=title ( request to aaas
--> proxy by robohybdra to real accedo )




========================================
D.  component test via aaas_server  --> robohydra accedo_mock
========================================


1) start aaas server to use mock he
cd aaas_cannie
source ENV.sh
update etc/default.js "appstore" to use mock server
node index.js


2) start mock server in mock mode
cd comp_tests
make sure  comp_tests/robohydra/plugins/he.json to point to localhost:3000
node robohydra/node_modules/robohydra/bin/robohydra.js robohydra/accedo.conf  -p 4000


3) go to http://171.71.50.214:4000/robohydra-admin and enable 'dynResults' scenarios
4) Test


( send to mocks)
http://171.71.50.214:4000/auth/createSession?apiKey=06147cc8adfe7bb678acec5c08b489fa
http://171.71.50.214:4000/v3/applications?sessionKey=06147cc8adfe7bb678acec5c08b489fa15598dcdb55


( send to aaas --> mocks) 
http://171.71.50.214:3000/applications
