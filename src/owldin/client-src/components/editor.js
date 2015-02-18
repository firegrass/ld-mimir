/*
  
  Simple wrapper around ACE. It triggers 'save' signals and can only edit one thing at once.
  Something else needs to deal with updating this.

*/

var ace = require('brace');
require('brace/mode/json');
require('brace/mode/markdown');
require('brace/theme/monokai');

var domify = require('domify');

module.exports = function (box, layout){

  var stack = [];

  var emitter = new (require('events')).EventEmitter();

  var element = box.element;
  element.style.display = "none";

  var editor = ace.edit(element);
  //editor.getSession().setMode('ace/mode/markdown');
  editor.setTheme('ace/theme/monokai');
  editor.getSession().setUseWrapMode(true);
  editor.setShowPrintMargin(false);

  layout.on('resize', function (width, height){

    editor.resize();

  });

  // hide the editor, set the currently active 
  var currentEntity = false;
  var originalBody = false;
  var currentBody = false;
  var isDirty = false;

  editor.on('change', function (){

    if (currentEntity){

      currentBody = editor.getValue();
      if (currentBody !== originalBody){
        if (!isDirty){
          isDirty = true;
          emitter.emit('unsynced', currentEntity);
        }
      } else if (currentBody === originalBody && isDirty){
        isDirty = false;
        emitter.emit('synced', currentEntity);
      }

    }

  });


  window.onkeydown = function (e){
    if((e.ctrlKey || e.metaKey) && e.which == 83) {
        // Save Function
        e.preventDefault();
        if (currentEntity && isDirty){
          emitter.emit('save', currentEntity, currentBody);
        }
    };
  }

  // edit this content...
  emitter.open = function editSession(entity, body, orgBody){

    // make the editor visible.
    if (entity.mime === "text/x-markdown"){
      editor.getSession().setMode('ace/mode/markdown');
    } else if (entity.mime === "application/json"){
      editor.getSession().setMode('ace/mode/json');
    }

    editor.setValue(body, 1);
    editor.focus();

    currentEntity = entity;
    originalBody = currentBody = body;
    if (orgBody){
      originalBody = orgBody;
      if (originalBody !== currentBody){
        isDirty = true;
      }
    }
    element.style.display = "";

  };

  emitter.read = function readSession (){
    return editor.getValue();
  }

  // method for letting the editor know that the content has been persisted
  emitter.synced = function markAsSynched(entity){
    originalBody = currentBody;
    isDirty = false;
    emitter.emit('synced', currentEntity);
  };

  // no sessions to edit.. get rid. 
  emitter.close = function (){
    // hey, so, do we want to 
    element.style.display = "none";
    currentEntity = false;
    originalBody = false;
    isDirty = false;

  }

  return emitter;


}