var Terminal = require('term.js');
var dom = require('green-mesa-dom');

module.exports = function (app, contentView){

  /*
  var term = new Terminal({
    cols: 80,
    rows: 24,
    screenKeys: true
  });
*/

  var $element = dom('<div></div>');

  $element.addClass('terminals');
  $element.css({
    display : 'none',
    'min-width' : contentView.size().x + 'px',
    'min-height' : contentView.size().y + 'px',
    position : 'absolute',
    top : 0,
    left : 0
  });



  $element.appendTo(contentView.element);

  var terminalSessions = {};

  var terminals = {};

  //term.open($element.els[0]);

  app.on('term', function (o){

    terminals[o.id].write(o.packet);

  });

  var requestId = 0;

  app.layout.on('resize', function (width, height){

    $element.css({
      'min-width' : contentView.size().x + 'px',
      'min-height' : contentView.size().y + 'px',
    });

  });


  var emitter = {};

  emitter.create = function createTerminalSession (entity, callback){

    var session = terminalSessions[entity._sessionId] = {
      entity : entity
    }

    var sizes = testSizes();

    app.once('terminal-created', function (msg){

      var term = new Terminal({
        cols : sizes.cols,
        rows : sizes.rows,
        screenKeys : true
      });


      // for direct communications from the server...
      terminals[msg.id] = term;

      term.on('data', function(data) {
        app.remoteSend('term', {
          id : msg.id,
          packet : data
        });
      });
        

      var $term = dom('<div></div>');
      $element.append($term);
      term.open($term.els[0]);

      $term.css({
        display : 'none'
      });

      // for the session...
      session.termId = msg.id
      session.terminal = term;
      session.$term = $term;

      app.emit('session-synchronised', entity._sessionId);

      callback(true);

    });

    app.remoteSend('create-term', {
      id : entity._sessionId,
      rows : sizes.rows,
      cols : sizes.cols
    });

  }

  emitter.pause = function pauseTerminalSession (entity){

    var session = terminalSessions[entity._sessionId];

    session.$term.css({
      display : 'none'
    });

    // hides the main terminals editor..
    $element.css({
      display : 'none',
    });


  }

  emitter.resume = function resumeTerminalSession (entity){

    var session = terminalSessions[entity._sessionId];

    session.$term.css({
      display : ''
    });

    $element.css({
      display : ''
    });

  }

  emitter.destroy = function destroyTerminalSession (entity, callback){

    var session = terminalSessions[entity._sessionId];

    session.terminal.destroy();
    session.$term.remove();

    app.remoteSend('kill-term', session.termId);

    terminals[session.termId] = null;
    terminalSessions[entity._sessionId] = null;

    delete terminalSessions[entity._sessionId];
    delete terminals[session.termId];

    $element.css({
      display : 'none',
    });
    // callback true = okay to destroy this session...
    callback(true);

  }


  function testSizes (){

      $element.css({display : ''});

      var $tester = dom('<div>0</div>');
      $tester.css({
        display: 'inline-block'
      })
      $element.append($tester);
        //var $el

      var charWidth = $tester.els[0].clientWidth;
      var charHeight = $tester.els[0].clientHeight;

      $element.css({display : 'none'});
      $tester.remove();

      return {
        cols : Math.floor( ((contentView.size().x / charWidth) / 10) ) * 10,
        rows : Math.floor(contentView.size().y / charHeight)
      }

  }

  return emitter;

}