#!/bin/sh

cd /src/owldin
# for debugging node... 
# npm install -g node-inspector
# node-inspector --web-port=8335 &

# standard auto development...
npm install -g grunt-cli
npm install
grunt 

# manual restart/build etc. with debugging..
# node --debug server.js 

# manual restart/build etc. without debugging.. 
# node server.js
