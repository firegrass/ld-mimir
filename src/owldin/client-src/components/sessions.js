/*

  sessions deals with open edit sessions: The 'tabs' on the top. 

*/

var console = require('./console.js');
var domify = require('domify');
var dom = require('green-mesa-dom');
var popups = require('./modal.js');

module.exports = function (app, vfs, editor, box){

  var sessions = [];

  var ul = domify('<ul class="tabs"></ul>');
  box.addElement(ul);
  $ul = dom(ul);

  app.on('open-entity', function (path){
 
    vfs.readFile(path, function (err, entity, body){

      var sessionIndex = findSessionIndex(path);

      if (sessionIndex === false){

        // brand new session!

        // if there are existing sessions...
        if (sessions.length){

          console.log('Pausing ' + sessions[0].entity.name);
          // we deactivate the current thing...
          sessions[0].tab.removeClass('active');
          // persist the current user content...
          sessions[0].body = editor.read();
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

        sessions.unshift({
          entity : entity,
          body : body,
          path : path,
          tab : $tab
        });

        sessions[0].tab.addClass('active');
        editor.open(sessions[0].entity, sessions[0].body)

      } else if (sessionIndex === 0) {

        // actually do nothing. It's already open.

      } else {

        // we want to pull an existing session to the front...
          console.log('Pausing ' + sessions[0].entity.name);
          // we deactivate the current thing...
          sessions[0].tab.removeClass('active');
          // persist the current user content...
          sessions[0].body = editor.read();
          // and close...
          editor.close();

          // this pops it to the front..
          sessions.unshift(sessions.splice([sessionIndex], 1)[0]);


          // then we can make it active..
          console.log('Unpausing ' + sessions[0].entity.name);
          sessions[0].tab.addClass('active');
          editor.open(sessions[0].entity, sessions[0].body, body)


      }

    });

  });

  app.on('close-entity', function (path){

    var sessionIndex = false;

    sessions.forEach(function (session, index){

      if (session.path === path){
        sessionIndex = index;
      }

    });

    vfs.readFile(path, function (err, entity, body){

      var sessionIndex = false;

      sessions.forEach(function (session, index){

        if (session.path === path){
          sessionIndex = index;
        }

      });

      if (typeof sessionIndex !== 'number'){
        // do nothing
      } else {
        // this is a session which isn't currently active..
        if (sessions[sessionIndex].body !== editor.read()){
          popups.confirm('Unsaved changes', 'Do you wish to...', [
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

                  saveEntity(sessions[sessionIndex].entity, editor.read());
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

  editor.on('unsynced', function (entity){

    var index = findSessionIndex(entity.relPath);

    if (index !== false){

      dom('a', sessions[index].tab).html('<em>' + entity.name + "</em> * " );    

    }

  });

  editor.on('synced', function (entity){

    var index = findSessionIndex(entity.relPath);

    if (index !== false){

      dom('a', sessions[index].tab).html( entity.name );    

    }

  });

  editor.on('save', function (entity, body){


    saveEntity(entity, body);

    var index = findSessionIndex(entity.relPath);

    if (index !== false){
      sessions[index].body = body;
    }


  });

  // new entities from the 
  function findSessionIndex (path){

    for (var i = 0; i < sessions.length; i++){
      if (sessions[i].path === path) return i;
    }

    return false;

  }

  function closeEntity (sessionId){

      sessions[sessionId].tab.remove();

      // destroy the reference to tab... 
      sessions[sessionId].tab = null;
      // remove the session..
      sessions.splice(sessionId, 1);

    if (sessionId === 0 && sessions.length){ // is there another session?
      
      // activate the next one along... 
      console.log('Unpausing ' + sessions[0].entity.name);
      sessions[0].tab.addClass('active');
      editor.open(sessions[0].entity, sessions[0].body)

    } else if (sessionId === 0 && !sessions.length){
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
        editor.synced();
      } else {
        console.error('There has been an error saving!');
      }

    });
  }

  function contextMenu (){
    // not yet implemented...
  }


};