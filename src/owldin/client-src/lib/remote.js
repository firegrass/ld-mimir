var SocksJS = require('./socks.js');
var console = require('../components/console.js');

module.exports = function (app, sockRoot){

  var socket = new SocksJS(sockRoot);

  socket.onopen = function (){
    console.log('Remote file server is online.');
  }
  socket.onmessage = function (e){

    var msg = JSON.parse(e.data);

    for (var i in msg){
      if (msg.hasOwnProperty(i)) app.emit(i, msg[i]);
    }

  }

  app.remoteSend = function (signal, msg){

    var o = {};
    o[signal] = msg;

    socket.send(JSON.stringify(o));

  };

}