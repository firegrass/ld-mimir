var pty = require('pty.js');
var uuid = require('node-uuid');

module.exports = function (){

  var terminals = [];
  var terminalLookup = {};

  return {

    close : function (conn){

      for (var i = 0; i < conn.terminals.length; i++){
        conn.terminals[i].destroy();
        terminalLookup[conn.terminals[i]._id] = null;
        //conn.terminals.splice(conn.terminals.indexOf(term), 1);
        terminals.splice(terminals.indexOf(conn.terminals[i]), 1);
        
      }
      conn.terminals = null;

    },

    handlers : {

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

      }  
    }
  }

}