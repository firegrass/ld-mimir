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

  var fileT = function(o){
    return [
      '<div class="edit-file-info">',
      '<form class="edit">',
      '<fieldset>',
      '<legend>Properties</legend>',
      '<ul>',
      '<li><label>Name:</label><input type="text" name="name" value="' + o.name + '"></input></li>',
      '<li><label>Path:</label>' + o.path + '</li>',
      '<li><label>Mime type:</label>' + o.mime + '</li>',
      '<li><label>Modified:</label>' + moment(o.mtime).format('MMMM Do YYYY, h:mm:ss a') + '</li>',
      '<li><label>Size:</label>' + filesize(o.size) + '</li>',
      '<li><label></label><button>Update</button></li>',
      '</ul>',
      '</fieldset>',
      '</form>',
      '<form class="delete">',
      '<fieldset>',
      '<legend>Delete</legend>',
      '<ul>',
      '<li><label></label><button>Delete</button></li>',
      '</ul>',
      '</fieldset>',
      '</form>',
      '</div>'
    ].join('\n');

  };


  var folderT = function(o){
    return [
      '<div class="edit-file-info">',
      '<form class="edit">',
      '<fieldset>',
      '<legend>Properties</legend>',
      '<ul>',
      '<li><label>Name:</label><input type="text" name="name" value="' + o.name + '"></input></li>',
      '<li><label>Path:</label>' + o.path + '</li>',
      '<li><label></label><button>Update</button></li>',
      '</ul>',
      '</fieldset>',
      '</form>',
      '<form class="delete">',
      '<fieldset>',
      '<legend>Delete</legend>',
      '<ul>',
      '<li><label></label><button>Delete</button></li>',
      '</ul>',
      '</fieldset>',
      '</form>',
      '</div>'
    ].join('\n');

  };


  var sessions = {};
  var currentSession = false;

  function makeFileSession (session){

    var $el = session.$el = dom(fileT(session.entity));

  }

  function makeFolderSession (session){

    var $el = session.$el = dom(folderT(session.entity));


  }

  app.on('entity-updated', function (oldEntity, newEntity){

    var effectedSession = resume = false;

    for (var session in sessions){
      if (sessions.hasOwnProperty(session)){
        if (sessions[session].entity.path === oldEntity.path){

          effectedSession = sessions[session];
          if (currentSession === effectedSession){
            resume = true;
          }
          break;

        }
      }
    }

    if (effectedSession){
      newEntity._sessionId = effectedSession.entity._sessionId;
      emitter.destroy(effectedSession.entity, function (){});
      emitter.create(newEntity, function(){});
      if (resume){
        emitter.resume(newEntity);
      }
    }

  });

  emitter.create = function (entity, callback){

    // the entity shoudl contain all the metadata we need for this

    var session = sessions[entity._sessionId] = {
      entity : entity,
      synchronised : false
    }

    if (session.entity.type === 'file'){

      makeFileSession(session);

    } else if (session.entity.type === 'folder'){

      makeFolderSession(session);

    }

    session.$el.css({ display : 'none'});

    dom('form.edit', session.$el).on('submit', function (e){

      e.preventDefault();

      app.emit('rename-entity', session.entity, dom('form.edit input[name="name"]').val());

      // we also want to get this session terminated...
      app.emit('request-terminate-session', entity._sessionId);

    });

    dom('form.delete', session.$el).on('submit', function (){

      e.preventDefault();

      app.emit('delete-entity', session.entity);
      app.emit('request-terminate-session', entity._sessionId);

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