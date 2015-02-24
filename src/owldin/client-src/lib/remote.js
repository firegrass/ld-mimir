var SocksJS = require('./socks.js');
var console = require('../components/console.js');

module.exports = function (sockRoot){

  var remote = new (require('events')).EventEmitter;

  var socket = new SocksJS(sockRoot);

  socket.onopen = function (){
    console.log('Remote file server is online.');
  }
  socket.onmessage = function (e){

    var msg = JSON.parse(e.data);

    for (var i in msg){
      if (msg.hasOwnProperty(i)) remote.emit(i, msg[i]);
    }

  }

  remote.send = function (signal, msg){

    var o = {};
    o[signal] = msg;

    socket.send(JSON.stringify(o));

  };

  return remote;

}