console.log('Starting Owldin...')

var express = require('express');
var http = require('http');
var watchr = require('watchr');
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var _ = require('underscore');

process.title = "owldin";

// update this

// command line args..
var projectRoot = process.env.PROJECT_DIR || false;
var port = process.env.MIMIR_PORT || false;

if (!projectRoot || !port) {
    console.log('Ensure that PROJECT_DIR, MIMIR_PORT are set');
  process.exit();
}


var root = 'http://localhost:' + port + '/vfs/';

// broker...

var broker = new (require('events')).EventEmitter;

// virtual file system...
var vfs = require('vfs-local')({
  root: projectRoot,
  httpRoot: root,
});

// terminal emu...
var pty = require('pty.js');

process.env.PS1 = "niceOS:\\w $";


//term.write('ls\r');
//term.resize(100, 40);
//term.write('ls /\r');

var sCache = {};

require('watch').watchTree(projectRoot,function (f, curr, prev) {
    if (typeof f == "object" && prev === null && curr === null) {
      // Finished walking the tree
      console.log('tree walked');
    } else if (prev === null) {
      // f is a new file

      if (!sCache[f] || !_.isEqual(sCache[f], curr)){
          broker.emit('create', {
            path : f.replace(projectRoot, '')
          });
          sCache[f] = curr;
      }

    } else if (curr.nlink === 0) {
      // f was removed
      if (!sCache[f] || !_.isEqual(sCache[f], curr)){
          broker.emit('delete', {
            path : f.replace(projectRoot, '')
          });
          sCache[f] = curr;
      }


    } else {

      if (!f.match(/\.swp$/)){

        broker.emit('update', {
          path : f.replace(projectRoot, '')
        });

      }
      // f was changed
    }
  });

function createApplicationAndBeginListening (port, vfs, broker){

  var app = express({
    'view cache' : false
  });

  // static files handler... 
  app.use(express.static(path.join(__dirname, './public')));
  
  // file system over http..
  app.use(require('vfs-http-adapter')('/vfs/', vfs));

  // just send a static file for the root...
  app.get('/', function (req, res){

    fs.readFile('./public/index.html', 'utf8', function (err, data){

      res.send(data);

    });

  });

  var server = require('http').Server(app);

  require('./lib/client-server-commands')(server, broker);

  server.listen(port, '0.0.0.0');

  console.log('Server ready for connections at http://localhost:' + port);

};

createApplicationAndBeginListening(port, vfs, broker);
