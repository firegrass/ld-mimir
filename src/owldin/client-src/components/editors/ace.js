/*
  
  Simple wrapper around ACE. It triggers 'save' signals and can only edit one thing at once.
  Something else needs to deal with updating this.

*/

var ace = require('brace');
require('brace/mode/json');
require('brace/mode/markdown');
require('brace/theme/monokai');

var domify = require('domify');

module.exports = function (app, contentView){

  var emitter = new (require('events')).EventEmitter();

  var element = document.createElement('div');

  element.style.display = "none";
  element.style.width = contentView.size().x + "px";
  element.style.height = contentView.size().y + "px";
  element.style.position = "absolute";
  element.style.top = "0px";
  element.style.left = "0px";

  contentView.addElement(element);

  var editor = ace.edit(element);
  editor.setTheme('ace/theme/monokai');
  editor.getSession().setUseWrapMode(true);
  editor.setShowPrintMargin(false);

  app.layout.on('resize', function (width, height){

    element.style.width = contentView.size().x + "px";
    element.style.height = contentView.size().y + "px";
    editor.resize();

  });


  var editSessions = {};
  // we keep a track of which session is active so that if the global 'save entity' signal comes along, 
  // we know if the editor is active and that the user wishes to save their work.
  var currentSession = false;

  app.on('save-entity', function (){

    // we only want to save if we're the active session...
    if (currentSession && !currentSession.synchronised){

      app.emit('session-synchronising', currentSession.entity._sessionId);

      var saveSession = currentSession;

      currentSession.bodies.saving = currentSession.bodies.user;
      app.vfs.writeFile(currentSession.entity.path, currentSession.bodies.user, function (err, response){
        
        saveSession.bodies.persisted = saveSession.bodies.saving;
        if (saveSession.bodies.persisted === saveSession.bodies.user){
          app.emit('session-synchronised', saveSession.entity._sessionId);
        }
        // send 'new' and 'old'
        app.emit('entity-updated', saveSession.entity, {
          mime : response.mime,
          mtime : response.mtime,
          size : response.size,
          path : response.relPath,
          name : response.name,
          type : 'file'
        });

      });
    }

  });

  editor.on('change', function (){

    if (currentSession){
      currentSession.bodies.user = editor.getValue();
      if (currentSession.synchronised && currentSession.bodies.user !== currentSession.bodies.persisted){
        currentSession.synchronised = false;
        app.emit('session-desynchronised', currentSession.entity._sessionId);
      } else if (!currentSession.synchronised && (currentSession.bodies.user === currentSession.bodies.persisted)){
        currentSession.synchronised = true;
        app.emit('session-synchronised', currentSession.entity._sessionId);
      }
    }

  });

  emitter.create = function createEditSession (entity, callback){

    var session = editSessions[entity._sessionId] = {
      entity : entity,
      bodies : {},
      synchronised : false
    };

    app.emit('session-synchronising', entity._sessionId);

    app.vfs.readFile(entity.path, function (err, response, body){

      if (err){
        callback (false, err);
        return;
      }

      session.bodies.persisted = session.bodies.user =  body;
      session.bodies.saving = false;

      app.emit('session-synchronised', entity._sessionId);

      session.synchronised = true;

      callback(true);

    });

  }

  emitter.resume = function resumeEditSession (entity){

    currentSession = editSessions[entity._sessionId];

    if (!currentSession){
      return;
    }

    if (currentSession.entity.mime === "text/x-markdown"){
      editor.getSession().setMode('ace/mode/markdown');
    } else if (currentSession.entity.mime === "application/json"){
      editor.getSession().setMode('ace/mode/json');
    }

    editor.setValue(currentSession.bodies.user, 1);
    editor.focus();

    element.style.display = "";

  }

  emitter.pause = function pauseEditSession (entity){

    currentSession = false;
    element.style.display = "none";

  }

  emitter.destroy = function destroyEditSession (entity, callback){

    // this is where we figure out whether it's okay to close this thing...
    var session = editSessions[entity._sessionId];

    if (!session){

      callback(true);

    } else {

      editSessions[entity._sessionId] = null;
      delete editSessions[entity._sessionId];
      element.style.display = "none";
      callback(true);

    }

  }

  return emitter;

}