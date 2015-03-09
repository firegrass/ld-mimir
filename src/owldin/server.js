var express = require('express');
var http = require('http');
var watchr = require('watchr');
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var _ = require('underscore');

var pty = require('pty.js');

process.title = "owldin";

// update this

// command line args..
var projectRoot = process.env.PROJECT_DIR || false;
var port = process.env.MIMIR_PORT || false;
var proxyHost = process.env.OLDDEMO_PORT_80_TCP_ADDR || process.env.LD_HOST || false;
var proxyPort = process.env.OLDDEMO_PORT_80_TCP_PORT || process.env.LD_PORT || false;

if (!projectRoot || !port || !proxyHost || !proxyPort){
  console.log('Ensure that PROJECT_DIR, MIMIR_PORT, LD_HOST and LD_PORT environment variables are set');
  process.exit();
}

require('./proxy').configure(proxyHost, proxyPort);

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

  require('./proxy').listen(app);

  var server = require('http').Server(app);

  var sockjs = require('sockjs');
  var sock = sockjs.createServer();
  var uuid = require('node-uuid');

  var socketConnections = [];

  var terminals = [];
  var terminalLookup = {};

  var commands = {};

  var handlers = {

    'run-command' : function (msg, conn){
      var args = msg.cmd.split(' ');
      var cmd = args.splice(0,1)[0];

      console.log(cmd, args);

      commands[msg.id] = require('child_process').spawn(cmd, args, { cwd : projectRoot});
      commands[msg.id].stdout.on('data', function (data){
        conn.write(JSON.stringify({
          'command-stdout': {
            id : msg.id,
            packet : '' + data
          }
        }))
      })
      commands[msg.id].stderr.on('data', function (data){
        conn.write(JSON.stringify({
          'command-stderr': {
            id : msg.id,
            packet : '' + data
          }
        }))
      })
      commands[msg.id].on('error', function (){

        console.log('error!');

      });
      commands[msg.id].on('close', function (code){
        conn.write(JSON.stringify({
          'command-close' : {
            id : msg.id,
            packet: code
          }
        }))
      });
    },

    'term' : function (msg, conn){
      var term = terminalLookup[msg.id];
      term.write(msg.packet);
    },

    'create-term' : function (msg, conn){
      var term = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: msg.cols,
        rows: msg.rows,
        cwd: process.env.PROJECT_DIR,
        env: process.env
      });

      conn.terminals.push(term);
      terminals.push(term);

      term._id = uuid.v4();
      terminalLookup[term._id] = term;

      term.on('data', function(data) {
        conn.write(JSON.stringify({
          'term' : {
            id : term._id,
            packet : data
          }
        }));
      });

      conn.write(JSON.stringify({
        'terminal-created' : {
            id : term._id,
            requestId : msg.id
          }
      }));
    },

    'kill-term' : function (msg, conn){

      var term = terminalLookup[msg];
      term.destroy();
      conn.terminals.splice(conn.terminals.indexOf(term), 1);
      terminals.splice(terminals.indexOf(term), 1);
      terminalLookup[msg] = null;

      console.log(conn.terminals, terminals, terminalLookup);

    }
  }

  sock.on('connection', function (conn){

    conn.terminals = [];

    socketConnections.push(conn);

    conn.on('data', function (message){

      var msg = JSON.parse(message);
      for (var i in msg){
        if (msg.hasOwnProperty(i) && handlers[i]){
          handlers[i](msg[i], conn)
        }
      }

    });

    conn.on('close', function (){

      if (conn.terminals.length){
        console.log('Disposing of orphan sessions');
      }

      for (var i = 0; i < conn.terminals.length; i++){
        conn.terminals[i].destroy();
        terminalLookup[conn.terminals[i]._id] = null;
        //conn.terminals.splice(conn.terminals.indexOf(term), 1);
        terminals.splice(terminals.indexOf(conn.terminals[i]), 1);
        
      }

      console.log(conn.terminals.length + " orphans deleted", terminalLookup, terminals);
      conn.terminals = null;
            // remove the socket from the list
      socketConnections.splice(socketConnections.indexOf(conn), 1);

    });

  });

  broker.on('create', function (msg){
    socketConnections.forEach(function (conn){
      conn.write(JSON.stringify({'remote-entity-create' : msg}));
    })
  });
  broker.on('update', function (msg){
    socketConnections.forEach(function (conn){
      conn.write(JSON.stringify({ 'remote-entity-update' : msg }));
    });
  });
  broker.on('delete', function (msg){
    socketConnections.forEach(function (conn){
      conn.write(JSON.stringify({ 'remote-entity-delete' : msg }));
      //conn.write('update', JSON.stringify(msg));
    });
  });

  sock.installHandlers(server, { prefix : '/comms'});
  server.listen(port, '0.0.0.0');

  console.log('Server ready for connections at http://localhost:' + port);

};

createApplicationAndBeginListening(port, vfs, broker);
