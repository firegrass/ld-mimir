var console = require('./console.js');
var domify = require('domify');
var dom = require('green-mesa-dom');
var popups = require('./modal.js');
var filesize = require('filesize');
var DiffMatchPatch = require('diff-match-patch');
var dmp = new DiffMatchPatch();
var cloneDeep = require('clone-deep');

module.exports = function (app, sessionHandlers, box){

  // Right, let's keep this simple.
  // Session Handlers should have a consistent API
  // because we're not at all DRY here atm.
  // 
  // We also want to remove all the dealing with 
  // entity changes here. All that sessions should 
  // deal with is creating, pausing, resuming and destroying
  // sessions, looking after the tabs.

  var ul = domify('<ul class="tabs"></ul>');
  box.addElement(ul);
  $ul = dom(ul);

  // we use an array because ordering is useful here.
  var sessions = [];

  // counters/ids
  var sessionId = 0;
  var terminalSessionCount = 0;

  function getEditor (editor){

    if (editor === "ace"){
      return sessionHandlers.ace;
    } else if (editor === "info"){
      return sessionHandlers.info;
    } else if (editor === "preview"){
      return sessionHandlers.preview;
    } else if (editor === "terminal"){
      return sessionHandlers.terminals;
    }
  }

  function initialiseSession (entity, title, editor, callback){

    entity = cloneDeep(entity);

    var session = {
      editor : getEditor(editor),
      type : editor,
      entity : entity,
      sessionId : ++sessionId,
      title : title,
      path : entity.path,
      $tab : dom('<li class="' + editor +'"><a href="#">' + title +'</a><span class="typcn typcn-power"></span><span class="typcn typcn-media-record"></span><span class="typcn typcn-arrow-sync"></span></li>')
    }


    session.$tab.addClass('synchronising');

    session.entity._sessionId = session.sessionId;

    $ul.append(session.$tab);

    dom('a', session.$tab).on('click', function (e){

      resumeSession(session);

    });

    dom('span.typcn-power', session.$tab).on('click', function (e){

      destroySession(session);

    });

    sessions.push(session);

    session.editor.create(session.entity, function (createdOkay){

      if (createdOkay){
        callback(session);
      }

    });

    return session;

  }

  function resumeSession (session){

    // when we resume a session we need to pause the existing session
    if (sessions[0].active && sessions[0].sessionId !== session.sessionId){
      pauseSession(sessions[0]);
    }

    sessions.unshift(sessions.splice(sessions.indexOf(session), 1)[0]);
    session.editor.resume(session.entity);
    session.$tab.addClass('active');
    session.active = true;
  }

  function pauseSession (session){

    session.editor.pause(session.entity);
    session.$tab.removeClass('active');
    session.active = false;
  }

  function destroySession (session){

    // async.. could require user input before closing... 
    session.editor.destroy(session.entity, function (okayToClose){
      if (okayToClose){
        session.$tab.remove();
        session.$tab = null;
        session.editor = null;
      }
      sessions.splice(sessions.indexOf(session), 1);

      if (sessions[0]){
        resumeSession(sessions[0]);
      }
    });

  }

  function findSession (entity, type){

    for (var i = 0; i < sessions.length; i++){
      if (sessions[i].type === type && sessions[i].path === entity.path){
        return sessions[i];
      }
    }

    return false;

  }

  function findSessionById (id){
    for (var i = 0; i < sessions.length; i++){
      if (sessions[i].sessionId === id) return sessions[i];
    }
    return false;
  }

  // this only fire once.
  app.on('edit-entity', function (entity){

    var session = findSession (entity, 'ace');

    if (!session){

      initialiseSession(entity, entity.name, 'ace', function (session){

        resumeSession(session);

      });

    } else {

      resumeSession(session);

    }


  });

  app.on('preview-entity', function (entity){

    var session = findSession (entity, 'preview');

    if (!session){

      initialiseSession(entity, entity.name, 'preview', function (session){

        resumeSession(session);

      });

    } else {

      resumeSession(session);

    }


  });

  app.on('edit-entity-info', function (entity){

    var session = findSession (entity, 'info');

    if (!session){

      initialiseSession(entity, entity.name, 'info', function (session){

        resumeSession(session);

      });

    } else {

      resumeSession(session);

    }


  });

  app.on('new-terminal-session', function (){

    var termId = 'terminal-' + (++terminalSessionCount);

    var session = initialiseSession({ path : termId }, termId, 'terminal', function (){

      resumeSession(session);

    });

  });

  app.on('request-terminate-session', function (sessionId){

    var session = findSessionById(sessionId);
    if (session){
      destroySession(session);
    }

  });

  app.on('session-desynchronised', function (sessionId){

    var session = findSessionById(sessionId);
    if (session){
      session.$tab.addClass('desync');
      session.$tab.removeClass('synchronising');
    }

  });

  app.on('session-synchronised', function (sessionId){

    var session = findSessionById(sessionId);
    if (session){
      session.$tab.removeClass('desync');
      session.$tab.removeClass('synchronising');
    }

  });

  app.on('session-syncrhonising', function (sessionId){

    var session = findSessionById(sessionId);
    if (session){
      session.$tab.removeClass('desync');
      session.$tab.addClass('synchronising');
    }

  });

};