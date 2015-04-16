module.exports = function (){

  var commands = {};

  return {

    close : function (){

      // there's really nothing to do here.. 

    },

    handlers : {

      'run-command' : function (msg, conn){

        var args = ['-c', msg.cmd];
        var cmd = '/bin/sh';

        commands[msg.id] = require('child_process').spawn(cmd, args, {
            cwd: process.env.PROJECT_DIR
        });

        commands[msg.id].stdout.on('data', function (data){
          conn.write(JSON.stringify({
            'command-stdout': {
              id : msg.id,
              packet : '' + data
            }
          }))
        });
        commands[msg.id].stderr.on('data', function (data){
          conn.write(JSON.stringify({
            'command-stderr': {
              id : msg.id,
              packet : '' + data
            }
          }))
        });
        commands[msg.id].on('close', function (code){
          conn.write(JSON.stringify({
            'command-close' : {
              id : msg.id,
              packet: code
            }
          }));
        });
        
      }
    }
  }
}