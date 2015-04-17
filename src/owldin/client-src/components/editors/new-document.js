var marked = require('marked');
var moment = require('moment');
var filesize = require('filesize');

var dom = require('green-mesa-dom');

module.exports = function (app, contentView){

  var emitter = new (require('events')).EventEmitter();

  var $element = dom('<div></div>');

  $element.addClass('info');
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

  var folderT = function(o){
    return [
      '<div class="edit-file-info">',
      '<form class="edit">',
      '<fieldset>',
      '<legend>New document properties</legend>',
      '<ul>',
      '<li><label>Name:</label><input type="text" name="name" value="Untitled.md"></input></li>',
      '<li><label>Path:</label>' + o.path + '</li>',
      '<li><label></label><button>Create</button></li>',
      '</ul>',
      '</fieldset>',
      '</form>',
      '</div>'
    ].join('\n');

  };


  var sessions = {};
  var currentSession = false;

  function makeFileSession (session){

    var $el = session.$el = dom(folderT(session.entity));

  }

  emitter.create = function (entity, callback){

    // the entity shoudl contain all the metadata we need for this

    var session = sessions[entity._sessionId] = {
      entity : entity,
      synchronised : false
    }

    makeFileSession(session);

    session.$el.css({ display : 'none'});

    dom('form.edit', session.$el).on('submit', function (e){

      e.preventDefault();

      var folderName = dom('form.edit input[name="name"]').val();

      if (folderName !== "" && folderName.substr(0,1) !== "."){

        app.vfs.createFile(session.entity.path, folderName, function (err){

          if (!err){
            app.emit('request-terminate-session', entity._sessionId);
          }

        })

      }

      //app.emit('rename-entity', session.entity, dom('form.edit input[name="name"]').val());

      /* 
        Let's actually just go ahead and rename it. Because this is hte only place that can do that.
      */

      /*
      if (session.entity.type === 'file'){

        app.vfs.renameFile(session.entity.path, dom('form.edit input[name="name"]').val(), function (err, newEntity, oldEntity){

          app.emit('request-terminate-session', entity._sessionId);

        });
      } else if (session.entity.type === 'folder'){

        app.vfs.renameFolder(session.entity.path, dom('form.edit input[name="name"]').val(), function (err, newEntity, oldEntity){

          app.emit('request-terminate-session', entity._sessionId);

        });      
      }
      */

    });

    $element.append(session.$el);

    app.emit('session-synchronised', entity._sessionId);

    callback(true);


  }

  emitter.resume = function resumeInfoSession (entity){
    // we actually keep a track of our sessions that are currently being actively 
    // looked at by the user!
    currentSession = sessions[entity._sessionId];

    // show this session..
    currentSession.$el.css({ display : ''});
    // show our editor...
    $element.css({ display : ''});

  }

  emitter.pause = function pauseInfoSession (entity){

    currentSession = false;

    var session = sessions[entity._sessionId];

    // hide the session..
    session.$el.css({ display : 'none'});

    // hide the editor as well.
    $element.css({ display : 'none'});

  }

  emitter.destroy = function destroyInfoSession (entity, callback){

    var session = sessions[entity._sessionId];

    // remove that element
    session.$el.remove();

    sessions[entity._sessionId] = null;
    delete sessions[entity._sessionId];

    $element.css({
      display : 'none'
    });

    callback('okay to close');

  };

  return emitter;

}