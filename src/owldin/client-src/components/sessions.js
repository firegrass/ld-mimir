var console = require('./console.js');
var domify = require('domify');
var dom = require('green-mesa-dom');
var popups = require('./modal.js');
var filesize = require('filesize');

module.exports = function (app, vfs, editor, info, box){

  

  /*

    "Sessions" manifests as the tabs across the top of the content area.

    There are three types of session:
      - edit session (powered by ACE)
      - info session (powered by a custom form/data thing)
      - preview session (powered by a markdown parser)

    new sessions can be created by the application externally via signals...

    //  app.on('edit-entity', ...)
    //  app.on('edit-entity-info', ...)
    //  app.on('preview-entity', ...)

    existing sessions can be reactivated by clicking on the tabs, which issue the same signals..
    //  app.on('edit-entity', ...)
    //  app.on('edit-info-entity', ...)
    //  app.on('preview-entity', ...)  

    existing sessions can be closed by clicking on the close icon on the tab..

    // app.on('end-edit-entity', ...)
    // app.on('end-edit-info-entity', ...)
    // app.on('end-preview-entity', ...)

    When closing edit and edit-info sessions, the data in the editor/info objects needs
    comparing with the persisted data and the user must be prompted to either discard 
    or save these changes before closing, or cancelling.

    // app.on('entity-deleted',...)
    // app.on('entity-renamed',...)

    When an entity is changed on the server, then when a session concerning this entity is
    currently active or is reactivated by the user,
    the user must be prompted to either get the new version or ignore the new version

    // app.on('entity-deleted',...)
    // app.on('entity-renamed',...)


    What does a session look like?

    {
      entity : { ... }, // the detailed entity object. This doesn't contain the body
      bodies : {
        persisted : '' // the canonical body on the server
        user : '' // the user's edited version 
      },
      type : 'edit | edit-info | preview', // needed to make sure the right thing is activated when the session becomes active
      elements : {
        $tab : $el // a reference to the session's tab.
      }  

    }
    

  */

  var ul = domify('<ul class="tabs"></ul>');
  box.addElement(ul);
  $ul = dom(ul);

  // we use an array because ordering is useful here.
  var sessions = [];

  app.on('save-entity', function (){

    var session = findActiveSession();

    if (session.bodies.user !== session.bodies.persisted){
      markSessionAsSynchronising(session);
      vfs.writeFile(session.path, session.bodies.user, function (err, entity){
        // we don't care at this point... 
        console.log('Saved <strong>' + entity.name + '</strong> to ' + entity.relPath + ' (' + filesize(entity.size) + ')');

      });
    }

  });

  // the application tells us what the user wants to do...
  app.on('edit-entity', function (path){

    var session = findSession(path);

    if (!session){

      createEditSession(path, function (err, path){
        openEditSession(path);
      });

    } else {

      openEditSession(path);

    }

  });

  app.on('end-edit-entity', function (path){

    var session = findSession(path);

    if (session){
      closeEditSession(path);
    }

  });

  // the editor reports when the user has changed an entity...
  editor.on('change', function (entity, user){

    var session = findActiveSession();

    if (session.path === entity.relPath){
      session.bodies.user = user;
      if (session.bodies.user !== session.bodies.persisted && session.status === "synced"){
        markSessionAsDesynced(session);
      } else if (session.status === "desynced" && session.bodies.user === session.bodies.persisted){
        markSessionAsSynced(session);
      }
    } else {
      console.error('Orphan session detected!');
    }

  });

  // the file system can also tell us an entity has changed...
  vfs.on('entity-updated', function (changeType, path){

    /*
      We can get into a pickle here. There are a couple of situations we could
      find ourselves in.

      1) The entity has been updated. It is in the same location and the contents of 
      the body are the same as we have inside the session. Typically this is because
      the user has 'saved' the entity and this is just the response from the server 
      saying that the file has changed.

      In this case the 'persisted' body should now match the 'user' body and we can 
      mark the session as 'synced' and carry on as normal. 

      2) As above, except the new 'persisted' body is does not match the either the
      user body or the persisted body in the session. At this point we need to present
      the user with a choice. Do they want to keep the version of the file they have, 
      or do they wish to apply the new version of the file

      3) 
    */

    // we're only interested in two types here. Change and delete. Can't actually
    // get a single 'rename' or ''

    var session;

    if (changeType === "update"){ 

      vfs.readFile(path, function (err, entity, body){

        session = findSession(path);
        session.bodies.persisted = body;

        if (body === session.bodies.user){
          markSessionAsSynced(session);
        } else {
          markSessionAsDesynced(session);
        }

      });


    } else if (changeType === "delete"){

    }

  });



  function createEditSession (path, fn){
    // get the data from the server..
    vfs.readFile(path, function (err, entity, body){

      if (err){
        console.error('Failed to load ' + path + ' with error ' + err);
        fn (err, path);
        return;
      }

      var session = {
        entity : entity,
        path : path,
        bodies : {
          persisted : body,
          user : body
        },
        type : 'edit',
        elements : {
          $tab : dom('<li><a href="#">' + entity.name +'</a><span class="typcn typcn-power"></span><span class="typcn typcn-media-record"></span><span class="typcn typcn-arrow-sync"></span></li>')
        },
        status : 'synced',
        active : false
      };

      dom('a', session.elements.$tab).on('mouseup', function (event){
        if (event.which === 1){
          app.emit('edit-entity', path)
        }
      });

      dom('span', session.elements.$tab).on('mouseup', function (event){
        if (event.which === 1){
          app.emit('end-edit-entity', path)
        }
      });

      $ul.append(session.elements.$tab);

      // session gets added to the end list of sessions...
      sessions.push(session);

      fn(false, path);

    });

  }

  function openEditSession (path){

    var session = findSession(path);

    if (sessions[0].active){
      // there's another session currently active, so close it..
      pauseEditSession (sessions[0].path);

    }

    resumeEditSession(path);

  }

  function closeEditSession (path){

    var session = findSession(path);

    if (session){

      session.elements.$tab.remove();

      // remove this session from the list of sessions...
      sessions.splice(sessions.indexOf(session), 1);

      // kill the reference to the DOM node so it can be garbage collected
      session.elements.$tab = null;

      if (sessions[0]){

        resumeEditSession(sessions[0].path);

      } else {

        editor.close();

      }

    }

  }

  function pauseEditSession (path){

    var session = findSession(path);

    session.elements.$tab.removeClass('active');
    session.active = false;

  }

  function resumeEditSession (path){

    var session = findSession(path);

    session.elements.$tab.addClass('active');
    session.active = true;

    sessions.unshift(sessions.splice(sessions.indexOf(session), 1)[0]);

    editor.open(session.entity, session.bodies.user);

  }

  function markSessionAsDesynced (session){
    // add an asterisk to the tab
    session.status = "desynced";
    session.elements.$tab.addClass('desync');
    session.elements.$tab.removeClass('synchronising');
  }

  function markSessionAsSynced (session){
    // remove the asterisk from the tab
    session.status = "synced";
    session.elements.$tab.removeClass('desync');
    session.elements.$tab.removeClass('synchronising');
  }

  function markSessionAsSynchronising (session){
    session.elements.$tab.removeClass('desync');
    session.elements.$tab.addClass('synchronising');
  }

  function findActiveSession (){
    return sessions[0];
  }

  function findSession (path){
    var index = false;
    for (var i = 0; i < sessions.length; i++){
      if (sessions[i].path === path){
        return sessions[i];
      }
    }
    return index;
  }

  /*

  var editSessions = [];

  var mode = "wait";



  window.onkeydown = function (e){

    if((e.ctrlKey || e.metaKey)){

      if (e.which == 83) {

        e.preventDefault();
        app.emit('save-entity');

      }

    }

  }

  app.on('save-entity', function (){

    if (editSessions[0]){
      var currentBody = editor.read();
      if (editSessions[0].body !== currentBody){
        saveEntity(editSessions[0].entity, currentBody);
      }
    }

  });

  app.on('open-entity', function (path){
 
    vfs.readFile(path, function (err, entity, body){

      var sessionIndex = findSessionIndex(path);

      if (sessionIndex === false){

        // brand new session!

        // if there are existing editSessions...
        if (editSessions.length){

          console.log('Pausing ' + editSessions[0].entity.name);
          // we deactivate the current thing...
          editSessions[0].tab.removeClass('active');
          // persist the current user content...
          editSessions[0].body = editor.read();
          // and close...
          editor.close();

        }

        console.log('Opening ' + entity.name);
        var $tab = dom('<li><a href="#">' + entity.name +'</a><span class="typcn typcn-delete"><span></li>');

        $ul.append($tab)

        // event handler for leftclick/rightclick on the tab... 
        dom('a', $tab).on('mouseup', function (event){

          event.preventDefault();

          if (event.which === 1){
            app.emit('open-entity', entity.relPath);
          } else if (event.which === 3){
            contextMenu();
          }

        });

        // event handler for clicking the 'close' icon on the tab...
        dom('span', $tab).on('click', function (event){

          console.log('Closing ' + entity.name);
          app.emit('close-entity', entity.relPath);

        });

        editSessions.unshift({
          entity : entity,
          body : body,
          path : path,
          tab : $tab
        });

        editSessions[0].tab.addClass('active');
        editor.open(editSessions[0].entity, editSessions[0].body)

      } else if (sessionIndex === 0) {

        // actually do nothing. It's already open.

      } else {

        // we want to pull an existing session to the front...
          // we deactivate the current thing...
          editSessions[0].tab.removeClass('active');
          // persist the current user content...
          editSessions[0].body = editor.read();
          // and close...
          editor.close();

          // this pops it to the front..
          editSessions.unshift(editSessions.splice([sessionIndex], 1)[0]);


          // then we can make it active..
          editSessions[0].tab.addClass('active');
          editor.open(editSessions[0].entity, editSessions[0].body, body);
          // restore the original version..
          editSessions[0].body = body;


      }

    });

  });

  app.on('close-entity', function (path){

    var sessionIndex = findSessionIndex(path);

    vfs.readFile(path, function (err, entity, body){

      if (sessionIndex !== false){

        // this is a session which isn't currently active..
        if (editSessions[sessionIndex].body !== body){
          popups.confirm(editSessions[sessionIndex].entity.name, 'You have some unsaved changes. Do you want to:', [
              {
                text : 'Close without saving?',
                classes : '',
                callback : function closeWithoutSaving(){

                  closeEntity(sessionIndex);
                  
                }
              },
              {
                text : 'Save it, then close?',
                classes : '',
                callback : function closeAndSave(){

                  saveEntity(editSessions[sessionIndex].entity, editor.read());
                  closeEntity(sessionIndex);
                  
                }
              },
               {
                text : 'Just leave it open for now?',
                classes : '',
                callback : function closeAndSave(){
                  // do nothing.. 

                }
              },             
            ])
        } else {
          closeEntity(sessionIndex);
        }


      }

    });

  });

  app.on('info-entity', function (path){



  });

  editor.on('unsynced', function (entity){

    var index = findSessionIndex(entity.relPath);

    if (index !== false){

      dom('a', editSessions[index].tab).html('<em>' + entity.name + "</em> * " );    

    }

  });

  editor.on('synced', function (entity){

    var index = findSessionIndex(entity.relPath);

    if (index !== false){

      dom('a', editSessions[index].tab).html( entity.name );    

    }

  });

  editor.on('save', function (entity, body){


    saveEntity(entity, body);

    var index = findSessionIndex(entity.relPath);

    if (index !== false){
      editSessions[index].body = body;
    }


  });

  // new entities from the 
  function findSessionIndex (path){

    for (var i = 0; i < editSessions.length; i++){
      if (editSessions[i].path === path) return i;
    }

    return false;

  }

  function closeEntity (sessionId){

      editSessions[sessionId].tab.remove();

      // destroy the reference to tab... 
      editSessions[sessionId].tab = null;
      // remove the session..
      editSessions.splice(sessionId, 1);

    if (sessionId === 0 && editSessions.length){ // is there another session?
      
      editSessions[0].tab.addClass('active');
      editor.open(editSessions[0].entity, editSessions[0].body)

    } else if (sessionId === 0 && !editSessions.length){
      editor.close();
    }
    // submit to the mercy of the garbage collector..

  }

  function saveEntity (entity, body){


    console.log('Saving ' + entity.name);

    vfs.writeFile(entity.relPath, body, function (err, entity){
      if (!err){
        // we actually don't need to do anythign here at this point... 
        console.log(entity.name + " saved");
        if (editSessions[0].entity.relPath === entity.relPath){
          editor.synced();
        }
        
      } else {
        console.error('Oops! Unable to save!');
      }

    });
  }

  function contentMenu (){
    return false;
  }

  */

};