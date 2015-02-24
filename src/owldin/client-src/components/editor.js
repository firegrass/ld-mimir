/*
  
  Simple wrapper around ACE. It triggers 'save' signals and can only edit one thing at once.
  Something else needs to deal with updating this.

*/

var ace = require('brace');
require('brace/mode/json');
require('brace/mode/markdown');
require('brace/theme/monokai');

var domify = require('domify');

module.exports = function (contentView, layout){

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

  layout.on('resize', function (width, height){

    element.style.width = contentView.size().x + "px";
    element.style.height = contentView.size().y + "px";
    editor.resize();

  });

  // hide the editor, set the currently active 
  var currentEntity = false;
  var originalBody = false;
  var currentBody = false;
  var isDirty = false;

  editor.on('change', function (){

    if (currentEntity){

      emitter.emit('change', currentEntity, editor.getValue());

    }

  });

  var currentEntity = false;

  // edit this content...
  emitter.open = function editSession (entity, body){

    currentEntity = entity;
    // make the editor visible.
    if (entity.mime === "text/x-markdown"){
      editor.getSession().setMode('ace/mode/markdown');
    } else if (entity.mime === "application/json"){
      editor.getSession().setMode('ace/mode/json');
    }

    editor.setValue(body, 1);
    editor.focus();

    element.style.display = "";

  };

  emitter.read = function readSession (){
    return editor.getValue();
  }
  emitter.write = function writeSession(body){
    editor.setValue(body, 1);
    editor.focus();
  }

  emitter.focus = function (){
    editor.focus();
  }

  // no sessions to edit.. get rid. 
  emitter.close = function (){
    // hey, so, do we want to 
    element.style.display = "none";

  }

  return emitter;

}