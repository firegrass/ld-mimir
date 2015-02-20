/*
  
  Simple wrapper around ACE. It triggers 'save' signals and can only edit one thing at once.
  Something else needs to deal with updating this.

*/

var domify = require('domify');

module.exports = function (contentView, layout){

  var stack = [];

  var emitter = new (require('events')).EventEmitter();

  var element = document.createElement('div');

  element.style.display = "none";
  element.style.width = contentView.size().x + "px";
  element.style.height = contentView.size().y + "px";
  element.style.position = "absolute";
  element.style.top = "0px";
  element.style.left = "0px";

  contentView.addElement(element);

  /*
  var editor = ace.edit(element);
  //editor.getSession().setMode('ace/mode/markdown');
  editor.setTheme('ace/theme/monokai');
  editor.getSession().setUseWrapMode(true);
  editor.setShowPrintMargin(false);
  */

  layout.on('resize', function (width, height){

    element.style.width = contentView.size().x + "px";
    element.style.height = contentView.size().y + "px";

  });

  // hide the editor, set the currently active 
  /*
  var currentEntity = false;
  var originalBody = false;
  var currentBody = false;
  var isDirty = false;
  */

   // edit this content...
  emitter.open = function editSession (entity, body, orgBody){

    element.style.display = "";

  };

  emitter.read = function readSession (){
    //return editor.getValue();
  }
  // method for letting the editor know that the content has been persisted
  emitter.synced = function markAsSynched(entity){


  };

  // no sessions to edit.. get rid. 
  emitter.close = function (){
    // hey, so, do we want to 
    element.style.display = "none";


  }

  return emitter;


}