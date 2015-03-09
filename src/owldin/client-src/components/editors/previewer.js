var marked = require('marked');

var dom = require('green-mesa-dom');

module.exports = function (app, contentView){

  var emitter = new (require('events')).EventEmitter();

  var $element = dom('<div></div>');

  $element.addClass('preview');
  $element.css({
    display : 'none',
    'min-width' : contentView.size().x + 'px',
    'min-height' : contentView.size().y + 'px',
    position : 'absolute',
    top : 0,
    left : 0
  });

  $element.appendTo(contentView.element);

  app.layout.on('resize', function (width, height){

    $element.css({
      'min-width' : contentView.size().x + 'px',
      'min-height' : contentView.size().y + 'px'
    });

  });

  var previewSessions = {};
  var currentSession = false;

  app.on('entity-updated', function (oldEntity, newEntity){


  });

  emitter.create = function createPreviewSession (entity, callback){
    var session = previewSessions[entity._sessionId] = {
      entity : entity,
      body : {}
    };

    app.vfs.readFile(entity.path, function (err, response, body){

      if (err){
        callback (false, err);
        return;
      }

      session.body = body;

      app.emit('session-synchronised', entity._sessionId);

      callback(true);

    });
  }

  emitter.resume = function resumePreviewSession (entity){

    currentSession = previewSessions[entity._sessionId];

    if (!currentSession){
      return false;
    }

    if (currentSession.entity.mime === "text/x-markdown"){
      $element.html('<div class="md-preview-content">' + marked(currentSession.body) + '</div>');
    } else if (currentSession.entity.mime === "application/json"){
      $element.html('<div class="md-preview-content">' + marked('~~~json\n' + JSON.stringify(JSON.parse(currentSession.body), false, 4) + '~~~\n') + '</div>');

    }

    $element.css({ display : ''});

  }

  emitter.pause = function pausePreviewSession (entity){

    currentSession = false;
    $element.css({ display : 'none'});

  }

  emitter.destroy = function destroyPreviewSession (entity, callback){

    if (previewSessions[entity._sessionId]){
      previewSessions[entity._sessionId] = null;
      delete previewSessions[entity._sessionId];
      callback(true); // always okay to close!
    }

    $element.css({
      display : 'none'
    });


  }

  return emitter;

}