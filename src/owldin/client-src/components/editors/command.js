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

  var runT = function(o){
    return [
      '<div class="edit-file-info">',
      '<form class="edit">',
      '<fieldset>',
      '<legend>Run command</legend>',
      '<ul>',
      '<li><label>Name:</label><input type="text" name="command" value="" placeholder="Command to run on the server"></input></li>',
      '<li><label></label><button>Run</button></li>',
      '</ul>',
      '</fieldset>',
      '</form>',
      '<div class="output"></div>',
      '</div>'
    ].join('\n');

  };


  $element.addClass('commands');
  $element.css({
    display : 'none',
    'min-width' : contentView.size().x + 'px',
    'min-height' : contentView.size().y + 'px',
    position : 'absolute',
    top : 0,
    left : 0
  });

  $element.appendTo(contentView.element);

  var commandSessions = {};

  var commands = {};

  //term.open($element.els[0]);

  app.on('command-stdout', function (o){

    // actually this is 
    if (commandSessions[o.id]) commandSessions[o.id].$el.append('<pre>' + o.packet + '</pre>');


  });

  app.on('command-stderr', function (o){

    // actually this is 
    if (commandSessions[o.id]) commandSessions[o.id].$el.append('<pre class="error">' + o.packet + '</pre>');

  });

  app.on('command-close', function (o){
    if (commandSessions[o.id]) commandSessions[o.id].$el.append('<p>Completed with error code ' + o.packet + '</p>');
  });

  var requestId = 0;

  app.layout.on('resize', function (width, height){

    $element.css({
      'min-width' : contentView.size().x + 'px',
      'min-height' : contentView.size().y + 'px',
    });

  });


  var emitter = {};

  emitter.create = function createCommandSession (entity, callback){

    var session = commandSessions[entity._sessionId] = {
      entity : entity
    }

    session.$el = dom(runT());
    $element.append(session.$el);

    session.$el.css({ display: 'none'});

    app.emit('session-synchronised', entity._sessionId);
    /*

*/

    dom('form', session.$el).on('submit', function (e){

      e.preventDefault();

      var command = dom('input[name="command"]', session.$el).val();

      if (command !== ""){

        session.$el.remove();
        session.$el = dom('<div class="output"></div>');
        $element.append(session.$el);

        app.remoteSend('run-command', {
          id : entity._sessionId,
          cmd : command
        });

      }

    })

    callback(true);

  }

  emitter.pause = function pauseCommandSession (entity){

    var session = commandSessions[entity._sessionId];

    session.$el.css({
      display : 'none'
    });

    // hides the main terminals editor..
    $element.css({
      display : 'none',
    });


  }

  emitter.resume = function resumeCommandSession (entity){

    var session = commandSessions[entity._sessionId];

    session.$el.css({
      display : ''
    });

    $element.css({
      display : ''
    });

  }

  emitter.destroy = function destroyCommandSession (entity, callback){

    var session = commandSessions[entity._sessionId];

    session.$el.remove();

    app.remoteSend('terminate-command', entity._sessionId);

    commandSessions[entity._sessionId] = null;

    delete commandSessions[entity._sessionId];

    $element.css({
      display : 'none',
    });
    // callback true = okay to destroy this session...
    callback(true);

  }

  return emitter;

}