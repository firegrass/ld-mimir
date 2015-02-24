/*
  
  Simple wrapper around ACE. It triggers 'save' signals and can only edit one thing at once.
  Something else needs to deal with updating this.

*/

//var ace = require('brace');
//require('brace/mode/json');
//require('brace/mode/markdown');
//require('brace/theme/monokai');
var marked = require('marked');

var dom = require('green-mesa-dom');

module.exports = function (contentView, layout){

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


  //contentView.addElement($element.els);

//  var editor = ace.edit(element);
//  editor.setTheme('ace/theme/monokai');
//  editor.getSession().setUseWrapMode(true);
//  editor.setShowPrintMargin(false);

  layout.on('resize', function (width, height){

   // element.style.width = contentView.size().x + "px";
    //element.style.height = contentView.size().y + "px";
    //editor.resize();
    $element.css({
      'min-width' : contentView.size().x + 'px',
      'min-height' : contentView.size().y + 'px'
    });

  });

  // hide the editor, set the currently active 
  var currentEntity = false;
  var originalBody = false;
  var currentBody = false;
  var isDirty = false;

  //editor.on('change', function (){

  //  if (currentEntity){

  //    emitter.emit('change', currentEntity, editor.getValue());

  //  }

  //});

  var currentEntity = false;

  // edit this content...
  emitter.open = function editSession (entity, body){

    currentEntity = entity;
    // make the editor visible.
    //if (entity.mime === "text/x-markdown"){
    //  editor.getSession().setMode('ace/mode/markdown');
   // } else if (entity.mime === "application/json"){
    //  editor.getSession().setMode('ace/mode/json');
    //}

    if (entity.mime === 'text/x-markdown'){

      $element.html('<div class="md-preview-content">' + marked(body) + '</div>');

    } else if (entity.mime === 'application/json'){

      $element.html('<div class="md-preview-content">' + marked('~~~json\n' + JSON.stringify(JSON.parse(body), false, 4) + '~~~\n') + '</div>');

    }

    //editor.setValue(body, 1);
    //editor.focus();

    $element.css({
      display : ''
    });

  };

  //emitter.read = function readSession (){
  //  return editor.getValue();
  //}
  emitter.write = function writeSession(body){
    $element.html(marked(body));
  }

  // no sessions to edit.. get rid. 
  emitter.close = function (){
    // hey, so, do we want to 
    $element.css({
      display : 'none'
    });

  }

  return emitter;

}