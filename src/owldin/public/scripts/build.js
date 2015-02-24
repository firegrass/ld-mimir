(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var moment = require('moment');

var box = document.createElement('div');



module.exports = {
  log : function (str){
    box.innerHTML += "<p><em>" + moment().format('h:mm:ss a')+"</em>: " + str + "</p>";
    box.parentNode.scrollTop = box.parentNode.scrollHeight;
  },
  error : function (str){
    box.innerHTML += "<p class='error'><em>" + moment().format('h:mm:ss a')+"</em>: " + str + "</p>";
    box.parentNode.scrollTop = box.parentNode.scrollHeight; 
  },
  appendTo : function (element){

    element.appendChild(box);
    element.style.OverflowY = "scroll";
    element.style.OverflowX = "hidden";

  }
}


module.exports.element = box;


},{"moment":37}],2:[function(require,module,exports){
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
},{"brace":"brace","brace/mode/json":"brace/mode/json","brace/mode/markdown":"brace/mode/markdown","brace/theme/monokai":"brace/theme/monokai","domify":16,"events":35}],3:[function(require,module,exports){
var domify = require('domify');
var dom = require('green-mesa-dom');

module.exports = function (vfs, app, box){

  var files = domify('<ul></ul>')
  files.className = "box-inner files";
  box.addElement(files);

  // this event gets triggered whenever the virtual file system has finished synchronising with the server
  vfs.on('sync', function (path){

    vfs.getAll(refreshTree);

  });

  function deleteChildren (node){
    var fn = function (){ this.remove(); this.onclick = null; };
    var fns = [];
    forEach.call( node.childNodes , function (node){ 
      fns.push(fn.bind(node))
    });
    forEach.call(fns, function(fn){fn()});
  }

  function fileT (o){
    return '<li class="file">' +
        '<span class="typcn typcn-document-text"></span>' +
        '<a href="#">' + 
          o.name +
        '</a>' +
        '<span class="typcn typcn-hover typcn-eye-outline"></span>' + 
        '<span class="typcn typcn-hover typcn-info-large"></span>' + 
      '</li>';
  }

  function folderT (o){
    return '<li>' +
        '<span class="typcn typcn-folder"></span>' +
        '<span class="typcn typcn-folder-open"></span>' +
        '<a href="#">' + 
          o.name + 
        '</a>' +
        '<span class="typcn typcn-hover typcn-document-add"></span>' +
        '<span class="typcn typcn-hover typcn-folder-add"></span>' + 
        '<span class="typcn typcn-hover typcn-info-large"></span>' + 
      '</li>';

  }

  function refreshTree (tree){

    //deleteChildren(files);

    dom('li', files).remove();
    var $files = dom(files);

    function showContents (tree, $parent, level){

      //var el = domify(newFolder());
    //  $newFolder = dom('a', el);
     // $parent.append(el);

      tree.forEach(function (entity){

        var el, $a, $ul = false;

        if (entity.type === "file"){

          el = domify(fileT(entity));
          $a = dom('a', el);

          $preview = dom('span.typcn-eye-outline', el);
          $info = dom('span.typcn-info-large', el);
          $delete = dom('span.typcn-trash', el);

          $a.on('mouseup', (function (entity, $el, event){

            if (event.which === 1){

              app.emit('edit-entity', entity.path);

            } else if (event.which === 3){

              fileContextMenu(entity, $el);

            }

          }).bind({}, entity, dom(el)))

          $preview.on('click', (function (entity, event){

            event.preventDefault();

            app.emit('preview-entity', entity.path);

          }).bind({}, entity));

          $info.on('click', (function (entity, event){

            event.preventDefault();

            app.emit('edit-entity-info', entity.path);

          }).bind({}, entity));


        } else if (entity.type === "folder"){

          el = domify(folderT(entity));
          $a = dom('a', el);
          
          $ul = dom('<ul class="level-' + (level + 1)+ '"></ul>');

          $a.on('mouseup', (function(entity, $el, $ul, event){

            if (event.which === 1){
              $el.toggleClass('open');
              $ul.toggleClass('open');

            }

          }).bind({}, entity, dom(el), $ul));



          showContents(entity.contents, $ul, level + 1);

        }

        $parent.append(el);
        if ($ul){
          $parent.append($ul);
        }

      });

    }

    showContents(tree, $files, 0);

    dom('ul.files  > li', box.element).addClass('open');
    dom('ul.files > ul.level-1', box.element).addClass('open');

  }

  function fileContextMenu(entity, $el){

    console.log('Content menu not implemented');

  }

};
},{"domify":16,"green-mesa-dom":20}],4:[function(require,module,exports){
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
},{"domify":16,"events":35}],5:[function(require,module,exports){
var $ = document.querySelector.bind(document);
var console = require('./console.js');

module.exports = function screenInitialiser (){

  /*
      --top menu-------------
      -n---tabs--------------
      -a--                  -
      -v-- edit window      -
      - --                  -
      --footer---------------
  */

  var emitter = new (require('events')).EventEmitter;

  // heights config.. 
  var topMenuHeight = 30;
  var fileNavigationWidth = 300;
  var editorTabHeight = 25;
  var consoleHeight = 100;

  // some css classes config... 
  var fileNavigationClass = 'file-nav';
  var pageClass = 'page';
  var topMenuClass = 'top-menu';
  var editorWrapperClass = 'content-view';
  var editorTabsClass = 'tabs';
  var editorViewClass = 'editor';
  var consoleClass = 'console';

  // create an outer wrapper..
  var page = createBox(pageClass);
  page.element.style.overflow = "hidden";

  var topMenu = createBox(topMenuClass);
  page.addBox(topMenu);

  var fileNavigation = createBox(fileNavigationClass);
  page.addBox(fileNavigation);

  var editorWrapper = createBox(editorWrapperClass);
  page.addBox(editorWrapper);

  var editorTabs = createBox(editorTabsClass);
  editorWrapper.addBox(editorTabs);

  var editorView = createBox(editorViewClass);
  editorWrapper.addBox(editorView);

  var consoleView = createBox(consoleClass);
  page.addBox(consoleView);

  require('./console.js').appendTo(consoleView.element);

  //consoleView.addElement(console.element);

  // now append to the actual body...
  page.appendToElement(document.querySelector('body'));

  var gr = (1 + Math.sqrt(5)) / 2;
  // make sure we have a handler...
  function handleResize (e){

    var innerWidth = window.innerWidth;
    var innerHeight = window.innerHeight;

    fileNavigationWidth = window.innerWidth - (window.innerWidth / gr);

    page.size(innerWidth, innerHeight);
    page.position(0, 0);

    topMenu.size(innerWidth, topMenuHeight);
    topMenu.position(0, 0);

    consoleView.size(innerWidth, consoleHeight);
    consoleView.position(0, innerHeight - consoleHeight);

    fileNavigation.size(fileNavigationWidth - 10, innerHeight - topMenu.size().y - consoleView.size().y - 10);
    fileNavigation.position(0, (topMenu.size().y));

    editorWrapper.size(innerWidth - (fileNavigationWidth + 1), innerHeight - topMenu.size().y - consoleView.size().y);
    editorWrapper.position(fileNavigationWidth + 1,(topMenu.size().y));

    editorTabs.size(editorWrapper.size().x, editorTabHeight);
    editorTabs.position(0, 0);

    editorView.size(editorWrapper.size().x, editorWrapper.size().y - editorTabHeight);
    editorView.position(0, editorTabHeight);

    emitter.emit('resized', innerWidth, innerHeight);

  }

  window.addEventListener('resize', handleResize, false);

  emitter.page = page;
  emitter.menu = topMenu;
  emitter.nav = fileNavigation;
  emitter.tabs = editorTabs;
  emitter.editor = editorView;
  emitter.console = consoleView;

  // trigger a resize manually to get initial positions and sizes... 
  handleResize();

  return emitter;

}

function createBox (className){

  var el = document.createElement('div');
  var style = el.style;
  el.className = "box " + className ;
  style.position = "absolute";
  style.top = "0px";
  style.left = "0px";
  style.width = "0px";
  style.height = "0px";

  return {
    element : el,
    position : function (x, y){
      if (!arguments.length){
        return {
          x : parseInt(style.left, 10),
          y : parseInt(style.top, 10)
        }
      } 
      style.top = y + "px";
      style.left = x + "px";
    },
    size : function (x, y){
      if (!arguments.length){
        return {
          x : parseInt(style.width, 10),
          y : parseInt(style.height, 10)
        }
      } 
      style.height = y + "px";
      style.width = x + "px";
    },
    addBox : function (box){
      box.appendToElement(el);
    },
    addElement : function (element){
      el.appendChild(element);
    },
    appendToElement : function (element){
      element.appendChild(el);
    }
  }

}
},{"./console.js":1,"events":35}],6:[function(require,module,exports){
var dom = require('green-mesa-dom');
var each = require('foreach');

var backdrop = '<div class="modal-backdrop fade"></div>';
var button = function (o){ return '<button class="btn btn-mini ' + o.classes +'">' + o.option +'</button>'; };

var modal = function (o){ return '' + 
  '<div class="modal fade">' +
  ' <div class="modal-header">' +
  '   <h3>'+ o.header + '</h3>' +
  ' </div>' + 
  ' <div class="modal-body">' +
  '   <p>' + o.message + '</p>' +
  ' </div>' +
  ' <div class="modal-footer">' +
  '   <div class="btn-group">' +
  '   </div>' +
  '</div>' +
  '</div>'
};

var loading = '' +
'<div class="modal fade">' +
' <div class="modal-header">Loading... please wait</div>' +
' <div class="modal-body text-center"><img src="/images/ajax-loader.gif"></div>' + 
' <div class="modal-footer"></div>' +
'</div>';

function Popups (){

  this.backdrop = dom(backdrop);
  this.loader = dom(loading);

  return this;

}

Popups.prototype = {
  loading : function (){

    clearTimeout(this.timeout);

    dom('body').append(this.backdrop);
    dom('body').append(this.loader);

    this.timeout = setTimeout((function (){

      this.backdrop.addClass('in');
      this.loader.addClass('in');

    }).bind(this), 100);
  },
  notLoading : function (){

    clearTimeout(this.timeout);

    this.backdrop.removeClass('in');
    this.loader.removeClass('in');

    this.backdrop.remove();
    this.loader.remove();

  },
  message : function (header, message, fn){

    console.log(message);
    fn();

  },
  confirm : function (header, message, options){

    var confirmBox = dom(modal({ header : header, message: message }));

    var btnGroup = dom(confirmBox).find('.btn-group');

    dom('body').append(this.backdrop);
    dom('body').append(confirmBox);

    this.backdrop.css({
      height : window.innerHeight + "px"
    })

    each(options, function (option){

      var btn = dom(button({option : option.text, classes: option.classes ? option.classes : ""}));

      btnGroup.append(btn);

      btn.on('click', (function (e){

        e.preventDefault();

        this.backdrop.remove();
        confirmBox.remove();

        option.callback();

      }).bind(this));

    }, this);

    setTimeout((function (){ 
      confirmBox.addClass('in');
      this.backdrop.addClass('in');
    }).bind(this),10);

  }

};

var popups = new Popups();

module.exports = popups;
},{"foreach":18,"green-mesa-dom":20}],7:[function(require,module,exports){
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
},{"events":35,"green-mesa-dom":20,"marked":36}],8:[function(require,module,exports){
var console = require('./console.js');
var domify = require('domify');
var dom = require('green-mesa-dom');
var popups = require('./modal.js');
var filesize = require('filesize');

module.exports = function (app, vfs, editor, info, previewer, box){

  

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

  app.on('preview-entity', function (path){

    var session = findSession(path, 'preview');

    if (!session){
      createPreviewSession(path, function (err, path){
        openSession(path, 'preview');
      });
    } else {
      openSession(path, 'preview');
    }

  });

    // the application tells us what the user wants to do...
  app.on('edit-entity', function (path){

    var session = findSession(path, 'edit');

    if (!session){

      createEditSession(path, function (err, path){
        openSession(path, 'edit');
      });

    } else {

      openSession(path, 'edit');

    }

  });

  app.on('save-entity', function (){

    var session = findActiveSession();
    editor.focus();

    if (session.type === "edit"){
      if (session.bodies.user !== session.bodies.persisted){
        markSessionAsSynchronising(session);
        vfs.writeFile(session.path, session.bodies.user, function (err, entity){
          // we don't care at this point... 
          console.log('Saved <strong>' + entity.name + '</strong> to ' + entity.relPath + ' (' + filesize(entity.size) + ')');

        });
      }
    }

  });

  app.on('end-edit-entity', function (path){

    var session = findSession(path, 'edit');

    if (session){
      closeSession(path, 'edit');
    }

  });

  app.on('end-preview-entity', function (path){

    var session = findSession(path, 'preview');

    if (session){
      closeSession(path, 'preview');
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

        session = findSession(path, 'edit');
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

  function createSession (path, entity, body){

    return {
      entity : entity,
      path : path,
      elements : {
        $tab : dom('<li><a href="#"></a><span class="typcn typcn-power"></span><span class="typcn typcn-media-record"></span><span class="typcn typcn-arrow-sync"></span></li>')
      },
      status : 'synced',
      active : false,
      bodies : {
          persisted : body,
          user : body
      }
    }

  }

  function createPreviewSession (path, fn){

    vfs.readFile(path, function (err, entity, body){

      if (err){
        console.error('Failed to load ' + path + ' with error ' + err);
        fn (err, path);
        return;
      }

      var session = createSession(path, entity, body);

      session.type = 'preview';

      session.elements.$tab.addClass('preview');

      var $a = dom('a', session.elements.$tab);

      $a.text('Preview: ' + entity.name);

      $a.on('click', function (e){
        app.emit('preview-entity', path)
      });

      dom('span', session.elements.$tab).on('click', function (event){
        app.emit('end-preview-entity', path)
      });

      $ul.append(session.elements.$tab);

      // session gets added to the end list of sessions...
      sessions.push(session);

      fn(false, path);

    });

  }

  function createEditSession (path, fn){
    // get the data from the server..

    vfs.readFile(path, function (err, entity, body){

      if (err){
        console.error('Failed to load ' + path + ' with error ' + err);
        fn (err, path);
        return;
      }

      var session = createSession(path, entity, body);

      session.type = 'edit';

      var $a = dom('a', session.elements.$tab);

      $a.text(entity.name);

      $a.on('click', function (e){
        app.emit('edit-entity', path)
      });

      dom('span', session.elements.$tab).on('click', function (event){
        app.emit('end-edit-entity', path)
      });

      $ul.append(session.elements.$tab);

      // session gets added to the end list of sessions...
      sessions.push(session);

      fn(false, path);

    });

  }

  function pauseActiveSession (){

    if (sessions[0].active){
      sessions[0].elements.$tab.removeClass('active');
      sessions[0].active = false;

      if (sessions[0].type === 'preview'){
        previewer.close();
      } else if (sessions[0].type === 'edit'){
        editor.close();
      }

    }

  }


  function openSession (path, type){

    pauseActiveSession();
    resumeSession(path, type);

  }

  function closeSession (path, type){

    var session = findSession(path, type);

    if (session){

      session.elements.$tab.remove();

      // remove this session from the list of sessions...
      sessions.splice(sessions.indexOf(session), 1);

      // kill the reference to the DOM node so it can be garbage collected
      session.elements.$tab = null;

      if (type === 'preview'){
        previewer.close();
      } else if (type === 'edit'){
        editor.close();
      }

      if (sessions[0]){

        resumeSession(sessions[0].path, sessions[0].type);

      }

    }

  }

  function resumeSession (path, type){

    var session = findSession(path, type);

    session.elements.$tab.addClass('active');
    session.active = true;

    sessions.unshift(sessions.splice(sessions.indexOf(session), 1)[0]);

    if (type === 'edit'){

      editor.open(session.entity, session.bodies.user);

    } else if (type === 'preview'){

      previewer.open(session.entity, session.bodies.user);

    }

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

  function findSession (path, type){
    var index = false;
    for (var i = 0; i < sessions.length; i++){
      if (sessions[i].path === path && sessions[i].type === type){
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
},{"./console.js":1,"./modal.js":6,"domify":16,"filesize":17,"green-mesa-dom":20}],9:[function(require,module,exports){
var dom = require('green-mesa-dom');

module.exports = function (app, box){

  var $menu = dom('' + 
    '<ul class="box-inner menu-content">' +
    '<li><span class="typcn typcn-th-menu"></span>' + 
      '<ul>' + 
        '<li><a href="#" rel="rels/save-file"><span class="typcn typcn-arrow-sync"></span>Save</a></li>' + 
      '</ul>' + 
    '</li>' +
  '</ul>');

  $menu.appendTo(box.element);

  dom('a[rel="rels/save-file"]', $menu).on('click', function (e){

    e.preventDefault();
    app.emit('save-entity');

  });


}
},{"green-mesa-dom":20}],10:[function(require,module,exports){
// all I want to do initially, as a test, is get a list of files... 

var request = require('browser-request');
var vfsRoot = window.location.protocol + "//" + window.location.host + "/vfs";
var sockRoot = window.location.protocol + "//" + window.location.host + "/comms"
var domify = require('domify');
var marked = require('marked');
var Delegate = require('dom-delegate').Delegate;


// application level broker... 
var app = new (require('events')).EventEmitter();

// layout provider..
var layout = require('./components/layout.js')()

var console = require('./components/console.js');
// virtual file system...
var vfs = require('./lib/file-system').initialiseFileSystem(vfsRoot, sockRoot);

// initialise the entity selector. This MUST happen before the first vfs:sync event.
var entitySelector = require('./components/entity-selector.js')(vfs, app, layout.nav);

var topMenu = require('./components/top-menu.js')(app, layout.menu)

// an instance of the editor abstraction..
var editor = require('./components/editor.js')(layout.editor, layout);
// an instance of the info editor abstraction..
var info = require('./components/info.js')(layout.editor, layout);
// an instance of the editor abstraction..
var previewer = require('./components/previewer.js')(layout.editor, layout);

// an edit session manager.
var sessions = require('./components/sessions.js')(app, vfs, editor, info, previewer, layout.tabs);

// now we want to listen to various signals coming from the entity selector so that we 
// can actually interact with the system...

window.onkeydown = function (e){

  if((e.ctrlKey || e.metaKey)){

    if (e.which == 83) {

      e.preventDefault();
      app.emit('save-entity');

    }

  }

}



// the entity selector (or 'file navigation thing' to you and I, but we can't call it that)



/*

var $ = document.querySelector.bind(document);

$('body').oncontextmenu = function (event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  };


var SocksJS = require('./lib/socks.js');



var ace = require('brace');
require('brace/mode/json');
require('brace/mode/markdown');
require('brace/theme/monokai');

var fileSystem = {
  children : {
    root : {
      entities : [],
      name : "/",
      href : vfsRoot + "/",
      children : {},
      parent : false
    }
  }
};

var socket = new SocksJS(sockRoot);

socket.onopen = function (){
  console.log('socket open!');
}
socket.onmessage = function (e){

  var msg = JSON.parse(e.data);

  for (var i in msg){

    console.log(msg[i], i)

  }

}

var editSessions = {};
var activeDirectory = false;
var activeSession = false;
var directoryCache = {};

var fileSystemViewElements = {};
var forEach = Array.prototype.forEach;

var page = createBox('page');
page.position(0,0);
page.size(window.innerWidth, window.innerHeight);
page.appendToElement(document.querySelector('body'));

var topMenu = createBox('top-menu');
topMenu.position(0,0);
topMenu.size(window.innerWidth, 30);

var topMenuContent = domify([
  '<ul class="box-inner menu-content">',
  '<li><span>File</span><ul><li><a href="#" rel="rels/new-file">New file</a></li><li><a href="#" rel="rels/new-folder">New folder</a></li></ul></li>',
  '</ul>'
].join('\n'));

topMenu.addElement(topMenuContent);

var fileNavigation = createBox('file-nav');
fileNavigation.position(0,(topMenu.size().y));
fileNavigation.size(301, window.innerHeight - topMenu.size().y);
page.addBox(fileNavigation);

var files = document.createElement('ul');
files.className = "box-inner files";
fileNavigation.addElement(files);


var contentView = createBox('content-view');
contentView.position(301,(topMenu.size().y));
contentView.size(window.innerWidth - 302, window.innerHeight - topMenu.size().y);
page.addBox(contentView);

var content = domify([
  '<div class="box-inner content">',
  '<ul class="tabs"></ul>',
  '<ul class="tab-bodies"></ul>',
  '</div>'
].join('\n'));


  
  // doesn't belong here...
  var topMenuContent = domify([
    '<ul class="box-inner menu-content">',
    '<li><span>File</span><ul><li><a href="#" rel="rels/new-file">New file</a></li><li><a href="#" rel="rels/new-folder">New folder</a></li></ul></li>',
    '</ul>'
  ].join('\n'));

  topMenu.addElement(topMenuContent);
  

contentView.addElement(content);

page.addBox(topMenu);

var delegate = new Delegate(document.body);

delegate.on('click', 'ul.menu-content li ul li a', function (e){

  var rel = e.target.getAttribute('rel');

  switch (rel){

    case "rels/new-folder": 

      createFolder(activeDirectory);

      break;

    case "rels/new-file":

      createFile(activeDirectory);

      break;

  }

});


function getContentViewSize (){
  var headerHeight = content.querySelector('ul.tabs').offsetHeight;
  var pageSize = contentView.size();
  return {
    x : pageSize.x,
    y : pageSize.y,
    headerHeight : headerHeight
  }

};

window.onresize = function (event){
  page.size(window.innerWidth, window.innerHeight);
  fileNavigation.size(300, window.innerHeight);
  contentView.size(window.innerWidth - 301, window.innerHeight);
}

window.onkeydown = function (e){
  if((e.ctrlKey || e.metaKey) && e.which == 83) {
      // Save Function
      e.preventDefault();
      saveSession();
      return false;
  };
}

function saveSession (){

  var val = activeSession.editor.getSession().getValue();

  if (val !== activeSession.originalValue){
  
    var beingSaved = activeSession;

    saveFile(activeSession.path, val, function (err, response){

      if (!err){

        var currentVal = beingSaved.editor.getSession().getValue();
        if (currentVal === val){
          beingSaved.tabHeader.querySelector('a').innerText = beingSaved.entity.name
        }

      } else {
        alert(err);
      }

    })

  }

}

function endSession (entity){

  var session = editSessions[entity.href];

  var val = session.editor.getSession().getValue();

  if (val !== session.originalValue){
    if(!confirm('You will lose changes. Are you sure you wish to quit?')){
      return;

    }
  }

  session.editor.destroy();
  session.tabHeader.parentNode.removeChild(session.tabHeader);
  session.tab.parentNode.removeChild(session.tab);
  session.tab = null;
  session.tabHeader.querySelector('a').onclick = null;
  session.tabHeader.querySelector('span.typcn-delete').onclick = null;
  session.tabHeader = null;
  delete editSessions[entity.href];

}

function createBox (className){

  var el = document.createElement('div');
  var style = el.style;
  el.className = "box " + className ;
  style.position = "absolute";
  style.top = "0px";
  style.left = "0px";
  style.width = "0px";
  style.height = "0px";

  return {
    element : el,
    position : function (x, y){
      if (!arguments.length){
        return {
          x : parseInt(style.left, 10),
          y : parseInt(style.top, 10)
        }
      } 
      style.top = y + "px";
      style.left = x + "px";
    },
    size : function (x, y){
      if (!arguments.length){
        return {
          x : parseInt(style.width, 10),
          y : parseInt(style.height, 10)
        }
      } 
      style.height = y + "px";
      style.width = x + "px";
    },
    addBox : function (box){
      box.appendToElement(el);
    },
    addElement : function (element){
      el.appendChild(element);
    },
    appendToElement : function (element){
      element.appendChild(el);
    }
  }

}

function createAceInstance (element){
  var editor = ace.edit(element);
  editor.getSession().setMode('ace/mode/markdown');
  editor.setTheme('ace/theme/monokai');
  editor.setShowPrintMargin(false);
  return editor;
}



function insertText (node, text){
  node.appendChild(document.createTextNode(text));
}

function makeEditSessionActive (entity){

  var session;

  session = editSessions[entity.href];

  forEach.call(content.querySelectorAll('ul.tab-bodies li'), function (li){
    li.style.display = 'none';
  });

  forEach.call(content.querySelectorAll('ul.tabs li.active'), function (li){
    li.className = li.className.replace('active', '');
  });

  session.tab.style.display = 'block';
  session.tabHeader.className += "active";

  activeSession = session;

}

function editFile (entity, element, event){

  if (!event || (event.which === 1 && event.target.tagName !== "INPUT")){

    var session;

    if (!editSessions[entity.href]){
      session = createEditSession(entity);
    } else {
      session = editSessions[entity.href];
    }

    loadFile(entity.href, function (err, response){

      var originalValue = response; 
      session.originalValue = originalValue;
      session.editor.setValue(originalValue);

      session.editor.getSession().on('change', function (e){
        var currentValue = session.editor.getValue();
        if (currentValue !== originalValue){
          session.tabHeader.querySelector('a').innerText = session.entity.name + " * " 
        } else {
          session.tabHeader.querySelector('a').innerText = session.entity.name
        }
      })

      forEach.call(content.querySelectorAll('ul.tab-bodies li'), function (li){
        li.style.display = 'none';
      });

      forEach.call(content.querySelectorAll('ul.tabs li.active'), function (li){
        li.className = li.className.replace('active', '');
      });

      session.tab.style.display = 'block';
      session.tabHeader.className += "active";

      activeSession = session;

    });

  } else if (event.which === 3){

    var clickShield = domify('<div></div>');
    clickShield.style.width = window.innerWidth + "px";
    clickShield.style.height = window.innerHeight + "px";
    clickShield.style.position = "absolute";
    clickShield.style.top = "0px";
    clickShield.style.left = "0px";

    $('body').appendChild(clickShield);

    var reset = function reset(){
      clickShield.removeEventListener('click', reset);
      $('body').removeChild(clickShield);
      $('body').removeChild(contextMenu)
    }

    clickShield.addEventListener('click', reset);

    // right...
    var contextMenu = domify('<ul class="context-menu">' +
      '<li><a href="#" rel="rels/rename-file">Rename</a></li>' +
      '<li><a href="#" rel="rels/delete-file">Delete</a></li>' +
      '</ul>')

    $('body').appendChild(contextMenu);

    contextMenu.style.top = event.clientY + "px";
    contextMenu.style.left = event.clientX + "px";

    var del = new Delegate(contextMenu);
    del.on('click', 'a', function (e){
      e.preventDefault();
      reset();
      //alert(e.target.getAttribute('rel'))
      switch (e.target.getAttribute('rel')){

        case "rels/open-file" :
          editFile(entity);
          break;
        case "rels/rename-file" : 
          element.style.display = "none";
          var input = document.createElement('input')
          element.parentNode.appendChild(input);
          input.value = entity.name;
          input.focus();
          input.onkeydown = function (e){
            if (e.which === 13 && input.value !== ""){
              renameFile (entity, input.value);
              element.style.display = "";
              element.parentNode.removeChild(input);
              input.onkeydown = null;
              input.onclick = false;
              input = null;


            }
          }
          input.onclick = function (e){
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        case "rels/delete-file":
          deleteFile(entity);
          break;
      }

    });

  }

}

function renameFile (entity, newName){

  var uri = entity.href.replace(entity.name, newName);

  var oldUri = entity.href.replace(vfsRoot, '');

  var session = false;

  if (editSessions[entity.href]){
    session = editSessions[entity.href];
  }

  request({ method: 'POST', url : uri, json : { renameFrom : oldUri }}, function (err, response, body){
    loadDirectory(activeDirectory);
    if (session){
      editSessions[uri] = session;
      editSessions[uri].path = uri;
      editSessions[entity.href] = null;
      editSessions[uri].tabHeader.querySelector('a').innerText = newName;
    }
  });
}

function renameFolder (currentPath, oldFolderName, newFolderName){

  var uri = currentPath.replace(oldFolderName, newFolderName);

  var oldUri = currentPath.replace(vfsRoot, '');

  request({ method: 'POST', url: uri, json : { renameFrom : oldUri}}, function (err, response, body){
    loadDirectory(activeDirectory);
  });


}

function deleteFile (entity){
  alert('delete file');
}

function createFolder (path){
  request({ method : 'PUT', url : path + "New folder/"}, function (err, response, body){
    if (!err){
      loadDirectory(activeDirectory);
    } else {
      alert(err);
    }

  })
}

function createFile (path){
  request({ method : 'PUT', url : path + 'Untitled.md', body : ''}, function (err, response, body){
    if (!err){
      loadDirectory(activeDirectory);

    } else {
      alert(err);
    }
  })
}

function createEditSession (entity){

  var path = entity.href;

  var container = domify('<li></li>');
  var tabHeader = domify('<li><a href="#">' + entity.name +'</a><span class="typcn typcn-delete"><span></li>');
  tabHeader.querySelector('a').onclick = makeEditSessionActive.bind({}, entity);
  content.querySelector('ul.tabs').appendChild(tabHeader);

  var size = getContentViewSize();

  var tabBody = createBox('edit-window');
  tabBody.size(size.x, size.y - size.headerHeight);
  tabBody.position(0, size.headerHeight);
  tabBody.appendToElement(container);
  content.querySelector('ul.tab-bodies').appendChild(container);

  var editor = ace.edit(tabBody.element);
  if (entity.name.match(/\.md$/)){
  editor.getSession().setMode('ace/mode/markdown');
  } else {
    editor.getSession().setMode('ace/mode/json');
  }
  editor.setTheme('ace/theme/monokai');
  editor.setShowPrintMargin(false);

  editSessions[path] = {
    editor : editor,
    path : path,
    box : tabBody,
    tab : container,
    entity : entity,
    tabHeader : tabHeader
  }

  tabHeader.querySelector('span.typcn-delete').onclick = function (e){

    endSession(entity);

  };

  editor.on('change', function (){

    var currline = editor.getSelectionRange().start.row;
    var wholelinetext = editor.session.getLine(currline);
    var currchar = editor.getSelectionRange().start.column;

    var doSearch = false;
    var uri = false;
    var mode = false;

    if (currchar === (wholelinetext.length - 1) && (/recommendations:$/.test(wholelinetext))){

      doSearch = true;
      uri = "something";
      mode = "recommendations";

    } else if (currchar === (wholelinetext.length - 1) && (/qualitystatements:$/.test(wholelinetext))){

      doSearch = true;
      uri = "somethingelse";
      mode = "Quality statements";

    }

    if (doSearch){

      var offset = editor.renderer.scroller.getBoundingClientRect();
      var padding = editor.renderer.$padding;
      var cur = editor.getCursorPosition();

      // get the x and y position of 
      var x = Math.ceil((cur.column + 1) * editor.renderer.characterWidth) + offset.left + padding;
      var y = Math.ceil(cur.row * editor.renderer.lineHeight) + offset.top;

      var input = domify('<input placeholder="Search for concepts" class="autocomplete-input" type="text"></input>');
      //input.style.position = "absolute";
      //input.style.zIndex = 1;
      input.style.left = x + "px";
      input.style.top = y + "px";

      document.body.appendChild(input);

      input.focus();

      var lastVal = "";
      var requestInProgress = false;

      var container;

      function getResults (term){
          request('/ld/concepts/' + term, function (err, response, body){
            requestInProgress = false;
             processResults(err, JSON.parse(body));
          });
      };

      function processResults (err, body){
        requestInProgress = false;
        if (lastVal !== input.value){
          lastVal = input.value;
          getResults(lastVal);
        }
        var rect = input.getBoundingClientRect();

        if (container){
          document.body.removeChild(container);
        }

        container = domify('<ul class="autocomplete-popup"></ul>');
        container.style.position = "absolute";
        container.style.top = rect.bottom + "px";
        container.style.left = rect.left + "px";

        body.forEach(function (concept, index){

          var li = domify('<li>' + concept.value.object +'</li>');
          li.onclick = function (e){
            e.preventDefault();

            // remove event handlers from other lis..
            var fns = [];
            Array.prototype.forEach.call(container.querySelectorAll('li'), function (li){
              //input.value = concept.value.object;
              currentVal = lastVal = input.value = concept.value.object;
              li.onclick = false;
              fns.push(function (){
                container.removeChild(li);
              });
            });
            fns.forEach(function (fn){ fn(); });

            document.body.removeChild(input);

            var loading = domify('<li class="loading">Searching for ' + mode + ' for ' + concept.value.object +'</li>');
            container.appendChild(loading);

            container.style.top = rect.top + "px";

            searchForThings(concept.value.object);


            //document.body.removeChild(container);
            //editor.focus();
            //editor.insert(concept.value.subject);
            //document.body.removeChild(input);
          }
          container.appendChild(li);

        });

        document.body.appendChild(container);

        //console.log(input.calculateBoundingRect())
        //console.log(body);
      };

      function searchForThings (tag){
        if (mode === "recommendations"){
          request('/ld/recommendations/' + tag, function (err, res){
            var triples = JSON.parse(res.body);
            console.log(triples);
            var rect = container.getBoundingClientRect();

            var results = domify('<div class="ld-result"><h3>Recommendations</h3><ul></ul></div>');
            var ul = results.querySelector('ul');

            results.style.top = rect.top + "px";
            results.style.left = rect.left + "px";
            results.style.maxHeight = (window.innerHeight - rect.top - 200) + 'px'

            document.body.removeChild(container);
            container = "";

            triples.forEach(function (triple){

              var li = domify('<li></li>');
              var id = domify('<p class="id">' + triple.subject + '</p>');
              var text = domify('<div>' + marked(triple.object.replace(/\n\?\s/g, '\n- ')) + '</div>');
              var insert = domify('<a href="#">Insert a link to this recommendation</a>');

              insert.onclick = function (e){

                e.preventDefault();
                editor.focus();
                editor.insert(triple.subject);

                // 
                Array.prototype.forEach.call(results.querySelectorAll('a'), function (a){
                  a.onclick = "";
                });

                document.body.removeChild(results);
                results = null;

              }

              li.appendChild(id);
              li.appendChild(text);
              li.appendChild(insert);

              ul.appendChild(li);

            });

            document.body.appendChild(results);

          })
        }
      }

      input.onkeyup = function (e){

        var currentVal = input.value.trim();

        if (currentVal !== ""){

          // get the options

          if (lastVal !== currentVal && !requestInProgress){
            requestInProgress = true;
            lastVal = currentVal;
            getResults(lastVal);
          }

        } else {

          // clear the options...

        }

      }

    
      // looking for recommendations


      // comedy proof of concept...

      //setTimeout(function (){

      //  editor.focus();
      //  editor.insert(input.value);
       // document.body.removeChild(input);

     // }, 10000)


    }


  });

  return editSessions[path];

}

function saveFile(path, body, callback){
  request.put({ uri : path, body : body}, function (err, response){
    callback(err, response);
  });
}

function loadFile(path, callback){
  request(path, function (err, response, body){
    callback(err, body);
  });
}

function loadDirectory(path, obj, element, event){

  if (event && event.which === 3){

    var clickShield = domify('<div></div>');
    clickShield.style.width = window.innerWidth + "px";
    clickShield.style.height = window.innerHeight + "px";
    clickShield.style.position = "absolute";
    clickShield.style.top = "0px";
    clickShield.style.left = "0px";

    $('body').appendChild(clickShield);

    var reset = function reset(){
      clickShield.removeEventListener('click', reset);
      $('body').removeChild(clickShield);
      $('body').removeChild(contextMenu)
    }

    clickShield.addEventListener('click', reset);

    // right...
    var contextMenu = domify('<ul class="context-menu">' +
      '<li><a href="#" rel="rels/rename-folder">Rename</a></li>' +
      '<li><a href="#" rel="rels/delete-file">Delete</a></li>' +
      '</ul>')

    $('body').appendChild(contextMenu);

    contextMenu.style.top = event.clientY + "px";
    contextMenu.style.left = event.clientX + "px";

    var del = new Delegate(contextMenu);
    del.on('click', 'a', function (e){
      e.preventDefault();

      reset();

      var rel = e.target.getAttribute('rel');

      switch (rel){
        case "rels/rename-folder" :
          element.style.display = "none";
          var input = document.createElement('input')
          element.parentNode.appendChild(input);
          input.value = obj.name;
          input.focus();
          input.onkeydown = function (e){
            if (e.which === 13 && input.value !== ""){
              renameFolder (path, obj.name, input.value);
              element.style.display = "";
              element.parentNode.removeChild(input);
              input.onkeydown = null;
              input.onclick = false;
              input = null;

            }
          }
          break;

      }

    });

  } else if (!event || (event.which === 1 && event.target.tagName !== "INPUT")) {

    activeDirectory = path;

    request(path, function (err, response, body){

      if (!err){

        if (response.getResponseHeader('Content-TYpe') === "application/json"){
          body = JSON.parse(body);
        }

        directoryCache[activeDirectory] = body;

        var reference = getDirectoryReference(path);
        updateFileSystem(path, body);
        renderCurrentDirectory(reference);

      } else {
        alert(err);
      }

    });

  }
}

function getDirectoryReference(path){
    // pop off the first and last

  path = path.replace(vfsRoot, '');

  var pathChunks = path.split('/');
  var pointer = fileSystem;

  pathChunks.shift(); 
  pathChunks.pop();
  pathChunks.unshift('root');

  pathChunks.forEach(function (chunk){
    if (pointer.children[chunk]){
      pointer.children[chunk].parent = pointer;
      pointer = pointer.children[chunk];
    } else {
      throw new Error('omg');
    }
  });

  return pointer;

}

function updateFileSystem(path, entities){

  var pointer = getDirectoryReference(path);

  pointer.entities.splice(0, pointer.entities.length);

  entities.forEach(function (entity){
    if (entity.mime === "inode/directory"){
      if (!pointer.children[entity.name]){
        pointer.children[entity.name] = {
          name : entity.name,
          href : entity.href,
          entities : [],
          children : {}
        }
      }
    } else {
      // add it as an entity...
      pointer.entities.push(entity);

    }
    
  });

  for (var child in pointer.children){
    if (pointer.children.hasOwnProperty(child)){
      var exists = false;
      entities.forEach(function (entity){
        if (entity.name === child){
          exists = true;
        }
      });
      if (!exists){
        delete pointer.children[child];
      }
    }
  }
}



loadDirectory(fileSystem.children.root.href);
*/
},{"./components/console.js":1,"./components/editor.js":2,"./components/entity-selector.js":3,"./components/info.js":4,"./components/layout.js":5,"./components/previewer.js":7,"./components/sessions.js":8,"./components/top-menu.js":9,"./lib/file-system":11,"browser-request":13,"dom-delegate":15,"domify":16,"events":35,"marked":36}],11:[function(require,module,exports){
var request = require('browser-request');
var Gather = require('gm-gather');
var SocksJS = require('./socks.js');
var console = require('../components/console.js');

module.exports.initialiseFileSystem = function initialiseFileSystem (vfsRoot, sockRoot){

  var system = new (require('events')).EventEmitter;

  // our internal data structure...
  var data = {
    entities : [],
    children : {
      root : {
        entities : [],
        name : "Project root",
        relPath : "/",
        href : vfsRoot + "/",
        children : {},
        parent : false
      }
    }
  };

  var entityLookup = {};

  var socket = new SocksJS(sockRoot);

  socket.onopen = function (){
    console.log('Remote file server is online.');
  }
  socket.onmessage = function (e){

    var msg = JSON.parse(e.data);

    for (var i in msg){

      if (i === 'update'){
        system.emit('entity-updated', 'update', msg.update.path);
      }

    }

  }

  system.readFile = function readFile (path, fn){

    var entity = entityLookup[path]

    request(entity.href, function (err, response){

      if (!err){
        fn (false, entity, response.body);
      } else {
        fn (err, entity);
      }

    });

  };

  system.writeFile = function writeFile(path, body, fn){

    var entity = entityLookup[path];

    request.put({ uri : entity.href, body : body}, function (err, response){
      if (!err){
        fn (false, entity);
        system.emit('entity-updated', 'update', path);
      } else {
        fn (err);
      }
    });
  };

  system.renameFile = function renameFile (newPath, oldPath, fn){

  };

  system.deleteFile = function deleteFile (path, fn){

  };

  system.readFolder = function readFolder (path, fn){

  };

  system.writeFolder = function writeFolder (path, fn){

  };

  system.renameFolder = function renameFolder (path, fn){

  };

  system.deleteFolder = function deleteFolder (path, fn){

  };

  system.getAll = function getAll(fn){

    function getContents (node, contents){

      for (var folder in node.children){
        if (node.children.hasOwnProperty(folder)){
          var folderObject = {
            type : 'folder',
            name : node.children[folder].name,
            path : node.children[folder].relPath,
            contents : []
          } 
          contents.push(folderObject);
          getContents(node.children[folder], folderObject.contents);
        }
      }

      for (var i = 0; i < node.entities.length; i++){

        contents.push({
          type : 'file',
          name : node.entities[i].name,
          path : node.entities[i].href.replace(vfsRoot, ''),
          mime : node.entities[i].mime
        });

      }

    }

    var tree = [];

    getContents(data, tree);

    fn(tree);

  };

  // however we're doing to load the entire file system in now.

  function loadFileSystem (path, fn){

    request(path, function (err, response, body){

      if (!err){

        if (response.getResponseHeader('Content-Type') === "application/json"){
          body = JSON.parse(body);
        }

        //directoryCache[activeDirectory] = body;

        updateFileSystem(path, body);
  
        var pointer = getDirectoryReference(path);

        var gatherer = new Gather();

        var childCount = 0;

        for (var child in pointer.children){
          if (pointer.children.hasOwnProperty(child)){
            childCount ++;
            gatherer.task((function (href){

              return function (done, error){

                loadFileSystem(href, function (err){

                  if (!err){

                    done();

                  } else {

                    error(err);

                  }

                });

              };

            })(pointer.children[child].href));

          }
        }

        if (childCount > 0){
          gatherer.run(function (err){
            if (err){
              fn(err);
            } else {
              fn(false);
            }

          });
        } else {
          fn (false);
        }

        //renderCurrentDirectory(reference);

      } else {
        fn (err);
      }

    });
  };

  loadFileSystem(data.children.root.href, function (err){

    if (!err){

      console.log('Remote file system synchronised');

      system.emit('sync', data.children.root.relPath);

    } else {

      system.emit('sync-error', 'Unable to synchronise with remote file system', err);

    }

  });

  function getDirectoryReference (path){
      // pop off the first and last

    path = path.replace(vfsRoot, '');

    var pathChunks = path.split('/');
    var pointer = data;

    pathChunks.shift(); 
    pathChunks.pop();
    pathChunks.unshift('root');

    pathChunks.forEach(function (chunk){
      if (pointer.children[chunk]){
        pointer.children[chunk].parent = pointer;
        pointer = pointer.children[chunk];
      } else {
        throw new Error('omg');
      }
    });

    return pointer;

  }

  function updateFileSystem(path, entities){

    // Okay the objective here is to get all the changes...

    var pointer = getDirectoryReference(path);

    var currentEntities = pointer.entities.splice(0, pointer.entities.length);

    currentEntities.forEach(function (entity){

      delete entityLookup[entity.relPath];

    });

    entities.forEach(function (entity){
      if (entity.mime === "inode/directory"){
        if (!pointer.children[entity.name] && entity.name.substr(0, 1) !== "."){
          pointer.children[entity.name] = {
            name : entity.name,
            href : entity.href,
            relPath : entity.href.replace(vfsRoot, ''),
            entities : [],
            children : {}
          }
          // create a lookup by path...
          entityLookup[pointer.children[entity.name].relPath] = pointer.children[entity.name];
        }
      } else if (entity.name.substr(0,1) !== ".") {

        // create a relpath..
        entity.relPath = entity.href.replace(vfsRoot, '');

        // create a lookup by relpath.. 
        entityLookup[entity.relPath] = entity;

        // add it as an entity
        pointer.entities.push(entity);

      }
      
    });


    // check for any folders that have been removed..
    for (var child in pointer.children){
      if (pointer.children.hasOwnProperty(child)){
        var exists = false;
        entities.forEach(function (entity){
          if (entity.name === child){
            exists = true;
          }
        });
        if (!exists){
          delete pointer.children[child];
        }
      }
    }
  }

  return system;

}



/*

  - Status one: Nothing is loaded.
  - Status two: 

*/
},{"../components/console.js":1,"./socks.js":12,"browser-request":13,"events":35,"gm-gather":19}],12:[function(require,module,exports){
/* SockJS client, version 0.3.4, http://sockjs.org, MIT License

Copyright (c) 2011-2012 VMware, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

//     [*] Including lib/index.js
// Public object
SockJS = (function(){
              var _document = document;
              var _window = window;
              var utils = {};


//         [*] Including lib/reventtarget.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

/* Simplified implementation of DOM2 EventTarget.
 *   http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget
 */
var REventTarget = function() {};
REventTarget.prototype.addEventListener = function (eventType, listener) {
    if(!this._listeners) {
         this._listeners = {};
    }
    if(!(eventType in this._listeners)) {
        this._listeners[eventType] = [];
    }
    var arr = this._listeners[eventType];
    if(utils.arrIndexOf(arr, listener) === -1) {
        arr.push(listener);
    }
    return;
};

REventTarget.prototype.removeEventListener = function (eventType, listener) {
    if(!(this._listeners && (eventType in this._listeners))) {
        return;
    }
    var arr = this._listeners[eventType];
    var idx = utils.arrIndexOf(arr, listener);
    if (idx !== -1) {
        if(arr.length > 1) {
            this._listeners[eventType] = arr.slice(0, idx).concat( arr.slice(idx+1) );
        } else {
            delete this._listeners[eventType];
        }
        return;
    }
    return;
};

REventTarget.prototype.dispatchEvent = function (event) {
    var t = event.type;
    var args = Array.prototype.slice.call(arguments, 0);
    if (this['on'+t]) {
        this['on'+t].apply(this, args);
    }
    if (this._listeners && t in this._listeners) {
        for(var i=0; i < this._listeners[t].length; i++) {
            this._listeners[t][i].apply(this, args);
        }
    }
};
//         [*] End of lib/reventtarget.js


//         [*] Including lib/simpleevent.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var SimpleEvent = function(type, obj) {
    this.type = type;
    if (typeof obj !== 'undefined') {
        for(var k in obj) {
            if (!obj.hasOwnProperty(k)) continue;
            this[k] = obj[k];
        }
    }
};

SimpleEvent.prototype.toString = function() {
    var r = [];
    for(var k in this) {
        if (!this.hasOwnProperty(k)) continue;
        var v = this[k];
        if (typeof v === 'function') v = '[function]';
        r.push(k + '=' + v);
    }
    return 'SimpleEvent(' + r.join(', ') + ')';
};
//         [*] End of lib/simpleevent.js


//         [*] Including lib/eventemitter.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var EventEmitter = function(events) {
    var that = this;
    that._events = events || [];
    that._listeners = {};
};
EventEmitter.prototype.emit = function(type) {
    var that = this;
    that._verifyType(type);
    if (that._nuked) return;

    var args = Array.prototype.slice.call(arguments, 1);
    if (that['on'+type]) {
        that['on'+type].apply(that, args);
    }
    if (type in that._listeners) {
        for(var i = 0; i < that._listeners[type].length; i++) {
            that._listeners[type][i].apply(that, args);
        }
    }
};

EventEmitter.prototype.on = function(type, callback) {
    var that = this;
    that._verifyType(type);
    if (that._nuked) return;

    if (!(type in that._listeners)) {
        that._listeners[type] = [];
    }
    that._listeners[type].push(callback);
};

EventEmitter.prototype._verifyType = function(type) {
    var that = this;
    if (utils.arrIndexOf(that._events, type) === -1) {
        utils.log('Event ' + JSON.stringify(type) +
                  ' not listed ' + JSON.stringify(that._events) +
                  ' in ' + that);
    }
};

EventEmitter.prototype.nuke = function() {
    var that = this;
    that._nuked = true;
    for(var i=0; i<that._events.length; i++) {
        delete that[that._events[i]];
    }
    that._listeners = {};
};
//         [*] End of lib/eventemitter.js


//         [*] Including lib/utils.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var random_string_chars = 'abcdefghijklmnopqrstuvwxyz0123456789_';
utils.random_string = function(length, max) {
    max = max || random_string_chars.length;
    var i, ret = [];
    for(i=0; i < length; i++) {
        ret.push( random_string_chars.substr(Math.floor(Math.random() * max),1) );
    }
    return ret.join('');
};
utils.random_number = function(max) {
    return Math.floor(Math.random() * max);
};
utils.random_number_string = function(max) {
    var t = (''+(max - 1)).length;
    var p = Array(t+1).join('0');
    return (p + utils.random_number(max)).slice(-t);
};

// Assuming that url looks like: http://asdasd:111/asd
utils.getOrigin = function(url) {
    url += '/';
    var parts = url.split('/').slice(0, 3);
    return parts.join('/');
};

utils.isSameOriginUrl = function(url_a, url_b) {
    // location.origin would do, but it's not always available.
    if (!url_b) url_b = _window.location.href;

    return (url_a.split('/').slice(0,3).join('/')
                ===
            url_b.split('/').slice(0,3).join('/'));
};

utils.getParentDomain = function(url) {
    // ipv4 ip address
    if (/^[0-9.]*$/.test(url)) return url;
    // ipv6 ip address
    if (/^\[/.test(url)) return url;
    // no dots
    if (!(/[.]/.test(url))) return url;

    var parts = url.split('.').slice(1);
    return parts.join('.');
};

utils.objectExtend = function(dst, src) {
    for(var k in src) {
        if (src.hasOwnProperty(k)) {
            dst[k] = src[k];
        }
    }
    return dst;
};

var WPrefix = '_jp';

utils.polluteGlobalNamespace = function() {
    if (!(WPrefix in _window)) {
        _window[WPrefix] = {};
    }
};

utils.closeFrame = function (code, reason) {
    return 'c'+JSON.stringify([code, reason]);
};

utils.userSetCode = function (code) {
    return code === 1000 || (code >= 3000 && code <= 4999);
};

// See: http://www.erg.abdn.ac.uk/~gerrit/dccp/notes/ccid2/rto_estimator/
// and RFC 2988.
utils.countRTO = function (rtt) {
    var rto;
    if (rtt > 100) {
        rto = 3 * rtt; // rto > 300msec
    } else {
        rto = rtt + 200; // 200msec < rto <= 300msec
    }
    return rto;
}

utils.log = function() {
    if (_window.console && console.log && console.log.apply) {
        console.log.apply(console, arguments);
    }
};

utils.bind = function(fun, that) {
    if (fun.bind) {
        return fun.bind(that);
    } else {
        return function() {
            return fun.apply(that, arguments);
        };
    }
};

utils.flatUrl = function(url) {
    return url.indexOf('?') === -1 && url.indexOf('#') === -1;
};

utils.amendUrl = function(url) {
    var dl = _document.location;
    if (!url) {
        throw new Error('Wrong url for SockJS');
    }
    if (!utils.flatUrl(url)) {
        throw new Error('Only basic urls are supported in SockJS');
    }

    //  '//abc' --> 'http://abc'
    if (url.indexOf('//') === 0) {
        url = dl.protocol + url;
    }
    // '/abc' --> 'http://localhost:80/abc'
    if (url.indexOf('/') === 0) {
        url = dl.protocol + '//' + dl.host + url;
    }
    // strip trailing slashes
    url = url.replace(/[/]+$/,'');
    return url;
};

// IE doesn't support [].indexOf.
utils.arrIndexOf = function(arr, obj){
    for(var i=0; i < arr.length; i++){
        if(arr[i] === obj){
            return i;
        }
    }
    return -1;
};

utils.arrSkip = function(arr, obj) {
    var idx = utils.arrIndexOf(arr, obj);
    if (idx === -1) {
        return arr.slice();
    } else {
        var dst = arr.slice(0, idx);
        return dst.concat(arr.slice(idx+1));
    }
};

// Via: https://gist.github.com/1133122/2121c601c5549155483f50be3da5305e83b8c5df
utils.isArray = Array.isArray || function(value) {
    return {}.toString.call(value).indexOf('Array') >= 0
};

utils.delay = function(t, fun) {
    if(typeof t === 'function') {
        fun = t;
        t = 0;
    }
    return setTimeout(fun, t);
};


// Chars worth escaping, as defined by Douglas Crockford:
//   https://github.com/douglascrockford/JSON-js/blob/47a9882cddeb1e8529e07af9736218075372b8ac/json2.js#L196
var json_escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    json_lookup = {
"\u0000":"\\u0000","\u0001":"\\u0001","\u0002":"\\u0002","\u0003":"\\u0003",
"\u0004":"\\u0004","\u0005":"\\u0005","\u0006":"\\u0006","\u0007":"\\u0007",
"\b":"\\b","\t":"\\t","\n":"\\n","\u000b":"\\u000b","\f":"\\f","\r":"\\r",
"\u000e":"\\u000e","\u000f":"\\u000f","\u0010":"\\u0010","\u0011":"\\u0011",
"\u0012":"\\u0012","\u0013":"\\u0013","\u0014":"\\u0014","\u0015":"\\u0015",
"\u0016":"\\u0016","\u0017":"\\u0017","\u0018":"\\u0018","\u0019":"\\u0019",
"\u001a":"\\u001a","\u001b":"\\u001b","\u001c":"\\u001c","\u001d":"\\u001d",
"\u001e":"\\u001e","\u001f":"\\u001f","\"":"\\\"","\\":"\\\\",
"\u007f":"\\u007f","\u0080":"\\u0080","\u0081":"\\u0081","\u0082":"\\u0082",
"\u0083":"\\u0083","\u0084":"\\u0084","\u0085":"\\u0085","\u0086":"\\u0086",
"\u0087":"\\u0087","\u0088":"\\u0088","\u0089":"\\u0089","\u008a":"\\u008a",
"\u008b":"\\u008b","\u008c":"\\u008c","\u008d":"\\u008d","\u008e":"\\u008e",
"\u008f":"\\u008f","\u0090":"\\u0090","\u0091":"\\u0091","\u0092":"\\u0092",
"\u0093":"\\u0093","\u0094":"\\u0094","\u0095":"\\u0095","\u0096":"\\u0096",
"\u0097":"\\u0097","\u0098":"\\u0098","\u0099":"\\u0099","\u009a":"\\u009a",
"\u009b":"\\u009b","\u009c":"\\u009c","\u009d":"\\u009d","\u009e":"\\u009e",
"\u009f":"\\u009f","\u00ad":"\\u00ad","\u0600":"\\u0600","\u0601":"\\u0601",
"\u0602":"\\u0602","\u0603":"\\u0603","\u0604":"\\u0604","\u070f":"\\u070f",
"\u17b4":"\\u17b4","\u17b5":"\\u17b5","\u200c":"\\u200c","\u200d":"\\u200d",
"\u200e":"\\u200e","\u200f":"\\u200f","\u2028":"\\u2028","\u2029":"\\u2029",
"\u202a":"\\u202a","\u202b":"\\u202b","\u202c":"\\u202c","\u202d":"\\u202d",
"\u202e":"\\u202e","\u202f":"\\u202f","\u2060":"\\u2060","\u2061":"\\u2061",
"\u2062":"\\u2062","\u2063":"\\u2063","\u2064":"\\u2064","\u2065":"\\u2065",
"\u2066":"\\u2066","\u2067":"\\u2067","\u2068":"\\u2068","\u2069":"\\u2069",
"\u206a":"\\u206a","\u206b":"\\u206b","\u206c":"\\u206c","\u206d":"\\u206d",
"\u206e":"\\u206e","\u206f":"\\u206f","\ufeff":"\\ufeff","\ufff0":"\\ufff0",
"\ufff1":"\\ufff1","\ufff2":"\\ufff2","\ufff3":"\\ufff3","\ufff4":"\\ufff4",
"\ufff5":"\\ufff5","\ufff6":"\\ufff6","\ufff7":"\\ufff7","\ufff8":"\\ufff8",
"\ufff9":"\\ufff9","\ufffa":"\\ufffa","\ufffb":"\\ufffb","\ufffc":"\\ufffc",
"\ufffd":"\\ufffd","\ufffe":"\\ufffe","\uffff":"\\uffff"};

// Some extra characters that Chrome gets wrong, and substitutes with
// something else on the wire.
var extra_escapable = /[\x00-\x1f\ud800-\udfff\ufffe\uffff\u0300-\u0333\u033d-\u0346\u034a-\u034c\u0350-\u0352\u0357-\u0358\u035c-\u0362\u0374\u037e\u0387\u0591-\u05af\u05c4\u0610-\u0617\u0653-\u0654\u0657-\u065b\u065d-\u065e\u06df-\u06e2\u06eb-\u06ec\u0730\u0732-\u0733\u0735-\u0736\u073a\u073d\u073f-\u0741\u0743\u0745\u0747\u07eb-\u07f1\u0951\u0958-\u095f\u09dc-\u09dd\u09df\u0a33\u0a36\u0a59-\u0a5b\u0a5e\u0b5c-\u0b5d\u0e38-\u0e39\u0f43\u0f4d\u0f52\u0f57\u0f5c\u0f69\u0f72-\u0f76\u0f78\u0f80-\u0f83\u0f93\u0f9d\u0fa2\u0fa7\u0fac\u0fb9\u1939-\u193a\u1a17\u1b6b\u1cda-\u1cdb\u1dc0-\u1dcf\u1dfc\u1dfe\u1f71\u1f73\u1f75\u1f77\u1f79\u1f7b\u1f7d\u1fbb\u1fbe\u1fc9\u1fcb\u1fd3\u1fdb\u1fe3\u1feb\u1fee-\u1fef\u1ff9\u1ffb\u1ffd\u2000-\u2001\u20d0-\u20d1\u20d4-\u20d7\u20e7-\u20e9\u2126\u212a-\u212b\u2329-\u232a\u2adc\u302b-\u302c\uaab2-\uaab3\uf900-\ufa0d\ufa10\ufa12\ufa15-\ufa1e\ufa20\ufa22\ufa25-\ufa26\ufa2a-\ufa2d\ufa30-\ufa6d\ufa70-\ufad9\ufb1d\ufb1f\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4e\ufff0-\uffff]/g,
    extra_lookup;

// JSON Quote string. Use native implementation when possible.
var JSONQuote = (JSON && JSON.stringify) || function(string) {
    json_escapable.lastIndex = 0;
    if (json_escapable.test(string)) {
        string = string.replace(json_escapable, function(a) {
            return json_lookup[a];
        });
    }
    return '"' + string + '"';
};

// This may be quite slow, so let's delay until user actually uses bad
// characters.
var unroll_lookup = function(escapable) {
    var i;
    var unrolled = {}
    var c = []
    for(i=0; i<65536; i++) {
        c.push( String.fromCharCode(i) );
    }
    escapable.lastIndex = 0;
    c.join('').replace(escapable, function (a) {
        unrolled[ a ] = '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        return '';
    });
    escapable.lastIndex = 0;
    return unrolled;
};

// Quote string, also taking care of unicode characters that browsers
// often break. Especially, take care of unicode surrogates:
//    http://en.wikipedia.org/wiki/Mapping_of_Unicode_characters#Surrogates
utils.quote = function(string) {
    var quoted = JSONQuote(string);

    // In most cases this should be very fast and good enough.
    extra_escapable.lastIndex = 0;
    if(!extra_escapable.test(quoted)) {
        return quoted;
    }

    if(!extra_lookup) extra_lookup = unroll_lookup(extra_escapable);

    return quoted.replace(extra_escapable, function(a) {
        return extra_lookup[a];
    });
}

var _all_protocols = ['websocket',
                      'xdr-streaming',
                      'xhr-streaming',
                      'iframe-eventsource',
                      'iframe-htmlfile',
                      'xdr-polling',
                      'xhr-polling',
                      'iframe-xhr-polling',
                      'jsonp-polling'];

utils.probeProtocols = function() {
    var probed = {};
    for(var i=0; i<_all_protocols.length; i++) {
        var protocol = _all_protocols[i];
        // User can have a typo in protocol name.
        probed[protocol] = SockJS[protocol] &&
                           SockJS[protocol].enabled();
    }
    return probed;
};

utils.detectProtocols = function(probed, protocols_whitelist, info) {
    var pe = {},
        protocols = [];
    if (!protocols_whitelist) protocols_whitelist = _all_protocols;
    for(var i=0; i<protocols_whitelist.length; i++) {
        var protocol = protocols_whitelist[i];
        pe[protocol] = probed[protocol];
    }
    var maybe_push = function(protos) {
        var proto = protos.shift();
        if (pe[proto]) {
            protocols.push(proto);
        } else {
            if (protos.length > 0) {
                maybe_push(protos);
            }
        }
    }

    // 1. Websocket
    if (info.websocket !== false) {
        maybe_push(['websocket']);
    }

    // 2. Streaming
    if (pe['xhr-streaming'] && !info.null_origin) {
        protocols.push('xhr-streaming');
    } else {
        if (pe['xdr-streaming'] && !info.cookie_needed && !info.null_origin) {
            protocols.push('xdr-streaming');
        } else {
            maybe_push(['iframe-eventsource',
                        'iframe-htmlfile']);
        }
    }

    // 3. Polling
    if (pe['xhr-polling'] && !info.null_origin) {
        protocols.push('xhr-polling');
    } else {
        if (pe['xdr-polling'] && !info.cookie_needed && !info.null_origin) {
            protocols.push('xdr-polling');
        } else {
            maybe_push(['iframe-xhr-polling',
                        'jsonp-polling']);
        }
    }
    return protocols;
}
//         [*] End of lib/utils.js


//         [*] Including lib/dom.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

// May be used by htmlfile jsonp and transports.
var MPrefix = '_sockjs_global';
utils.createHook = function() {
    var window_id = 'a' + utils.random_string(8);
    if (!(MPrefix in _window)) {
        var map = {};
        _window[MPrefix] = function(window_id) {
            if (!(window_id in map)) {
                map[window_id] = {
                    id: window_id,
                    del: function() {delete map[window_id];}
                };
            }
            return map[window_id];
        }
    }
    return _window[MPrefix](window_id);
};



utils.attachMessage = function(listener) {
    utils.attachEvent('message', listener);
};
utils.attachEvent = function(event, listener) {
    if (typeof _window.addEventListener !== 'undefined') {
        _window.addEventListener(event, listener, false);
    } else {
        // IE quirks.
        // According to: http://stevesouders.com/misc/test-postmessage.php
        // the message gets delivered only to 'document', not 'window'.
        _document.attachEvent("on" + event, listener);
        // I get 'window' for ie8.
        _window.attachEvent("on" + event, listener);
    }
};

utils.detachMessage = function(listener) {
    utils.detachEvent('message', listener);
};
utils.detachEvent = function(event, listener) {
    if (typeof _window.addEventListener !== 'undefined') {
        _window.removeEventListener(event, listener, false);
    } else {
        _document.detachEvent("on" + event, listener);
        _window.detachEvent("on" + event, listener);
    }
};


var on_unload = {};
// Things registered after beforeunload are to be called immediately.
var after_unload = false;

var trigger_unload_callbacks = function() {
    for(var ref in on_unload) {
        on_unload[ref]();
        delete on_unload[ref];
    };
};

var unload_triggered = function() {
    if(after_unload) return;
    after_unload = true;
    trigger_unload_callbacks();
};

// 'unload' alone is not reliable in opera within an iframe, but we
// can't use `beforeunload` as IE fires it on javascript: links.
utils.attachEvent('unload', unload_triggered);

utils.unload_add = function(listener) {
    var ref = utils.random_string(8);
    on_unload[ref] = listener;
    if (after_unload) {
        utils.delay(trigger_unload_callbacks);
    }
    return ref;
};
utils.unload_del = function(ref) {
    if (ref in on_unload)
        delete on_unload[ref];
};


utils.createIframe = function (iframe_url, error_callback) {
    var iframe = _document.createElement('iframe');
    var tref, unload_ref;
    var unattach = function() {
        clearTimeout(tref);
        // Explorer had problems with that.
        try {iframe.onload = null;} catch (x) {}
        iframe.onerror = null;
    };
    var cleanup = function() {
        if (iframe) {
            unattach();
            // This timeout makes chrome fire onbeforeunload event
            // within iframe. Without the timeout it goes straight to
            // onunload.
            setTimeout(function() {
                if(iframe) {
                    iframe.parentNode.removeChild(iframe);
                }
                iframe = null;
            }, 0);
            utils.unload_del(unload_ref);
        }
    };
    var onerror = function(r) {
        if (iframe) {
            cleanup();
            error_callback(r);
        }
    };
    var post = function(msg, origin) {
        try {
            // When the iframe is not loaded, IE raises an exception
            // on 'contentWindow'.
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(msg, origin);
            }
        } catch (x) {};
    };

    iframe.src = iframe_url;
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.onerror = function(){onerror('onerror');};
    iframe.onload = function() {
        // `onload` is triggered before scripts on the iframe are
        // executed. Give it few seconds to actually load stuff.
        clearTimeout(tref);
        tref = setTimeout(function(){onerror('onload timeout');}, 2000);
    };
    _document.body.appendChild(iframe);
    tref = setTimeout(function(){onerror('timeout');}, 15000);
    unload_ref = utils.unload_add(cleanup);
    return {
        post: post,
        cleanup: cleanup,
        loaded: unattach
    };
};

utils.createHtmlfile = function (iframe_url, error_callback) {
    var doc = new ActiveXObject('htmlfile');
    var tref, unload_ref;
    var iframe;
    var unattach = function() {
        clearTimeout(tref);
    };
    var cleanup = function() {
        if (doc) {
            unattach();
            utils.unload_del(unload_ref);
            iframe.parentNode.removeChild(iframe);
            iframe = doc = null;
            CollectGarbage();
        }
    };
    var onerror = function(r)  {
        if (doc) {
            cleanup();
            error_callback(r);
        }
    };
    var post = function(msg, origin) {
        try {
            // When the iframe is not loaded, IE raises an exception
            // on 'contentWindow'.
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(msg, origin);
            }
        } catch (x) {};
    };

    doc.open();
    doc.write('<html><s' + 'cript>' +
              'document.domain="' + document.domain + '";' +
              '</s' + 'cript></html>');
    doc.close();
    doc.parentWindow[WPrefix] = _window[WPrefix];
    var c = doc.createElement('div');
    doc.body.appendChild(c);
    iframe = doc.createElement('iframe');
    c.appendChild(iframe);
    iframe.src = iframe_url;
    tref = setTimeout(function(){onerror('timeout');}, 15000);
    unload_ref = utils.unload_add(cleanup);
    return {
        post: post,
        cleanup: cleanup,
        loaded: unattach
    };
};
//         [*] End of lib/dom.js


//         [*] Including lib/dom2.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var AbstractXHRObject = function(){};
AbstractXHRObject.prototype = new EventEmitter(['chunk', 'finish']);

AbstractXHRObject.prototype._start = function(method, url, payload, opts) {
    var that = this;

    try {
        that.xhr = new XMLHttpRequest();
    } catch(x) {};

    if (!that.xhr) {
        try {
            that.xhr = new _window.ActiveXObject('Microsoft.XMLHTTP');
        } catch(x) {};
    }
    if (_window.ActiveXObject || _window.XDomainRequest) {
        // IE8 caches even POSTs
        url += ((url.indexOf('?') === -1) ? '?' : '&') + 't='+(+new Date);
    }

    // Explorer tends to keep connection open, even after the
    // tab gets closed: http://bugs.jquery.com/ticket/5280
    that.unload_ref = utils.unload_add(function(){that._cleanup(true);});
    try {
        that.xhr.open(method, url, true);
    } catch(e) {
        // IE raises an exception on wrong port.
        that.emit('finish', 0, '');
        that._cleanup();
        return;
    };

    if (!opts || !opts.no_credentials) {
        // Mozilla docs says https://developer.mozilla.org/en/XMLHttpRequest :
        // "This never affects same-site requests."
        that.xhr.withCredentials = 'true';
    }
    if (opts && opts.headers) {
        for(var key in opts.headers) {
            that.xhr.setRequestHeader(key, opts.headers[key]);
        }
    }

    that.xhr.onreadystatechange = function() {
        if (that.xhr) {
            var x = that.xhr;
            switch (x.readyState) {
            case 3:
                // IE doesn't like peeking into responseText or status
                // on Microsoft.XMLHTTP and readystate=3
                try {
                    var status = x.status;
                    var text = x.responseText;
                } catch (x) {};
                // IE returns 1223 for 204: http://bugs.jquery.com/ticket/1450
                if (status === 1223) status = 204;

                // IE does return readystate == 3 for 404 answers.
                if (text && text.length > 0) {
                    that.emit('chunk', status, text);
                }
                break;
            case 4:
                var status = x.status;
                // IE returns 1223 for 204: http://bugs.jquery.com/ticket/1450
                if (status === 1223) status = 204;

                that.emit('finish', status, x.responseText);
                that._cleanup(false);
                break;
            }
        }
    };
    that.xhr.send(payload);
};

AbstractXHRObject.prototype._cleanup = function(abort) {
    var that = this;
    if (!that.xhr) return;
    utils.unload_del(that.unload_ref);

    // IE needs this field to be a function
    that.xhr.onreadystatechange = function(){};

    if (abort) {
        try {
            that.xhr.abort();
        } catch(x) {};
    }
    that.unload_ref = that.xhr = null;
};

AbstractXHRObject.prototype.close = function() {
    var that = this;
    that.nuke();
    that._cleanup(true);
};

var XHRCorsObject = utils.XHRCorsObject = function() {
    var that = this, args = arguments;
    utils.delay(function(){that._start.apply(that, args);});
};
XHRCorsObject.prototype = new AbstractXHRObject();

var XHRLocalObject = utils.XHRLocalObject = function(method, url, payload) {
    var that = this;
    utils.delay(function(){
        that._start(method, url, payload, {
            no_credentials: true
        });
    });
};
XHRLocalObject.prototype = new AbstractXHRObject();



// References:
//   http://ajaxian.com/archives/100-line-ajax-wrapper
//   http://msdn.microsoft.com/en-us/library/cc288060(v=VS.85).aspx
var XDRObject = utils.XDRObject = function(method, url, payload) {
    var that = this;
    utils.delay(function(){that._start(method, url, payload);});
};
XDRObject.prototype = new EventEmitter(['chunk', 'finish']);
XDRObject.prototype._start = function(method, url, payload) {
    var that = this;
    var xdr = new XDomainRequest();
    // IE caches even POSTs
    url += ((url.indexOf('?') === -1) ? '?' : '&') + 't='+(+new Date);

    var onerror = xdr.ontimeout = xdr.onerror = function() {
        that.emit('finish', 0, '');
        that._cleanup(false);
    };
    xdr.onprogress = function() {
        that.emit('chunk', 200, xdr.responseText);
    };
    xdr.onload = function() {
        that.emit('finish', 200, xdr.responseText);
        that._cleanup(false);
    };
    that.xdr = xdr;
    that.unload_ref = utils.unload_add(function(){that._cleanup(true);});
    try {
        // Fails with AccessDenied if port number is bogus
        that.xdr.open(method, url);
        that.xdr.send(payload);
    } catch(x) {
        onerror();
    }
};

XDRObject.prototype._cleanup = function(abort) {
    var that = this;
    if (!that.xdr) return;
    utils.unload_del(that.unload_ref);

    that.xdr.ontimeout = that.xdr.onerror = that.xdr.onprogress =
        that.xdr.onload = null;
    if (abort) {
        try {
            that.xdr.abort();
        } catch(x) {};
    }
    that.unload_ref = that.xdr = null;
};

XDRObject.prototype.close = function() {
    var that = this;
    that.nuke();
    that._cleanup(true);
};

// 1. Is natively via XHR
// 2. Is natively via XDR
// 3. Nope, but postMessage is there so it should work via the Iframe.
// 4. Nope, sorry.
utils.isXHRCorsCapable = function() {
    if (_window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()) {
        return 1;
    }
    // XDomainRequest doesn't work if page is served from file://
    if (_window.XDomainRequest && _document.domain) {
        return 2;
    }
    if (IframeTransport.enabled()) {
        return 3;
    }
    return 4;
};
//         [*] End of lib/dom2.js


//         [*] Including lib/sockjs.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var SockJS = function(url, dep_protocols_whitelist, options) {
    if (this === _window) {
        // makes `new` optional
        return new SockJS(url, dep_protocols_whitelist, options);
    }
    
    var that = this, protocols_whitelist;
    that._options = {devel: false, debug: false, protocols_whitelist: [],
                     info: undefined, rtt: undefined};
    if (options) {
        utils.objectExtend(that._options, options);
    }
    that._base_url = utils.amendUrl(url);
    that._server = that._options.server || utils.random_number_string(1000);
    if (that._options.protocols_whitelist &&
        that._options.protocols_whitelist.length) {
        protocols_whitelist = that._options.protocols_whitelist;
    } else {
        // Deprecated API
        if (typeof dep_protocols_whitelist === 'string' &&
            dep_protocols_whitelist.length > 0) {
            protocols_whitelist = [dep_protocols_whitelist];
        } else if (utils.isArray(dep_protocols_whitelist)) {
            protocols_whitelist = dep_protocols_whitelist
        } else {
            protocols_whitelist = null;
        }
        if (protocols_whitelist) {
            that._debug('Deprecated API: Use "protocols_whitelist" option ' +
                        'instead of supplying protocol list as a second ' +
                        'parameter to SockJS constructor.');
        }
    }
    that._protocols = [];
    that.protocol = null;
    that.readyState = SockJS.CONNECTING;
    that._ir = createInfoReceiver(that._base_url);
    that._ir.onfinish = function(info, rtt) {
        that._ir = null;
        if (info) {
            if (that._options.info) {
                // Override if user supplies the option
                info = utils.objectExtend(info, that._options.info);
            }
            if (that._options.rtt) {
                rtt = that._options.rtt;
            }
            that._applyInfo(info, rtt, protocols_whitelist);
            that._didClose();
        } else {
            that._didClose(1002, 'Can\'t connect to server', true);
        }
    };
};
// Inheritance
SockJS.prototype = new REventTarget();

SockJS.version = "0.3.4";

SockJS.CONNECTING = 0;
SockJS.OPEN = 1;
SockJS.CLOSING = 2;
SockJS.CLOSED = 3;

SockJS.prototype._debug = function() {
    if (this._options.debug)
        utils.log.apply(utils, arguments);
};

SockJS.prototype._dispatchOpen = function() {
    var that = this;
    if (that.readyState === SockJS.CONNECTING) {
        if (that._transport_tref) {
            clearTimeout(that._transport_tref);
            that._transport_tref = null;
        }
        that.readyState = SockJS.OPEN;
        that.dispatchEvent(new SimpleEvent("open"));
    } else {
        // The server might have been restarted, and lost track of our
        // connection.
        that._didClose(1006, "Server lost session");
    }
};

SockJS.prototype._dispatchMessage = function(data) {
    var that = this;
    if (that.readyState !== SockJS.OPEN)
            return;
    that.dispatchEvent(new SimpleEvent("message", {data: data}));
};

SockJS.prototype._dispatchHeartbeat = function(data) {
    var that = this;
    if (that.readyState !== SockJS.OPEN)
        return;
    that.dispatchEvent(new SimpleEvent('heartbeat', {}));
};

SockJS.prototype._didClose = function(code, reason, force) {
    var that = this;
    if (that.readyState !== SockJS.CONNECTING &&
        that.readyState !== SockJS.OPEN &&
        that.readyState !== SockJS.CLOSING)
            throw new Error('INVALID_STATE_ERR');
    if (that._ir) {
        that._ir.nuke();
        that._ir = null;
    }

    if (that._transport) {
        that._transport.doCleanup();
        that._transport = null;
    }

    var close_event = new SimpleEvent("close", {
        code: code,
        reason: reason,
        wasClean: utils.userSetCode(code)});

    if (!utils.userSetCode(code) &&
        that.readyState === SockJS.CONNECTING && !force) {
        if (that._try_next_protocol(close_event)) {
            return;
        }
        close_event = new SimpleEvent("close", {code: 2000,
                                                reason: "All transports failed",
                                                wasClean: false,
                                                last_event: close_event});
    }
    that.readyState = SockJS.CLOSED;

    utils.delay(function() {
                   that.dispatchEvent(close_event);
                });
};

SockJS.prototype._didMessage = function(data) {
    var that = this;
    var type = data.slice(0, 1);
    switch(type) {
    case 'o':
        that._dispatchOpen();
        break;
    case 'a':
        var payload = JSON.parse(data.slice(1) || '[]');
        for(var i=0; i < payload.length; i++){
            that._dispatchMessage(payload[i]);
        }
        break;
    case 'm':
        var payload = JSON.parse(data.slice(1) || 'null');
        that._dispatchMessage(payload);
        break;
    case 'c':
        var payload = JSON.parse(data.slice(1) || '[]');
        that._didClose(payload[0], payload[1]);
        break;
    case 'h':
        that._dispatchHeartbeat();
        break;
    }
};

SockJS.prototype._try_next_protocol = function(close_event) {
    var that = this;
    if (that.protocol) {
        that._debug('Closed transport:', that.protocol, ''+close_event);
        that.protocol = null;
    }
    if (that._transport_tref) {
        clearTimeout(that._transport_tref);
        that._transport_tref = null;
    }

    while(1) {
        var protocol = that.protocol = that._protocols.shift();
        if (!protocol) {
            return false;
        }
        // Some protocols require access to `body`, what if were in
        // the `head`?
        if (SockJS[protocol] &&
            SockJS[protocol].need_body === true &&
            (!_document.body ||
             (typeof _document.readyState !== 'undefined'
              && _document.readyState !== 'complete'))) {
            that._protocols.unshift(protocol);
            that.protocol = 'waiting-for-load';
            utils.attachEvent('load', function(){
                that._try_next_protocol();
            });
            return true;
        }

        if (!SockJS[protocol] ||
              !SockJS[protocol].enabled(that._options)) {
            that._debug('Skipping transport:', protocol);
        } else {
            var roundTrips = SockJS[protocol].roundTrips || 1;
            var to = ((that._options.rto || 0) * roundTrips) || 5000;
            that._transport_tref = utils.delay(to, function() {
                if (that.readyState === SockJS.CONNECTING) {
                    // I can't understand how it is possible to run
                    // this timer, when the state is CLOSED, but
                    // apparently in IE everythin is possible.
                    that._didClose(2007, "Transport timeouted");
                }
            });

            var connid = utils.random_string(8);
            var trans_url = that._base_url + '/' + that._server + '/' + connid;
            that._debug('Opening transport:', protocol, ' url:'+trans_url,
                        ' RTO:'+that._options.rto);
            that._transport = new SockJS[protocol](that, trans_url,
                                                   that._base_url);
            return true;
        }
    }
};

SockJS.prototype.close = function(code, reason) {
    var that = this;
    if (code && !utils.userSetCode(code))
        throw new Error("INVALID_ACCESS_ERR");
    if(that.readyState !== SockJS.CONNECTING &&
       that.readyState !== SockJS.OPEN) {
        return false;
    }
    that.readyState = SockJS.CLOSING;
    that._didClose(code || 1000, reason || "Normal closure");
    return true;
};

SockJS.prototype.send = function(data) {
    var that = this;
    if (that.readyState === SockJS.CONNECTING)
        throw new Error('INVALID_STATE_ERR');
    if (that.readyState === SockJS.OPEN) {
        that._transport.doSend(utils.quote('' + data));
    }
    return true;
};

SockJS.prototype._applyInfo = function(info, rtt, protocols_whitelist) {
    var that = this;
    that._options.info = info;
    that._options.rtt = rtt;
    that._options.rto = utils.countRTO(rtt);
    that._options.info.null_origin = !_document.domain;
    var probed = utils.probeProtocols();
    that._protocols = utils.detectProtocols(probed, protocols_whitelist, info);
};
//         [*] End of lib/sockjs.js


//         [*] Including lib/trans-websocket.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var WebSocketTransport = SockJS.websocket = function(ri, trans_url) {
    var that = this;
    var url = trans_url + '/websocket';
    if (url.slice(0, 5) === 'https') {
        url = 'wss' + url.slice(5);
    } else {
        url = 'ws' + url.slice(4);
    }
    that.ri = ri;
    that.url = url;
    var Constructor = _window.WebSocket || _window.MozWebSocket;

    that.ws = new Constructor(that.url);
    that.ws.onmessage = function(e) {
        that.ri._didMessage(e.data);
    };
    // Firefox has an interesting bug. If a websocket connection is
    // created after onunload, it stays alive even when user
    // navigates away from the page. In such situation let's lie -
    // let's not open the ws connection at all. See:
    // https://github.com/sockjs/sockjs-client/issues/28
    // https://bugzilla.mozilla.org/show_bug.cgi?id=696085
    that.unload_ref = utils.unload_add(function(){that.ws.close()});
    that.ws.onclose = function() {
        that.ri._didMessage(utils.closeFrame(1006, "WebSocket connection broken"));
    };
};

WebSocketTransport.prototype.doSend = function(data) {
    this.ws.send('[' + data + ']');
};

WebSocketTransport.prototype.doCleanup = function() {
    var that = this;
    var ws = that.ws;
    if (ws) {
        ws.onmessage = ws.onclose = null;
        ws.close();
        utils.unload_del(that.unload_ref);
        that.unload_ref = that.ri = that.ws = null;
    }
};

WebSocketTransport.enabled = function() {
    return !!(_window.WebSocket || _window.MozWebSocket);
};

// In theory, ws should require 1 round trip. But in chrome, this is
// not very stable over SSL. Most likely a ws connection requires a
// separate SSL connection, in which case 2 round trips are an
// absolute minumum.
WebSocketTransport.roundTrips = 2;
//         [*] End of lib/trans-websocket.js


//         [*] Including lib/trans-sender.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var BufferedSender = function() {};
BufferedSender.prototype.send_constructor = function(sender) {
    var that = this;
    that.send_buffer = [];
    that.sender = sender;
};
BufferedSender.prototype.doSend = function(message) {
    var that = this;
    that.send_buffer.push(message);
    if (!that.send_stop) {
        that.send_schedule();
    }
};

// For polling transports in a situation when in the message callback,
// new message is being send. If the sending connection was started
// before receiving one, it is possible to saturate the network and
// timeout due to the lack of receiving socket. To avoid that we delay
// sending messages by some small time, in order to let receiving
// connection be started beforehand. This is only a halfmeasure and
// does not fix the big problem, but it does make the tests go more
// stable on slow networks.
BufferedSender.prototype.send_schedule_wait = function() {
    var that = this;
    var tref;
    that.send_stop = function() {
        that.send_stop = null;
        clearTimeout(tref);
    };
    tref = utils.delay(25, function() {
        that.send_stop = null;
        that.send_schedule();
    });
};

BufferedSender.prototype.send_schedule = function() {
    var that = this;
    if (that.send_buffer.length > 0) {
        var payload = '[' + that.send_buffer.join(',') + ']';
        that.send_stop = that.sender(that.trans_url, payload, function(success, abort_reason) {
            that.send_stop = null;
            if (success === false) {
                that.ri._didClose(1006, 'Sending error ' + abort_reason);
            } else {
                that.send_schedule_wait();
            }
        });
        that.send_buffer = [];
    }
};

BufferedSender.prototype.send_destructor = function() {
    var that = this;
    if (that._send_stop) {
        that._send_stop();
    }
    that._send_stop = null;
};

var jsonPGenericSender = function(url, payload, callback) {
    var that = this;

    if (!('_send_form' in that)) {
        var form = that._send_form = _document.createElement('form');
        var area = that._send_area = _document.createElement('textarea');
        area.name = 'd';
        form.style.display = 'none';
        form.style.position = 'absolute';
        form.method = 'POST';
        form.enctype = 'application/x-www-form-urlencoded';
        form.acceptCharset = "UTF-8";
        form.appendChild(area);
        _document.body.appendChild(form);
    }
    var form = that._send_form;
    var area = that._send_area;
    var id = 'a' + utils.random_string(8);
    form.target = id;
    form.action = url + '/jsonp_send?i=' + id;

    var iframe;
    try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = _document.createElement('<iframe name="'+ id +'">');
    } catch(x) {
        iframe = _document.createElement('iframe');
        iframe.name = id;
    }
    iframe.id = id;
    form.appendChild(iframe);
    iframe.style.display = 'none';

    try {
        area.value = payload;
    } catch(e) {
        utils.log('Your browser is seriously broken. Go home! ' + e.message);
    }
    form.submit();

    var completed = function(e) {
        if (!iframe.onerror) return;
        iframe.onreadystatechange = iframe.onerror = iframe.onload = null;
        // Opera mini doesn't like if we GC iframe
        // immediately, thus this timeout.
        utils.delay(500, function() {
                       iframe.parentNode.removeChild(iframe);
                       iframe = null;
                   });
        area.value = '';
        // It is not possible to detect if the iframe succeeded or
        // failed to submit our form.
        callback(true);
    };
    iframe.onerror = iframe.onload = completed;
    iframe.onreadystatechange = function(e) {
        if (iframe.readyState == 'complete') completed();
    };
    return completed;
};

var createAjaxSender = function(AjaxObject) {
    return function(url, payload, callback) {
        var xo = new AjaxObject('POST', url + '/xhr_send', payload);
        xo.onfinish = function(status, text) {
            callback(status === 200 || status === 204,
                     'http status ' + status);
        };
        return function(abort_reason) {
            callback(false, abort_reason);
        };
    };
};
//         [*] End of lib/trans-sender.js


//         [*] Including lib/trans-jsonp-receiver.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

// Parts derived from Socket.io:
//    https://github.com/LearnBoost/socket.io/blob/0.6.17/lib/socket.io/transports/jsonp-polling.js
// and jQuery-JSONP:
//    https://code.google.com/p/jquery-jsonp/source/browse/trunk/core/jquery.jsonp.js
var jsonPGenericReceiver = function(url, callback) {
    var tref;
    var script = _document.createElement('script');
    var script2;  // Opera synchronous load trick.
    var close_script = function(frame) {
        if (script2) {
            script2.parentNode.removeChild(script2);
            script2 = null;
        }
        if (script) {
            clearTimeout(tref);
            // Unfortunately, you can't really abort script loading of
            // the script.
            script.parentNode.removeChild(script);
            script.onreadystatechange = script.onerror =
                script.onload = script.onclick = null;
            script = null;
            callback(frame);
            callback = null;
        }
    };

    // IE9 fires 'error' event after orsc or before, in random order.
    var loaded_okay = false;
    var error_timer = null;

    script.id = 'a' + utils.random_string(8);
    script.src = url;
    script.type = 'text/javascript';
    script.charset = 'UTF-8';
    script.onerror = function(e) {
        if (!error_timer) {
            // Delay firing close_script.
            error_timer = setTimeout(function() {
                if (!loaded_okay) {
                    close_script(utils.closeFrame(
                        1006,
                        "JSONP script loaded abnormally (onerror)"));
                }
            }, 1000);
        }
    };
    script.onload = function(e) {
        close_script(utils.closeFrame(1006, "JSONP script loaded abnormally (onload)"));
    };

    script.onreadystatechange = function(e) {
        if (/loaded|closed/.test(script.readyState)) {
            if (script && script.htmlFor && script.onclick) {
                loaded_okay = true;
                try {
                    // In IE, actually execute the script.
                    script.onclick();
                } catch (x) {}
            }
            if (script) {
                close_script(utils.closeFrame(1006, "JSONP script loaded abnormally (onreadystatechange)"));
            }
        }
    };
    // IE: event/htmlFor/onclick trick.
    // One can't rely on proper order for onreadystatechange. In order to
    // make sure, set a 'htmlFor' and 'event' properties, so that
    // script code will be installed as 'onclick' handler for the
    // script object. Later, onreadystatechange, manually execute this
    // code. FF and Chrome doesn't work with 'event' and 'htmlFor'
    // set. For reference see:
    //   http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
    // Also, read on that about script ordering:
    //   http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
    if (typeof script.async === 'undefined' && _document.attachEvent) {
        // According to mozilla docs, in recent browsers script.async defaults
        // to 'true', so we may use it to detect a good browser:
        // https://developer.mozilla.org/en/HTML/Element/script
        if (!/opera/i.test(navigator.userAgent)) {
            // Naively assume we're in IE
            try {
                script.htmlFor = script.id;
                script.event = "onclick";
            } catch (x) {}
            script.async = true;
        } else {
            // Opera, second sync script hack
            script2 = _document.createElement('script');
            script2.text = "try{var a = document.getElementById('"+script.id+"'); if(a)a.onerror();}catch(x){};";
            script.async = script2.async = false;
        }
    }
    if (typeof script.async !== 'undefined') {
        script.async = true;
    }

    // Fallback mostly for Konqueror - stupid timer, 35 seconds shall be plenty.
    tref = setTimeout(function() {
                          close_script(utils.closeFrame(1006, "JSONP script loaded abnormally (timeout)"));
                      }, 35000);

    var head = _document.getElementsByTagName('head')[0];
    head.insertBefore(script, head.firstChild);
    if (script2) {
        head.insertBefore(script2, head.firstChild);
    }
    return close_script;
};
//         [*] End of lib/trans-jsonp-receiver.js


//         [*] Including lib/trans-jsonp-polling.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

// The simplest and most robust transport, using the well-know cross
// domain hack - JSONP. This transport is quite inefficient - one
// mssage could use up to one http request. But at least it works almost
// everywhere.
// Known limitations:
//   o you will get a spinning cursor
//   o for Konqueror a dumb timer is needed to detect errors


var JsonPTransport = SockJS['jsonp-polling'] = function(ri, trans_url) {
    utils.polluteGlobalNamespace();
    var that = this;
    that.ri = ri;
    that.trans_url = trans_url;
    that.send_constructor(jsonPGenericSender);
    that._schedule_recv();
};

// Inheritnace
JsonPTransport.prototype = new BufferedSender();

JsonPTransport.prototype._schedule_recv = function() {
    var that = this;
    var callback = function(data) {
        that._recv_stop = null;
        if (data) {
            // no data - heartbeat;
            if (!that._is_closing) {
                that.ri._didMessage(data);
            }
        }
        // The message can be a close message, and change is_closing state.
        if (!that._is_closing) {
            that._schedule_recv();
        }
    };
    that._recv_stop = jsonPReceiverWrapper(that.trans_url + '/jsonp',
                                           jsonPGenericReceiver, callback);
};

JsonPTransport.enabled = function() {
    return true;
};

JsonPTransport.need_body = true;


JsonPTransport.prototype.doCleanup = function() {
    var that = this;
    that._is_closing = true;
    if (that._recv_stop) {
        that._recv_stop();
    }
    that.ri = that._recv_stop = null;
    that.send_destructor();
};


// Abstract away code that handles global namespace pollution.
var jsonPReceiverWrapper = function(url, constructReceiver, user_callback) {
    var id = 'a' + utils.random_string(6);
    var url_id = url + '?c=' + escape(WPrefix + '.' + id);

    // Unfortunately it is not possible to abort loading of the
    // script. We need to keep track of frake close frames.
    var aborting = 0;

    // Callback will be called exactly once.
    var callback = function(frame) {
        switch(aborting) {
        case 0:
            // Normal behaviour - delete hook _and_ emit message.
            delete _window[WPrefix][id];
            user_callback(frame);
            break;
        case 1:
            // Fake close frame - emit but don't delete hook.
            user_callback(frame);
            aborting = 2;
            break;
        case 2:
            // Got frame after connection was closed, delete hook, don't emit.
            delete _window[WPrefix][id];
            break;
        }
    };

    var close_script = constructReceiver(url_id, callback);
    _window[WPrefix][id] = close_script;
    var stop = function() {
        if (_window[WPrefix][id]) {
            aborting = 1;
            _window[WPrefix][id](utils.closeFrame(1000, "JSONP user aborted read"));
        }
    };
    return stop;
};
//         [*] End of lib/trans-jsonp-polling.js


//         [*] Including lib/trans-xhr.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var AjaxBasedTransport = function() {};
AjaxBasedTransport.prototype = new BufferedSender();

AjaxBasedTransport.prototype.run = function(ri, trans_url,
                                            url_suffix, Receiver, AjaxObject) {
    var that = this;
    that.ri = ri;
    that.trans_url = trans_url;
    that.send_constructor(createAjaxSender(AjaxObject));
    that.poll = new Polling(ri, Receiver,
                            trans_url + url_suffix, AjaxObject);
};

AjaxBasedTransport.prototype.doCleanup = function() {
    var that = this;
    if (that.poll) {
        that.poll.abort();
        that.poll = null;
    }
};

// xhr-streaming
var XhrStreamingTransport = SockJS['xhr-streaming'] = function(ri, trans_url) {
    this.run(ri, trans_url, '/xhr_streaming', XhrReceiver, utils.XHRCorsObject);
};

XhrStreamingTransport.prototype = new AjaxBasedTransport();

XhrStreamingTransport.enabled = function() {
    // Support for CORS Ajax aka Ajax2? Opera 12 claims CORS but
    // doesn't do streaming.
    return (_window.XMLHttpRequest &&
            'withCredentials' in new XMLHttpRequest() &&
            (!/opera/i.test(navigator.userAgent)));
};
XhrStreamingTransport.roundTrips = 2; // preflight, ajax

// Safari gets confused when a streaming ajax request is started
// before onload. This causes the load indicator to spin indefinetely.
XhrStreamingTransport.need_body = true;


// According to:
//   http://stackoverflow.com/questions/1641507/detect-browser-support-for-cross-domain-xmlhttprequests
//   http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/


// xdr-streaming
var XdrStreamingTransport = SockJS['xdr-streaming'] = function(ri, trans_url) {
    this.run(ri, trans_url, '/xhr_streaming', XhrReceiver, utils.XDRObject);
};

XdrStreamingTransport.prototype = new AjaxBasedTransport();

XdrStreamingTransport.enabled = function() {
    return !!_window.XDomainRequest;
};
XdrStreamingTransport.roundTrips = 2; // preflight, ajax



// xhr-polling
var XhrPollingTransport = SockJS['xhr-polling'] = function(ri, trans_url) {
    this.run(ri, trans_url, '/xhr', XhrReceiver, utils.XHRCorsObject);
};

XhrPollingTransport.prototype = new AjaxBasedTransport();

XhrPollingTransport.enabled = XhrStreamingTransport.enabled;
XhrPollingTransport.roundTrips = 2; // preflight, ajax


// xdr-polling
var XdrPollingTransport = SockJS['xdr-polling'] = function(ri, trans_url) {
    this.run(ri, trans_url, '/xhr', XhrReceiver, utils.XDRObject);
};

XdrPollingTransport.prototype = new AjaxBasedTransport();

XdrPollingTransport.enabled = XdrStreamingTransport.enabled;
XdrPollingTransport.roundTrips = 2; // preflight, ajax
//         [*] End of lib/trans-xhr.js


//         [*] Including lib/trans-iframe.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

// Few cool transports do work only for same-origin. In order to make
// them working cross-domain we shall use iframe, served form the
// remote domain. New browsers, have capabilities to communicate with
// cross domain iframe, using postMessage(). In IE it was implemented
// from IE 8+, but of course, IE got some details wrong:
//    http://msdn.microsoft.com/en-us/library/cc197015(v=VS.85).aspx
//    http://stevesouders.com/misc/test-postmessage.php

var IframeTransport = function() {};

IframeTransport.prototype.i_constructor = function(ri, trans_url, base_url) {
    var that = this;
    that.ri = ri;
    that.origin = utils.getOrigin(base_url);
    that.base_url = base_url;
    that.trans_url = trans_url;

    var iframe_url = base_url + '/iframe.html';
    if (that.ri._options.devel) {
        iframe_url += '?t=' + (+new Date);
    }
    that.window_id = utils.random_string(8);
    iframe_url += '#' + that.window_id;

    that.iframeObj = utils.createIframe(iframe_url, function(r) {
                                            that.ri._didClose(1006, "Unable to load an iframe (" + r + ")");
                                        });

    that.onmessage_cb = utils.bind(that.onmessage, that);
    utils.attachMessage(that.onmessage_cb);
};

IframeTransport.prototype.doCleanup = function() {
    var that = this;
    if (that.iframeObj) {
        utils.detachMessage(that.onmessage_cb);
        try {
            // When the iframe is not loaded, IE raises an exception
            // on 'contentWindow'.
            if (that.iframeObj.iframe.contentWindow) {
                that.postMessage('c');
            }
        } catch (x) {}
        that.iframeObj.cleanup();
        that.iframeObj = null;
        that.onmessage_cb = that.iframeObj = null;
    }
};

IframeTransport.prototype.onmessage = function(e) {
    var that = this;
    if (e.origin !== that.origin) return;
    var window_id = e.data.slice(0, 8);
    var type = e.data.slice(8, 9);
    var data = e.data.slice(9);

    if (window_id !== that.window_id) return;

    switch(type) {
    case 's':
        that.iframeObj.loaded();
        that.postMessage('s', JSON.stringify([SockJS.version, that.protocol, that.trans_url, that.base_url]));
        break;
    case 't':
        that.ri._didMessage(data);
        break;
    }
};

IframeTransport.prototype.postMessage = function(type, data) {
    var that = this;
    that.iframeObj.post(that.window_id + type + (data || ''), that.origin);
};

IframeTransport.prototype.doSend = function (message) {
    this.postMessage('m', message);
};

IframeTransport.enabled = function() {
    // postMessage misbehaves in konqueror 4.6.5 - the messages are delivered with
    // huge delay, or not at all.
    var konqueror = navigator && navigator.userAgent && navigator.userAgent.indexOf('Konqueror') !== -1;
    return ((typeof _window.postMessage === 'function' ||
            typeof _window.postMessage === 'object') && (!konqueror));
};
//         [*] End of lib/trans-iframe.js


//         [*] Including lib/trans-iframe-within.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var curr_window_id;

var postMessage = function (type, data) {
    if(parent !== _window) {
        parent.postMessage(curr_window_id + type + (data || ''), '*');
    } else {
        utils.log("Can't postMessage, no parent window.", type, data);
    }
};

var FacadeJS = function() {};
FacadeJS.prototype._didClose = function (code, reason) {
    postMessage('t', utils.closeFrame(code, reason));
};
FacadeJS.prototype._didMessage = function (frame) {
    postMessage('t', frame);
};
FacadeJS.prototype._doSend = function (data) {
    this._transport.doSend(data);
};
FacadeJS.prototype._doCleanup = function () {
    this._transport.doCleanup();
};

utils.parent_origin = undefined;

SockJS.bootstrap_iframe = function() {
    var facade;
    curr_window_id = _document.location.hash.slice(1);
    var onMessage = function(e) {
        if(e.source !== parent) return;
        if(typeof utils.parent_origin === 'undefined')
            utils.parent_origin = e.origin;
        if (e.origin !== utils.parent_origin) return;

        var window_id = e.data.slice(0, 8);
        var type = e.data.slice(8, 9);
        var data = e.data.slice(9);
        if (window_id !== curr_window_id) return;
        switch(type) {
        case 's':
            var p = JSON.parse(data);
            var version = p[0];
            var protocol = p[1];
            var trans_url = p[2];
            var base_url = p[3];
            if (version !== SockJS.version) {
                utils.log("Incompatibile SockJS! Main site uses:" +
                          " \"" + version + "\", the iframe:" +
                          " \"" + SockJS.version + "\".");
            }
            if (!utils.flatUrl(trans_url) || !utils.flatUrl(base_url)) {
                utils.log("Only basic urls are supported in SockJS");
                return;
            }

            if (!utils.isSameOriginUrl(trans_url) ||
                !utils.isSameOriginUrl(base_url)) {
                utils.log("Can't connect to different domain from within an " +
                          "iframe. (" + JSON.stringify([_window.location.href, trans_url, base_url]) +
                          ")");
                return;
            }
            facade = new FacadeJS();
            facade._transport = new FacadeJS[protocol](facade, trans_url, base_url);
            break;
        case 'm':
            facade._doSend(data);
            break;
        case 'c':
            if (facade)
                facade._doCleanup();
            facade = null;
            break;
        }
    };

    // alert('test ticker');
    // facade = new FacadeJS();
    // facade._transport = new FacadeJS['w-iframe-xhr-polling'](facade, 'http://host.com:9999/ticker/12/basd');

    utils.attachMessage(onMessage);

    // Start
    postMessage('s');
};
//         [*] End of lib/trans-iframe-within.js


//         [*] Including lib/info.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var InfoReceiver = function(base_url, AjaxObject) {
    var that = this;
    utils.delay(function(){that.doXhr(base_url, AjaxObject);});
};

InfoReceiver.prototype = new EventEmitter(['finish']);

InfoReceiver.prototype.doXhr = function(base_url, AjaxObject) {
    var that = this;
    var t0 = (new Date()).getTime();
    var xo = new AjaxObject('GET', base_url + '/info');

    var tref = utils.delay(8000,
                           function(){xo.ontimeout();});

    xo.onfinish = function(status, text) {
        clearTimeout(tref);
        tref = null;
        if (status === 200) {
            var rtt = (new Date()).getTime() - t0;
            var info = JSON.parse(text);
            if (typeof info !== 'object') info = {};
            that.emit('finish', info, rtt);
        } else {
            that.emit('finish');
        }
    };
    xo.ontimeout = function() {
        xo.close();
        that.emit('finish');
    };
};

var InfoReceiverIframe = function(base_url) {
    var that = this;
    var go = function() {
        var ifr = new IframeTransport();
        ifr.protocol = 'w-iframe-info-receiver';
        var fun = function(r) {
            if (typeof r === 'string' && r.substr(0,1) === 'm') {
                var d = JSON.parse(r.substr(1));
                var info = d[0], rtt = d[1];
                that.emit('finish', info, rtt);
            } else {
                that.emit('finish');
            }
            ifr.doCleanup();
            ifr = null;
        };
        var mock_ri = {
            _options: {},
            _didClose: fun,
            _didMessage: fun
        };
        ifr.i_constructor(mock_ri, base_url, base_url);
    }
    if(!_document.body) {
        utils.attachEvent('load', go);
    } else {
        go();
    }
};
InfoReceiverIframe.prototype = new EventEmitter(['finish']);


var InfoReceiverFake = function() {
    // It may not be possible to do cross domain AJAX to get the info
    // data, for example for IE7. But we want to run JSONP, so let's
    // fake the response, with rtt=2s (rto=6s).
    var that = this;
    utils.delay(function() {
        that.emit('finish', {}, 2000);
    });
};
InfoReceiverFake.prototype = new EventEmitter(['finish']);

var createInfoReceiver = function(base_url) {
    if (utils.isSameOriginUrl(base_url)) {
        // If, for some reason, we have SockJS locally - there's no
        // need to start up the complex machinery. Just use ajax.
        return new InfoReceiver(base_url, utils.XHRLocalObject);
    }
    switch (utils.isXHRCorsCapable()) {
    case 1:
        // XHRLocalObject -> no_credentials=true
        return new InfoReceiver(base_url, utils.XHRLocalObject);
    case 2:
        return new InfoReceiver(base_url, utils.XDRObject);
    case 3:
        // Opera
        return new InfoReceiverIframe(base_url);
    default:
        // IE 7
        return new InfoReceiverFake();
    };
};


var WInfoReceiverIframe = FacadeJS['w-iframe-info-receiver'] = function(ri, _trans_url, base_url) {
    var ir = new InfoReceiver(base_url, utils.XHRLocalObject);
    ir.onfinish = function(info, rtt) {
        ri._didMessage('m'+JSON.stringify([info, rtt]));
        ri._didClose();
    }
};
WInfoReceiverIframe.prototype.doCleanup = function() {};
//         [*] End of lib/info.js


//         [*] Including lib/trans-iframe-eventsource.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var EventSourceIframeTransport = SockJS['iframe-eventsource'] = function () {
    var that = this;
    that.protocol = 'w-iframe-eventsource';
    that.i_constructor.apply(that, arguments);
};

EventSourceIframeTransport.prototype = new IframeTransport();

EventSourceIframeTransport.enabled = function () {
    return ('EventSource' in _window) && IframeTransport.enabled();
};

EventSourceIframeTransport.need_body = true;
EventSourceIframeTransport.roundTrips = 3; // html, javascript, eventsource


// w-iframe-eventsource
var EventSourceTransport = FacadeJS['w-iframe-eventsource'] = function(ri, trans_url) {
    this.run(ri, trans_url, '/eventsource', EventSourceReceiver, utils.XHRLocalObject);
}
EventSourceTransport.prototype = new AjaxBasedTransport();
//         [*] End of lib/trans-iframe-eventsource.js


//         [*] Including lib/trans-iframe-xhr-polling.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var XhrPollingIframeTransport = SockJS['iframe-xhr-polling'] = function () {
    var that = this;
    that.protocol = 'w-iframe-xhr-polling';
    that.i_constructor.apply(that, arguments);
};

XhrPollingIframeTransport.prototype = new IframeTransport();

XhrPollingIframeTransport.enabled = function () {
    return _window.XMLHttpRequest && IframeTransport.enabled();
};

XhrPollingIframeTransport.need_body = true;
XhrPollingIframeTransport.roundTrips = 3; // html, javascript, xhr


// w-iframe-xhr-polling
var XhrPollingITransport = FacadeJS['w-iframe-xhr-polling'] = function(ri, trans_url) {
    this.run(ri, trans_url, '/xhr', XhrReceiver, utils.XHRLocalObject);
};

XhrPollingITransport.prototype = new AjaxBasedTransport();
//         [*] End of lib/trans-iframe-xhr-polling.js


//         [*] Including lib/trans-iframe-htmlfile.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

// This transport generally works in any browser, but will cause a
// spinning cursor to appear in any browser other than IE.
// We may test this transport in all browsers - why not, but in
// production it should be only run in IE.

var HtmlFileIframeTransport = SockJS['iframe-htmlfile'] = function () {
    var that = this;
    that.protocol = 'w-iframe-htmlfile';
    that.i_constructor.apply(that, arguments);
};

// Inheritance.
HtmlFileIframeTransport.prototype = new IframeTransport();

HtmlFileIframeTransport.enabled = function() {
    return IframeTransport.enabled();
};

HtmlFileIframeTransport.need_body = true;
HtmlFileIframeTransport.roundTrips = 3; // html, javascript, htmlfile


// w-iframe-htmlfile
var HtmlFileTransport = FacadeJS['w-iframe-htmlfile'] = function(ri, trans_url) {
    this.run(ri, trans_url, '/htmlfile', HtmlfileReceiver, utils.XHRLocalObject);
};
HtmlFileTransport.prototype = new AjaxBasedTransport();
//         [*] End of lib/trans-iframe-htmlfile.js


//         [*] Including lib/trans-polling.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var Polling = function(ri, Receiver, recv_url, AjaxObject) {
    var that = this;
    that.ri = ri;
    that.Receiver = Receiver;
    that.recv_url = recv_url;
    that.AjaxObject = AjaxObject;
    that._scheduleRecv();
};

Polling.prototype._scheduleRecv = function() {
    var that = this;
    var poll = that.poll = new that.Receiver(that.recv_url, that.AjaxObject);
    var msg_counter = 0;
    poll.onmessage = function(e) {
        msg_counter += 1;
        that.ri._didMessage(e.data);
    };
    poll.onclose = function(e) {
        that.poll = poll = poll.onmessage = poll.onclose = null;
        if (!that.poll_is_closing) {
            if (e.reason === 'permanent') {
                that.ri._didClose(1006, 'Polling error (' + e.reason + ')');
            } else {
                that._scheduleRecv();
            }
        }
    };
};

Polling.prototype.abort = function() {
    var that = this;
    that.poll_is_closing = true;
    if (that.poll) {
        that.poll.abort();
    }
};
//         [*] End of lib/trans-polling.js


//         [*] Including lib/trans-receiver-eventsource.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var EventSourceReceiver = function(url) {
    var that = this;
    var es = new EventSource(url);
    es.onmessage = function(e) {
        that.dispatchEvent(new SimpleEvent('message',
                                           {'data': unescape(e.data)}));
    };
    that.es_close = es.onerror = function(e, abort_reason) {
        // ES on reconnection has readyState = 0 or 1.
        // on network error it's CLOSED = 2
        var reason = abort_reason ? 'user' :
            (es.readyState !== 2 ? 'network' : 'permanent');
        that.es_close = es.onmessage = es.onerror = null;
        // EventSource reconnects automatically.
        es.close();
        es = null;
        // Safari and chrome < 15 crash if we close window before
        // waiting for ES cleanup. See:
        //   https://code.google.com/p/chromium/issues/detail?id=89155
        utils.delay(200, function() {
                        that.dispatchEvent(new SimpleEvent('close', {reason: reason}));
                    });
    };
};

EventSourceReceiver.prototype = new REventTarget();

EventSourceReceiver.prototype.abort = function() {
    var that = this;
    if (that.es_close) {
        that.es_close({}, true);
    }
};
//         [*] End of lib/trans-receiver-eventsource.js


//         [*] Including lib/trans-receiver-htmlfile.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var _is_ie_htmlfile_capable;
var isIeHtmlfileCapable = function() {
    if (_is_ie_htmlfile_capable === undefined) {
        if ('ActiveXObject' in _window) {
            try {
                _is_ie_htmlfile_capable = !!new ActiveXObject('htmlfile');
            } catch (x) {}
        } else {
            _is_ie_htmlfile_capable = false;
        }
    }
    return _is_ie_htmlfile_capable;
};


var HtmlfileReceiver = function(url) {
    var that = this;
    utils.polluteGlobalNamespace();

    that.id = 'a' + utils.random_string(6, 26);
    url += ((url.indexOf('?') === -1) ? '?' : '&') +
        'c=' + escape(WPrefix + '.' + that.id);

    var constructor = isIeHtmlfileCapable() ?
        utils.createHtmlfile : utils.createIframe;

    var iframeObj;
    _window[WPrefix][that.id] = {
        start: function () {
            iframeObj.loaded();
        },
        message: function (data) {
            that.dispatchEvent(new SimpleEvent('message', {'data': data}));
        },
        stop: function () {
            that.iframe_close({}, 'network');
        }
    };
    that.iframe_close = function(e, abort_reason) {
        iframeObj.cleanup();
        that.iframe_close = iframeObj = null;
        delete _window[WPrefix][that.id];
        that.dispatchEvent(new SimpleEvent('close', {reason: abort_reason}));
    };
    iframeObj = constructor(url, function(e) {
                                that.iframe_close({}, 'permanent');
                            });
};

HtmlfileReceiver.prototype = new REventTarget();

HtmlfileReceiver.prototype.abort = function() {
    var that = this;
    if (that.iframe_close) {
        that.iframe_close({}, 'user');
    }
};
//         [*] End of lib/trans-receiver-htmlfile.js


//         [*] Including lib/trans-receiver-xhr.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var XhrReceiver = function(url, AjaxObject) {
    var that = this;
    var buf_pos = 0;

    that.xo = new AjaxObject('POST', url, null);
    that.xo.onchunk = function(status, text) {
        if (status !== 200) return;
        while (1) {
            var buf = text.slice(buf_pos);
            var p = buf.indexOf('\n');
            if (p === -1) break;
            buf_pos += p+1;
            var msg = buf.slice(0, p);
            that.dispatchEvent(new SimpleEvent('message', {data: msg}));
        }
    };
    that.xo.onfinish = function(status, text) {
        that.xo.onchunk(status, text);
        that.xo = null;
        var reason = status === 200 ? 'network' : 'permanent';
        that.dispatchEvent(new SimpleEvent('close', {reason: reason}));
    }
};

XhrReceiver.prototype = new REventTarget();

XhrReceiver.prototype.abort = function() {
    var that = this;
    if (that.xo) {
        that.xo.close();
        that.dispatchEvent(new SimpleEvent('close', {reason: 'user'}));
        that.xo = null;
    }
};
//         [*] End of lib/trans-receiver-xhr.js


//         [*] Including lib/test-hooks.js
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

// For testing
SockJS.getUtils = function(){
    return utils;
};

SockJS.getIframeTransport = function(){
    return IframeTransport;
};
//         [*] End of lib/test-hooks.js

                  return SockJS;
          })();
if ('_sockjs_onload' in window) setTimeout(_sockjs_onload, 1);

module.exports = SockJS;
//     [*] End of lib/index.js

// [*] End of lib/all.js

},{}],13:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// UMD HEADER START 
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(this, function () {
// UMD HEADER END

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }
  
  //BEGIN QS Hack
  var serialize = function(obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }
  
  if(options.qs){
    var qs = (typeof options.qs == 'string')? options.qs : serialize(options.qs);
    if(options.uri.indexOf('?') !== -1){ //no get params
        options.uri = options.uri+'&'+qs;
    }else{ //existing get params
        options.uri = options.uri+'?'+qs;
    }
  }
  //END QS Hack
  
  //BEGIN FORM Hack
  var multipart = function(obj) {
    //todo: support file type (useful?)
    var result = {};
    result.boundry = '-------------------------------'+Math.floor(Math.random()*1000000000);
    var lines = [];
    for(var p in obj){
        if (obj.hasOwnProperty(p)) {
            lines.push(
                '--'+result.boundry+"\n"+
                'Content-Disposition: form-data; name="'+p+'"'+"\n"+
                "\n"+
                obj[p]+"\n"
            );
        }
    }
    lines.push( '--'+result.boundry+'--' );
    result.body = lines.join('');
    result.length = result.body.length;
    result.type = 'multipart/form-data; boundary='+result.boundry;
    return result;
  }
  
  if(options.form){
    if(typeof options.form == 'string') throw('form name unsupported');
    if(options.method === 'POST'){
        var encoding = (options.encoding || 'application/x-www-form-urlencoded').toLowerCase();
        options.headers['content-type'] = encoding;
        switch(encoding){
            case 'application/x-www-form-urlencoded':
                options.body = serialize(options.form).replace(/%20/g, "+");
                break;
            case 'multipart/form-data':
                var multi = multipart(options.form);
                //options.headers['content-length'] = multi.length;
                options.body = multi.body;
                options.headers['content-type'] = multi.type;
                break;
            default : throw new Error('unsupported encoding:'+encoding);
        }
    }
  }
  //END FORM Hack

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}
    return request;
//UMD FOOTER START
}));
//UMD FOOTER END

},{}],14:[function(require,module,exports){
/*jshint browser:true, node:true*/

'use strict';

module.exports = Delegate;

/**
 * DOM event delegator
 *
 * The delegator will listen
 * for events that bubble up
 * to the root node.
 *
 * @constructor
 * @param {Node|string} [root] The root node or a selector string matching the root node
 */
function Delegate(root) {

  /**
   * Maintain a map of listener
   * lists, keyed by event name.
   *
   * @type Object
   */
  this.listenerMap = [{}, {}];
  if (root) {
    this.root(root);
  }

  /** @type function() */
  this.handle = Delegate.prototype.handle.bind(this);
}

/**
 * Start listening for events
 * on the provided DOM element
 *
 * @param  {Node|string} [root] The root node or a selector string matching the root node
 * @returns {Delegate} This method is chainable
 */
Delegate.prototype.root = function(root) {
  var listenerMap = this.listenerMap;
  var eventType;

  // Remove master event listeners
  if (this.rootElement) {
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, true);
      }
    }
    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, false);
      }
    }
  }

  // If no root or root is not
  // a dom node, then remove internal
  // root reference and exit here
  if (!root || !root.addEventListener) {
    if (this.rootElement) {
      delete this.rootElement;
    }
    return this;
  }

  /**
   * The root node at which
   * listeners are attached.
   *
   * @type Node
   */
  this.rootElement = root;

  // Set up master event listeners
  for (eventType in listenerMap[1]) {
    if (listenerMap[1].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, true);
    }
  }
  for (eventType in listenerMap[0]) {
    if (listenerMap[0].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, false);
    }
  }

  return this;
};

/**
 * @param {string} eventType
 * @returns boolean
 */
Delegate.prototype.captureForType = function(eventType) {
  return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
};

/**
 * Attach a handler to one
 * event for all elements
 * that match the selector,
 * now or in the future
 *
 * The handler function receives
 * three arguments: the DOM event
 * object, the node that matched
 * the selector while the event
 * was bubbling and a reference
 * to itself. Within the handler,
 * 'this' is equal to the second
 * argument.
 *
 * The node that actually received
 * the event can be accessed via
 * 'event.target'.
 *
 * @param {string} eventType Listen for these events
 * @param {string|undefined} selector Only handle events on elements matching this selector, if undefined match root element
 * @param {function()} handler Handler function - event data passed here will be in event.data
 * @param {Object} [eventData] Data to pass in event.data
 * @returns {Delegate} This method is chainable
 */
Delegate.prototype.on = function(eventType, selector, handler, useCapture) {
  var root, listenerMap, matcher, matcherParam;

  if (!eventType) {
    throw new TypeError('Invalid event type: ' + eventType);
  }

  // handler can be passed as
  // the second or third argument
  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  }

  // Fallback to sensible defaults
  // if useCapture not set
  if (useCapture === undefined) {
    useCapture = this.captureForType(eventType);
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Handler must be a type of Function');
  }

  root = this.rootElement;
  listenerMap = this.listenerMap[useCapture ? 1 : 0];

  // Add master handler for type if not created yet
  if (!listenerMap[eventType]) {
    if (root) {
      root.addEventListener(eventType, this.handle, useCapture);
    }
    listenerMap[eventType] = [];
  }

  if (!selector) {
    matcherParam = null;

    // COMPLEX - matchesRoot needs to have access to
    // this.rootElement, so bind the function to this.
    matcher = matchesRoot.bind(this);

  // Compile a matcher for the given selector
  } else if (/^[a-z]+$/i.test(selector)) {
    matcherParam = selector;
    matcher = matchesTag;
  } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
    matcherParam = selector.slice(1);
    matcher = matchesId;
  } else {
    matcherParam = selector;
    matcher = matches;
  }

  // Add to the list of listeners
  listenerMap[eventType].push({
    selector: selector,
    handler: handler,
    matcher: matcher,
    matcherParam: matcherParam
  });

  return this;
};

/**
 * Remove an event handler
 * for elements that match
 * the selector, forever
 *
 * @param {string} [eventType] Remove handlers for events matching this type, considering the other parameters
 * @param {string} [selector] If this parameter is omitted, only handlers which match the other two will be removed
 * @param {function()} [handler] If this parameter is omitted, only handlers which match the previous two will be removed
 * @returns {Delegate} This method is chainable
 */
Delegate.prototype.off = function(eventType, selector, handler, useCapture) {
  var i, listener, listenerMap, listenerList, singleEventType;

  // Handler can be passed as
  // the second or third argument
  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  }

  // If useCapture not set, remove
  // all event listeners
  if (useCapture === undefined) {
    this.off(eventType, selector, handler, true);
    this.off(eventType, selector, handler, false);
    return this;
  }

  listenerMap = this.listenerMap[useCapture ? 1 : 0];
  if (!eventType) {
    for (singleEventType in listenerMap) {
      if (listenerMap.hasOwnProperty(singleEventType)) {
        this.off(singleEventType, selector, handler);
      }
    }

    return this;
  }

  listenerList = listenerMap[eventType];
  if (!listenerList || !listenerList.length) {
    return this;
  }

  // Remove only parameter matches
  // if specified
  for (i = listenerList.length - 1; i >= 0; i--) {
    listener = listenerList[i];

    if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
      listenerList.splice(i, 1);
    }
  }

  // All listeners removed
  if (!listenerList.length) {
    delete listenerMap[eventType];

    // Remove the main handler
    if (this.rootElement) {
      this.rootElement.removeEventListener(eventType, this.handle, useCapture);
    }
  }

  return this;
};


/**
 * Handle an arbitrary event.
 *
 * @param {Event} event
 */
Delegate.prototype.handle = function(event) {
  var i, l, type = event.type, root, phase, listener, returned, listenerList = [], target, /** @const */ EVENTIGNORE = 'ftLabsDelegateIgnore';

  if (event[EVENTIGNORE] === true) {
    return;
  }

  target = event.target;

  // Hardcode value of Node.TEXT_NODE
  // as not defined in IE8
  if (target.nodeType === 3) {
    target = target.parentNode;
  }

  root = this.rootElement;

  phase = event.eventPhase || ( event.target !== event.currentTarget ? 3 : 2 );
  
  switch (phase) {
    case 1: //Event.CAPTURING_PHASE:
      listenerList = this.listenerMap[1][type];
    break;
    case 2: //Event.AT_TARGET:
      if (this.listenerMap[0] && this.listenerMap[0][type]) listenerList = listenerList.concat(this.listenerMap[0][type]);
      if (this.listenerMap[1] && this.listenerMap[1][type]) listenerList = listenerList.concat(this.listenerMap[1][type]);
    break;
    case 3: //Event.BUBBLING_PHASE:
      listenerList = this.listenerMap[0][type];
    break;
  }

  // Need to continuously check
  // that the specific list is
  // still populated in case one
  // of the callbacks actually
  // causes the list to be destroyed.
  l = listenerList.length;
  while (target && l) {
    for (i = 0; i < l; i++) {
      listener = listenerList[i];

      // Bail from this loop if
      // the length changed and
      // no more listeners are
      // defined between i and l.
      if (!listener) {
        break;
      }

      // Check for match and fire
      // the event if there's one
      //
      // TODO:MCG:20120117: Need a way
      // to check if event#stopImmediatePropagation
      // was called. If so, break both loops.
      if (listener.matcher.call(target, listener.matcherParam, target)) {
        returned = this.fire(event, target, listener);
      }

      // Stop propagation to subsequent
      // callbacks if the callback returned
      // false
      if (returned === false) {
        event[EVENTIGNORE] = true;
        event.preventDefault();
        return;
      }
    }

    // TODO:MCG:20120117: Need a way to
    // check if event#stopPropagation
    // was called. If so, break looping
    // through the DOM. Stop if the
    // delegation root has been reached
    if (target === root) {
      break;
    }

    l = listenerList.length;
    target = target.parentElement;
  }
};

/**
 * Fire a listener on a target.
 *
 * @param {Event} event
 * @param {Node} target
 * @param {Object} listener
 * @returns {boolean}
 */
Delegate.prototype.fire = function(event, target, listener) {
  return listener.handler.call(target, event, target);
};

/**
 * Check whether an element
 * matches a generic selector.
 *
 * @type function()
 * @param {string} selector A CSS selector
 */
var matches = (function(el) {
  if (!el) return;
  var p = el.prototype;
  return (p.matches || p.matchesSelector || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector);
}(Element));

/**
 * Check whether an element
 * matches a tag selector.
 *
 * Tags are NOT case-sensitive,
 * except in XML (and XML-based
 * languages such as XHTML).
 *
 * @param {string} tagName The tag name to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */
function matchesTag(tagName, element) {
  return tagName.toLowerCase() === element.tagName.toLowerCase();
}

/**
 * Check whether an element
 * matches the root.
 *
 * @param {?String} selector In this case this is always passed through as null and not used
 * @param {Element} element The element to test with
 * @returns boolean
 */
function matchesRoot(selector, element) {
  /*jshint validthis:true*/
  if (this.rootElement === window) return element === document;
  return this.rootElement === element;
}

/**
 * Check whether the ID of
 * the element in 'this'
 * matches the given ID.
 *
 * IDs are case-sensitive.
 *
 * @param {string} id The ID to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */
function matchesId(id, element) {
  return id === element.id;
}

/**
 * Short hand for off()
 * and root(), ie both
 * with no parameters
 *
 * @return void
 */
Delegate.prototype.destroy = function() {
  this.off();
  this.root();
};

},{}],15:[function(require,module,exports){
/*jshint browser:true, node:true*/

'use strict';

/**
 * @preserve Create and manage a DOM event delegator.
 *
 * @version 0.3.0
 * @codingstandard ftlabs-jsv2
 * @copyright The Financial Times Limited [All Rights Reserved]
 * @license MIT License (see LICENSE.txt)
 */
var Delegate = require('./delegate');

module.exports = function(root) {
  return new Delegate(root);
};

module.exports.Delegate = Delegate;

},{"./delegate":14}],16:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Tests for browser support.
 */

var div = document.createElement('div');
// Setup
div.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';
// Make sure that link elements get serialized correctly by innerHTML
// This requires a wrapper element in IE
var innerHTMLBug = !div.getElementsByTagName('link').length;
div = undefined;

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  // for script/link/style tags to work in IE6-8, you have to wrap
  // in a div with a non-whitespace character in front, ha!
  _default: innerHTMLBug ? [1, 'X<div>', '</div>'] : [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return a DOM Node instance, which could be a TextNode,
 * HTML DOM Node of some kind (<div> for example), or a DocumentFragment
 * instance, depending on the contents of the `html` string.
 *
 * @param {String} html - HTML string to "domify"
 * @param {Document} doc - The `document` instance to create the Node for
 * @return {DOMNode} the TextNode, DOM Node, or DocumentFragment instance
 * @api private
 */

function parse(html, doc) {
  if ('string' != typeof html) throw new TypeError('String expected');

  // default to the global `document` object
  if (!doc) doc = document;

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return doc.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = doc.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = doc.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = doc.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

},{}],17:[function(require,module,exports){
"use strict";

/**
 * filesize
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2015 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/filesize.js/master/LICENSE>
 * @link http://filesizejs.com
 * @module filesize
 * @version 3.1.0
 */
(function (global) {
  var bit = /b$/;

  /**
   * filesize
   *
   * @method filesize
   * @param  {Mixed}   arg        String, Int or Float to transform
   * @param  {Object}  descriptor [Optional] Flags
   * @return {String}             Readable file size String
   */
  var filesize = function (arg, descriptor) {
    var result = [],
        skip = false,
        val = 0,
        e = undefined,
        base = undefined,
        bits = undefined,
        ceil = undefined,
        neg = undefined,
        num = undefined,
        output = undefined,
        round = undefined,
        unix = undefined,
        spacer = undefined,
        suffixes = undefined;

    if (isNaN(arg)) {
      throw new Error("Invalid arguments");
    }

    descriptor = descriptor || {};
    bits = descriptor.bits === true;
    unix = descriptor.unix === true;
    base = descriptor.base !== undefined ? descriptor.base : 2;
    round = descriptor.round !== undefined ? descriptor.round : unix ? 1 : 2;
    spacer = descriptor.spacer !== undefined ? descriptor.spacer : unix ? "" : " ";
    suffixes = descriptor.suffixes !== undefined ? descriptor.suffixes : {};
    output = descriptor.output !== undefined ? descriptor.output : "string";
    e = descriptor.exponent !== undefined ? descriptor.exponent : -1;
    num = Number(arg);
    neg = num < 0;
    ceil = base > 2 ? 1000 : 1024;

    // Flipping a negative number to determine the size
    if (neg) {
      num = -num;
    }

    // Zero is now a special case because bytes divide by 1
    if (num === 0) {
      result[0] = 0;

      if (unix) {
        result[1] = "";
      } else {
        result[1] = "B";
      }
    } else {
      // Determining the exponent
      if (e === -1 || isNaN(e)) {
        e = Math.floor(Math.log(num) / Math.log(ceil));
      }

      // Exceeding supported length, time to reduce & multiply
      if (e > 8) {
        val = val * (1000 * (e - 8));
        e = 8;
      }

      if (base === 2) {
        val = num / Math.pow(2, e * 10);
      } else {
        val = num / Math.pow(1000, e);
      }

      if (bits) {
        val = val * 8;

        if (val > ceil) {
          val = val / ceil;
          e++;
        }
      }

      result[0] = Number(val.toFixed(e > 0 ? round : 0));
      result[1] = si[bits ? "bits" : "bytes"][e];

      if (!skip && unix) {
        if (bits && bit.test(result[1])) {
          result[1] = result[1].toLowerCase();
        }

        result[1] = result[1].charAt(0);

        if (result[1] === "B") {
          result[0] = Math.floor(result[0]);
          result[1] = "";
        } else if (!bits && result[1] === "k") {
          result[1] = "K";
        }
      }
    }

    // Decorating a 'diff'
    if (neg) {
      result[0] = -result[0];
    }

    // Applying custom suffix
    result[1] = suffixes[result[1]] || result[1];

    // Returning Array, Object, or String (default)
    if (output === "array") {
      return result;
    } else if (output === "exponent") {
      return e;
    } else if (output === "object") {
      return { value: result[0], suffix: result[1] };
    } else {
      return result.join(spacer);
    }
  };

  /**
   * SI suffixes
   *
   * @type {Object}
   */
  var si = {
    bits: ["B", "kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"],
    bytes: ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  };

  // CommonJS, AMD, script tag
  if (typeof exports !== "undefined") {
    module.exports = filesize;
  } else if (typeof define === "function") {
    define(function () {
      return filesize;
    });
  } else {
    global.filesize = filesize;
  }
})(this);
},{}],18:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],19:[function(require,module,exports){
var READY = -1,
	COMPLETE = 0,
	FAILED = 1,
	Gatherer,
	checkTasks;

function Gatherer(){

	this.reset();
	return this;

}

function checkTasks(){

	var completed = this.tasksComplete + this.tasksFailed;
	var count = this.tasks.length;

	// post the percent complete..
	this.fn.update( Math.ceil(100 * (completed / count)));

	// and fire the complete callback when done, regardless of outcome
	if(completed >= count){

		this.isComplete = true;

		this.fn.complete( this.tasksFailed ? this.errors : null );
		
	}

	return;
};

Gatherer.prototype = {

	reset : function resetGathering(){

		var self = this;

		this.tasks = [];
		this.fn = {
			complete : function(){},
			update : function(){}
		}
		this.isComplete = false;
		this.tasksComplete = 0;
		this.tasksFailed = 0;
		this.errors = [];

		return;

	},

	task : function createTask( callback ){

		var self = this,
			task = { status : READY },
			done = function(){
				task.status = COMPLETE;
				self.tasksComplete++;
				checkTasks.call(self);	
			},
			error = function(err){
				task.status = FAILED;
				self.tasksFailed++;
				self.errors.push(err);
				checkTasks.call(self);
			};

		task.fn = function(){

			callback(done, error);

		}
		self.tasks.push(task);
		return self;

	},

	run : function runTasks( callback, timeout ){

		var self = this;

		if (timeout){

			setTimeout(function(){

				if (!self.isComplete){

					self.fn.complete('Error: Timed out');
					self.fn.complete = function(){};

				}


			}, timeout);

		}

		self.fn.complete = callback;

		// run the task callbacks...
		for (var i = 0, il = self.tasks.length; i < il; i++){
			self.tasks[i].fn();
		}

		return self;

	},

	update : function setUpdateCallback( callback ){
		this.fn.update = callback;
		return this;
	}

}

module.exports = Gatherer;
},{}],20:[function(require,module,exports){
/**
 * Module dependencies.
 */

var matches = require('matches-selector');
var delegate = require('delegate');
var classes = require('classes');
var traverse = require('traverse');
var indexof = require('indexof');
var domify = require('domify');
var events = require('event');
var value = require('value');
var query = require('query');
var type = require('type');
var trim = require('trim');
var css = require('css');

var eventRefs = {};
var expando = 0;

/**
 * Attributes supported.
 */

var attrs = [
  'id',
  'src',
  'rel',
  'cols',
  'rows',
  'type',
  'name',
  'href',
  'title',
  'style',
  'width',
  'height',
  'action',
  'method',
  'tabindex',
  'placeholder'
];

/**
 * Expose `dom()`.
 */

exports = module.exports = dom;

/**
 * Expose supported attrs.
 */

exports.attrs = attrs;

/**
 * Return a dom `List` for the given
 * `html`, selector, or element.
 *
 * @param {String|Element|List}
 * @return {List}
 * @api public
 */

function dom(selector, context) {
  // array
  if (Array.isArray(selector)) {
    return new List(selector);
  }

  // List
  if (selector instanceof List) {
    return selector;
  }

  // node
  if (selector.nodeName) {
    return new List([selector]);
  }

  if ('string' != typeof selector) {
    throw new TypeError('invalid selector');
  }

  // html
  var htmlselector = trim.left(selector);
  if ('<' == htmlselector.charAt(0)) {
    return new List([domify(htmlselector)], htmlselector);
  }

  // selector
  var ctx = context
    ? (context.els ? context.els[0] : context)
    : document;

  return new List(query.all(selector, ctx), selector);
}

/**
 * Expose `List` constructor.
 */

exports.List = List;

/**
 * Initialize a new `List` with the
 * given array-ish of `els` and `selector`
 * string.
 *
 * @param {Mixed} els
 * @param {String} selector
 * @api private
 */

function List(els, selector) {
  this.els = els || [];
  this.selector = selector;
}

/**
 * Enumerable iterator.
 */

List.prototype.__iterate__ = function(){
  var self = this;
  return {
    length: function(){ return self.els.length },
    get: function(i){ return new List([self.els[i]]) }
  }
};

/**
 * Remove elements from the DOM.
 *
 * @api public
 */

List.prototype.remove = function(){
  for (var i = 0; i < this.els.length; i++) {
    var el = this.els[i];
    el.style.display = "none"; // hide it, if nothing else.
    walkDOM(el, function( node ){
      var id;
      if(id = node.__expando){
        for(var j = 0; j < eventRefs[id].length; ++j){
          events.unbind(node, eventRefs[id][j].evt, eventRefs[id][j].fn);
          delete eventRefs[id][j];
        }
      }
      return true;
    });
    el.style.display = "";
    var parent = el.parentNode;
    if (parent) parent.removeChild(el);
  }
};

/**
 * Set attribute `name` to `val`, or get attr `name`.
 *
 * @param {String} name
 * @param {String} [val]
 * @return {String|List} self
 * @api public
 */

List.prototype.attr = function(name, val){

  // set via object
  if ("object" == typeof name){
    for (var attr in name) {
      this.attr(attr, name[attr]);
    }
    return this;
  }

  // get
  if (1 == arguments.length) {
    return this.els[0] && this.els[0].getAttribute(name);
  }

  // remove
  if (null == val) {
    return this.removeAttr(name);
  }

  // set
  return this.forEach(function(el){
    el.setAttribute(name, val);
  });
};

/**
 * Remove attribute `name`.
 *
 * @param {String} name
 * @return {List} self
 * @api public
 */

List.prototype.removeAttr = function(name){
  return this.forEach(function(el){
    el.removeAttribute(name);
  });
};

/**
 * Set property `name` to `val`, or get property `name`.
 *
 * @param {String} name
 * @param {String} [val]
 * @return {Object|List} self
 * @api public
 */

List.prototype.prop = function(name, val){
  if (1 == arguments.length) {
    return this.els[0] && this.els[0][name];
  }

  return this.forEach(function(el){
    el[name] = val;
  });
};

/**
 * Get the first element's value or set selected
 * element values to `val`.
 *
 * @param {Mixed} [val]
 * @return {Mixed}
 * @api public
 */

List.prototype.val =
List.prototype.value = function(val){
  if (0 == arguments.length) {
    return this.els[0]
      ? value(this.els[0])
      : undefined;
  }

  return this.forEach(function(el){
    value(el, val);
  });
};

/**
 * Return a cloned `List` with all elements cloned.
 *
 * @return {List}
 * @api public
 */

List.prototype.clone = function(){
  var arr = [];
  for (var i = 0, len = this.els.length; i < len; ++i) {
    arr.push(this.els[i].cloneNode(true));
  }
  return new List(arr);
};

/**
 * Prepend `val`.
 *
 * @param {String|Element|List} val
 * @return {List} new list
 * @api public
 */

List.prototype.prepend = function(val){
  var el = this.els[0];
  if (!el) return this;
  val = dom(val);
  for (var i = 0; i < val.els.length; ++i) {
    if (el.children.length) {
      el.insertBefore(val.els[i], el.firstChild);
    } else {
      el.appendChild(val.els[i]);
    }
  }
  return val;
};

/**
 * Append `val`.
 *
 * @param {String|Element|List} val
 * @return {List} new list
 * @api public
 */

List.prototype.append = function(val){
  var el = this.els[0];
  if (!el) return this;
  val = dom(val);
  for (var i = 0; i < val.els.length; ++i) {
    el.appendChild(val.els[i]);
  }
  return val;
};

/**
 * Append self's `el` to `val`
 *
 * @param {String|Element|List} val
 * @return {List} self
 * @api public
 */

List.prototype.appendTo = function(val){
  dom(val).append(this);
  return this;
};

/**
 * Insert self's `els` after `val`
 *
 * @param {String|Element|List} val
 * @return {List} self
 * @api public
 */

List.prototype.insertAfter = function(val){
  val = dom(val).els[0];
  if (!val || !val.parentNode) return this;
  this.forEach(function(el){
    val.parentNode.insertBefore(el, val.nextSibling);
  });
  return this;
};

/**
 * Return a `List` containing the element at `i`.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */

List.prototype.at = function(i){
  return new List([this.els[i]], this.selector);
};

/**
 * Return a `List` containing the first element.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */

List.prototype.first = function(){
  return new List([this.els[0]], this.selector);
};

/**
 * Return a `List` containing the last element.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */

List.prototype.last = function(){
  return new List([this.els[this.els.length - 1]], this.selector);
};

/**
 * Return an `Element` at `i`.
 *
 * @param {Number} i
 * @return {Element}
 * @api public
 */

List.prototype.get = function(i){
  return this.els[i || 0];
};

/**
 * Return list length.
 *
 * @return {Number}
 * @api public
 */

List.prototype.length = function(){
  return this.els.length;
};

/**
 * Return element text.
 *
 * @param {String} str
 * @return {String|List}
 * @api public
 */

List.prototype.text = function(str){
  // TODO: real impl
  if (1 == arguments.length) {
    this.forEach(function(el){
      el.textContent = str;
    });
    return this;
  }

  var str = '';
  for (var i = 0; i < this.els.length; ++i) {
    str += this.els[i].textContent;
  }
  return str;
};

/**
 * Return element html.
 *
 * @return {String} html
 * @api public
 */

List.prototype.html = function(html){
  if (1 == arguments.length) {
    return this.forEach(function(el){
      el.innerHTML = html;
    });
  }

  // TODO: real impl
  return this.els[0] && this.els[0].innerHTML;
};

/**
 * Bind to `event` and invoke `fn(e)`. When
 * a `selector` is given then events are delegated.
 *
 * @param {String} event
 * @param {String} [selector]
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {List}
 * @api public
 */

List.prototype.on = function(event, selector, fn, capture){
  var id, cur;
  if ('string' == typeof selector) {
    for (var i = 0; i < this.els.length; ++i) {
      fn._delegate = delegate.bind(this.els[i], selector, event, fn, capture);
    }
    return this;
  }

  capture = fn;
  fn = selector;

  for (var i = 0; i < this.els.length; ++i) {
    if (id = this.els[i].__expando){
    } else {
      id = ++expando;
      this.els[i].__expando = id;
    }
    if(!eventRefs[id]){
      eventRefs[id] = [];
    }
    cur = eventRefs[id].length;
    eventRefs[id][cur] = {
      evt : event,
      fn : fn
    };
    events.bind(this.els[i], eventRefs[id][cur].evt, eventRefs[id][cur].fn, capture);
  }

  return this;
};

/**
 * Unbind to `event` and invoke `fn(e)`. When
 * a `selector` is given then delegated event
 * handlers are unbound.
 *
 * @param {String} event
 * @param {String} [selector]
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {List}
 * @api public
 */

List.prototype.off = function(event, selector, fn, capture){
  var id, i;
  if ('string' == typeof selector) {
    for (i = 0; i < this.els.length; ++i) {
      // TODO: add selector support back
      delegate.unbind(this.els[i], event, fn._delegate, capture);
    }
    return this;
  }

  capture = fn;
  fn = selector;

  if (!selector){
    for (i = 0; i < this.els.length; ++i) {
      id = this.els[i].__expando;
      for(var j = 0; j < eventRefs[id].length; ++j){
        events.unbind(this.els[i], eventRefs[id][j].evt, eventRefs[id][j].fn);
      }
    }
  } else {
    for (i = 0; i < this.els.length; ++i) {
      events.unbind(this.els[i], event, fn, capture);
    }
  }
  
  return this;
};
/**
 * Iterate elements and invoke `fn(list, i)`.
 *
 * @param {Function} fn
 * @return {List} self
 * @api public
 */

List.prototype.each = function(fn){
  for (var i = 0; i < this.els.length; ++i) {
    fn(new List([this.els[i]], this.selector), i);
  }
  return this;
};

/**
 * Iterate elements and invoke `fn(el, i)`.
 *
 * @param {Function} fn
 * @return {List} self
 * @api public
 */

List.prototype.forEach = function(fn){
  for (var i = 0; i < this.els.length; ++i) {
    fn(this.els[i], i);
  }
  return this;
};

/**
 * Map elements invoking `fn(list, i)`.
 *
 * @param {Function} fn
 * @return {Array}
 * @api public
 */

List.prototype.map = function(fn){
  var arr = [];
  for (var i = 0; i < this.els.length; ++i) {
    arr.push(fn(new List([this.els[i]], this.selector), i));
  }
  return arr;
};

/**
 * Filter elements invoking `fn(list, i)`, returning
 * a new `List` of elements when a truthy value is returned.
 *
 * @param {Function} fn
 * @return {List}
 * @api public
 */

List.prototype.select =
List.prototype.filter = function(fn){
  var el;
  var list = new List([], this.selector);
  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    if (fn(new List([el], this.selector), i)) list.els.push(el);
  }
  return list;
};

/**
 * Filter elements invoking `fn(list, i)`, returning
 * a new `List` of elements when a falsey value is returned.
 *
 * @param {Function} fn
 * @return {List}
 * @api public
 */

List.prototype.reject = function(fn){
  var el;
  var list = new List([], this.selector);
  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    if (!fn(new List([el], this.selector), i)) list.els.push(el);
  }
  return list;
};

/**
 * Add the given class `name`.
 *
 * @param {String} name
 * @return {List} self
 * @api public
 */

List.prototype.addClass = function(name){
  var el;
  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    el._classes.add(name);
  }
  return this;
};

/**
 * Remove the given class `name`.
 *
 * @param {String|RegExp} name
 * @return {List} self
 * @api public
 */

List.prototype.removeClass = function(name){
  var el;

  if ('regexp' == type(name)) {
    for (var i = 0; i < this.els.length; ++i) {
      el = this.els[i];
      el._classes = el._classes || classes(el);
      var arr = el._classes.array();
      for (var j = 0; j < arr.length; j++) {
        if (name.test(arr[j])) {
          el._classes.remove(arr[j]);
        }
      }
    }
    return this;
  }

  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    el._classes.remove(name);
  }

  return this;
};

/**
 * Toggle the given class `name`,
 * optionally a `bool` may be given
 * to indicate that the class should
 * be added when truthy.
 *
 * @param {String} name
 * @param {Boolean} bool
 * @return {List} self
 * @api public
 */

List.prototype.toggleClass = function(name, bool){
  var el;
  var fn = 'toggle';

  // toggle with boolean
  if (2 == arguments.length) {
    fn = bool ? 'add' : 'remove';
  }

  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    el._classes[fn](name);
  }

  return this;
};

/**
 * Check if the given class `name` is present.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

List.prototype.hasClass = function(name){
  var el;
  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    if (el._classes.has(name)) return true;
  }
  return false;
};

/**
 * Set CSS `prop` to `val` or get `prop` value.
 * Also accepts an object (`prop`: `val`)
 *
 * @param {String} prop
 * @param {Mixed} val
 * @return {List|String}
 * @api public
 */

List.prototype.css = function(prop, val){
  if (2 == arguments.length) {
    var obj = {};
    obj[prop] = val;
    return this.setStyle(obj);
  }

  if ('object' == type(prop)) {
    return this.setStyle(prop);
  }

  return this.getStyle(prop);
};

/**
 * Set CSS `props`.
 *
 * @param {Object} props
 * @return {List} self
 * @api private
 */

List.prototype.setStyle = function(props){
  for (var i = 0; i < this.els.length; ++i) {
    css(this.els[i], props);
  }
  return this;
};

/**
 * Get CSS `prop` value.
 *
 * @param {String} prop
 * @return {String}
 * @api private
 */

List.prototype.getStyle = function(prop){
  var el = this.els[0];
  if (el) return el.style[prop];
};

/**
 * Find children matching the given `selector`.
 *
 * @param {String} selector
 * @return {List}
 * @api public
 */

List.prototype.find = function(selector){
  return dom(selector, this);
};

/**
 * Empty the dom list
 *
 * @return self
 * @api public
 */

List.prototype.empty = function(){
  var elem, el;

  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  return this;
}

/**
 * Check if the first element matches `selector`.
 *
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

List.prototype.is = function(selector){
  return matches(this.get(0), selector);
};

/**
 * Get parent(s) with optional `selector` and `limit`
 *
 * @param {String} selector
 * @param {Number} limit
 * @return {List}
 * @api public
 */

List.prototype.parent = function(selector, limit){
  return new List(traverse('parentNode',
    this.get(0),
    selector,
    limit
    || 1));
};

/**
 * Get next element(s) with optional `selector` and `limit`.
 *
 * @param {String} selector
 * @param {Number} limit
 * @retrun {List}
 * @api public
 */

List.prototype.next = function(selector, limit){
  return new List(traverse('nextSibling',
    this.get(0),
    selector,
    limit
    || 1));
};

/**
 * Get previous element(s) with optional `selector` and `limit`.
 *
 * @param {String} selector
 * @param {Number} limit
 * @return {List}
 * @api public
 */

List.prototype.prev =
List.prototype.previous = function(selector, limit){
  return new List(traverse('previousSibling',
    this.get(0),
    selector,
    limit
    || 1));
};

/**
 * Attribute accessors.
 */

attrs.forEach(function(name){
  List.prototype[name] = function(val){
    if (0 == arguments.length) return this.attr(name);
    return this.attr(name, val);
  };
});

/**
 * Walk Dom `node` and call `func`.
 *
 * @param {Object} domNode, {Function} callback
 * @return null
 * @api private
 */

function walkDOM(node, func){
  var go = func(node);
  if(go){
    node = node.firstChild;
    while (node){
      walkDOM(node, func);
      node = node.nextSibling;
    }
  }
};


},{"classes":21,"css":31,"delegate":22,"domify":25,"event":26,"indexof":27,"matches-selector":28,"query":29,"traverse":32,"trim":34,"type":30,"value":33}],21:[function(require,module,exports){
/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Whitespace regexp.
 */

var re = /\s+/;

/**
 * toString reference.
 */

var toString = Object.prototype.toString;

/**
 * Wrap `el` in a `ClassList`.
 *
 * @param {Element} el
 * @return {ClassList}
 * @api public
 */

module.exports = function(el){
  return new ClassList(el);
};

/**
 * Initialize a new ClassList for `el`.
 *
 * @param {Element} el
 * @api private
 */

function ClassList(el) {
  if (!el) throw new Error('A DOM element reference is required');
  this.el = el;
  this.list = el.classList;
}

/**
 * Add class `name` if not already present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.add = function(name){
  // classList
  if (this.list) {
    this.list.add(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (!~i) arr.push(name);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove class `name` when present, or
 * pass a regular expression to remove
 * any which match.
 *
 * @param {String|RegExp} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.remove = function(name){
  if ('[object RegExp]' == toString.call(name)) {
    return this.removeMatching(name);
  }

  // classList
  if (this.list) {
    this.list.remove(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (~i) arr.splice(i, 1);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove all classes matching `re`.
 *
 * @param {RegExp} re
 * @return {ClassList}
 * @api private
 */

ClassList.prototype.removeMatching = function(re){
  var arr = this.array();
  for (var i = 0; i < arr.length; i++) {
    if (re.test(arr[i])) {
      this.remove(arr[i]);
    }
  }
  return this;
};

/**
 * Toggle class `name`, can force state via `force`.
 *
 * For browsers that support classList, but do not support `force` yet,
 * the mistake will be detected and corrected.
 *
 * @param {String} name
 * @param {Boolean} force
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.toggle = function(name, force){
  // classList
  if (this.list) {
    if ("undefined" !== typeof force) {
      if (force !== this.list.toggle(name, force)) {
        this.list.toggle(name); // toggle again to correct
      }
    } else {
      this.list.toggle(name);
    }
    return this;
  }

  // fallback
  if ("undefined" !== typeof force) {
    if (!force) {
      this.remove(name);
    } else {
      this.add(name);
    }
  } else {
    if (this.has(name)) {
      this.remove(name);
    } else {
      this.add(name);
    }
  }

  return this;
};

/**
 * Return an array of classes.
 *
 * @return {Array}
 * @api public
 */

ClassList.prototype.array = function(){
  var str = this.el.className.replace(/^\s+|\s+$/g, '');
  var arr = str.split(re);
  if ('' === arr[0]) arr.shift();
  return arr;
};

/**
 * Check if class `name` is present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.has =
ClassList.prototype.contains = function(name){
  return this.list
    ? this.list.contains(name)
    : !! ~index(this.array(), name);
};

},{"indexof":27}],22:[function(require,module,exports){
/**
 * Module dependencies.
 */

var closest = require('closest')
  , event = require('event');

/**
 * Delegate event `type` to `selector`
 * and invoke `fn(e)`. A callback function
 * is returned which may be passed to `.unbind()`.
 *
 * @param {Element} el
 * @param {String} selector
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, selector, type, fn, capture){
  return event.bind(el, type, function(e){
    var target = e.target || e.srcElement;
    e.delegateTarget = closest(target, selector, true, el);
    if (e.delegateTarget) fn.call(el, e);
  }, capture);
};

/**
 * Unbind event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  event.unbind(el, type, fn, capture);
};

},{"closest":23,"event":26}],23:[function(require,module,exports){
var matches = require('matches-selector')

module.exports = function (element, selector, checkYoSelf, root) {
  element = checkYoSelf ? {parentNode: element} : element

  root = root || document

  // Make sure `element !== document` and `element != null`
  // otherwise we get an illegal invocation
  while ((element = element.parentNode) && element !== document) {
    if (matches(element, selector))
      return element
    // After `matches` on the edge case that
    // the selector matches the root
    // (when the root is not the document)
    if (element === root)
      return  
  }
}
},{"matches-selector":24}],24:[function(require,module,exports){
'use strict';

var proto = Element.prototype;
var vendor = proto.matches
  || proto.matchesSelector
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = el.parentNode.querySelectorAll(selector);
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] == el) return true;
  }
  return false;
}
},{}],25:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  _default: [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */

function parse(html) {
  if ('string' != typeof html) throw new TypeError('String expected');
  
  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return document.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = document.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = document.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = document.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

},{}],26:[function(require,module,exports){
var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
    unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
    prefix = bind !== 'addEventListener' ? 'on' : '';

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  el[bind](prefix + type, fn, capture || false);
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  el[unbind](prefix + type, fn, capture || false);
  return fn;
};
},{}],27:[function(require,module,exports){
module.exports = function(arr, obj){
  if (arr.indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],28:[function(require,module,exports){
/**
 * Module dependencies.
 */

var query = require('query');

/**
 * Element prototype.
 */

var proto = Element.prototype;

/**
 * Vendor function.
 */

var vendor = proto.matches
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

/**
 * Expose `match()`.
 */

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = query.all(selector, el.parentNode);
  for (var i = 0; i < nodes.length; ++i) {
    if (nodes[i] == el) return true;
  }
  return false;
}

},{"query":29}],29:[function(require,module,exports){
function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

},{}],30:[function(require,module,exports){

/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

},{}],31:[function(require,module,exports){

/**
 * Properties to ignore appending "px".
 */

var ignore = {
  columnCount: true,
  fillOpacity: true,
  fontWeight: true,
  lineHeight: true,
  opacity: true,
  orphans: true,
  widows: true,
  zIndex: true,
  zoom: true
};

/**
 * Set `el` css values.
 *
 * @param {Element} el
 * @param {Object} obj
 * @return {Element}
 * @api public
 */

module.exports = function(el, obj){
  for (var key in obj) {
    var val = obj[key];
    if ('number' == typeof val && !ignore[key]) val += 'px';
    el.style[key] = val;
  }
  return el;
};

},{}],32:[function(require,module,exports){

/**
 * dependencies
 */

var matches = require('matches-selector');

/**
 * Traverse with the given `el`, `selector` and `len`.
 *
 * @param {String} type
 * @param {Element} el
 * @param {String} selector
 * @param {Number} len
 * @return {Array}
 * @api public
 */

module.exports = function(type, el, selector, len){
  var el = el[type]
    , n = len || 1
    , ret = [];

  if (!el) return ret;

  do {
    if (n == ret.length) break;
    if (1 != el.nodeType) continue;
    if (matches(el, selector)) ret.push(el);
    if (!selector) ret.push(el);
  } while (el = el[type]);

  return ret;
}

},{"matches-selector":28}],33:[function(require,module,exports){
/**
 * Module dependencies.
 */

var typeOf = require('type');

/**
 * Set or get `el`'s' value.
 *
 * @param {Element} el
 * @param {Mixed} val
 * @return {Mixed}
 * @api public
 */

module.exports = function(el, val){
  if (2 == arguments.length) return set(el, val);
  return get(el);
};

/**
 * Get `el`'s value.
 */

function get(el) {
  switch (type(el)) {
    case 'checkbox':
    case 'radio':
      if (el.checked) {
        var attr = el.getAttribute('value');
        return null == attr ? true : attr;
      } else {
        return false;
      }
    case 'radiogroup':
      for (var i = 0, radio; radio = el[i]; i++) {
        if (radio.checked) return radio.value;
      }
      break;
    case 'select':
      var vals = [];
      for (var i = 0, option; option = el.options[i]; i++) {
        if (option.selected) vals.push(option.value);
      }
      return (vals.length===1 ? vals[0] : vals);
      break;
    default:
      return el.value;
  }
}

/**
 * Set `el`'s value.
 */


function set(el, val) {
  switch (type(el)) {
    case 'checkbox':
    case 'radio':
      el.checked = (val === true ? true : (val == el.getAttribute('value')));
      break;
    case 'radiogroup':
      for (var i = 0, radio; radio = el[i]; i++) {
        radio.checked = radio.value === val;
      }
      break;
    case 'select':
      var vals = ('array' == typeOf(val) ? val : [val]), found;
      for (var i = 0, option; option = el.options[i]; i++) {
        found = 0;
        for (var j = 0, v; v = vals[j]; j++){
          found |= v === option.value;
        }
        option.selected = (found === 1);
      }
      break;
    default:
      el.value = val;
  }
}

/**
 * Element type.
 */

function type(el) {
  var group = 'array' == typeOf(el) || 'object' == typeOf(el);
  if (group) el = el[0];
  var name = el.nodeName.toLowerCase();
  var type = el.getAttribute('type');

  if (group && type && 'radio' == type.toLowerCase()) return 'radiogroup';
  if ('input' == name && type && 'checkbox' == type.toLowerCase()) return 'checkbox';
  if ('input' == name && type && 'radio' == type.toLowerCase()) return 'radio';
  if ('select' == name) return 'select';
  return name;
}

},{"type":30}],34:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],35:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],36:[function(require,module,exports){
(function (global){
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3]
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? escape(cap[0])
        : cap[0];
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += escape(this.smartypants(cap[0]));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/--/g, '\u2014')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],37:[function(require,module,exports){
(function (global){
//! moment.js
//! version : 2.9.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {
    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = '2.9.0',
        // the global-scope this is NOT the global object in Node.js
        globalScope = (typeof global !== 'undefined' && (typeof window === 'undefined' || window === global.window)) ? global : this,
        oldGlobalMoment,
        round = Math.round,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for locale config files
        locales = {},

        // extra moment internal properties (plugins register props here)
        momentProperties = [],

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenOffsetMs = /[\+\-]?\d+/, // 1234567890123
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker '+10:00' > ['10', '00'] or '-1530' > ['-', '15', '30']
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
            s: 45,  // seconds to minute
            m: 45,  // minutes to hour
            h: 22,  // hours to day
            d: 26,  // days to month
            M: 11   // months to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.localeData().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.localeData().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.localeData().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.localeData().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.localeData().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            x    : function () {
                return this.valueOf();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        deprecations = {},

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'],

        updateInProgress = false;

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error('Implement me');
        }
    }

    function hasOwnProp(a, b) {
        return hasOwnProperty.call(a, b);
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function printMsg(msg) {
        if (moment.suppressDeprecationWarnings === false &&
                typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        return extend(function () {
            if (firstTime) {
                printMsg(msg);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            printMsg(msg);
            deprecations[name] = true;
        }
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.localeData().ordinal(func.call(this, a), period);
        };
    }

    function monthDiff(a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        return -(wholeMonthDiff + adjust);
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    function meridiemFixWrap(locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // thie is not supposed to happen
            return hour;
        }
    }

    /************************************
        Constructors
    ************************************/

    function Locale() {
    }

    // Moment prototype object
    function Moment(config, skipOverflow) {
        if (skipOverflow !== false) {
            checkOverflow(config);
        }
        copyConfig(this, config);
        this._d = new Date(+config._d);
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            moment.updateOffset(this);
            updateInProgress = false;
        }
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = moment.localeData();

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function copyConfig(to, from) {
        var i, prop, val;

        if (typeof from._isAMomentObject !== 'undefined') {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== 'undefined') {
            to._i = from._i;
        }
        if (typeof from._f !== 'undefined') {
            to._f = from._f;
        }
        if (typeof from._l !== 'undefined') {
            to._l = from._l;
        }
        if (typeof from._strict !== 'undefined') {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== 'undefined') {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== 'undefined') {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== 'undefined') {
            to._offset = from._offset;
        }
        if (typeof from._pf !== 'undefined') {
            to._pf = from._pf;
        }
        if (typeof from._locale !== 'undefined') {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== 'undefined') {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = makeAs(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = moment.duration(val, period);
            addOrSubtractDurationFromMoment(this, dur, direction);
            return this;
        };
    }

    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return Object.prototype.toString.call(input) === '[object Date]' ||
            input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment._locale[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment._locale, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 24 ||
                    (m._a[HOUR] === 24 && (m._a[MINUTE] !== 0 ||
                                           m._a[SECOND] !== 0 ||
                                           m._a[MILLISECOND] !== 0)) ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0 &&
                    m._pf.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        if (!locales[name] && hasModule) {
            try {
                oldLocale = moment.locale();
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we want to undo that for lazy loaded locales
                moment.locale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // Return a moment from input, that is local/utc/utcOffset equivalent to
    // model.
    function makeAs(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (moment.isMoment(input) || isDate(input) ?
                    +input : +moment(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            moment.updateOffset(res, false);
            return res;
        } else {
            return moment(input).local();
        }
    }

    /************************************
        Locale
    ************************************/


    extend(Locale.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
            // Lenient ordinal parsing accepts just a number in addition to
            // number + (possibly) stuff coming from _ordinalParseLenient.
            this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + /\d{1,2}/.source);
        },

        _months : 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName, format, strict) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = moment.utc([2000, i]);
                if (strict && !this._longMonthsParse[i]) {
                    this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                    this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
                }
                if (!strict && !this._monthsParse[i]) {
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                    return i;
                } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                    return i;
                } else if (!strict && this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LTS : 'h:mm:ss A',
            LT : 'h:mm A',
            L : 'MM/DD/YYYY',
            LL : 'MMMM D, YYYY',
            LLL : 'MMMM D, YYYY LT',
            LLLL : 'dddd, MMMM D, YYYY LT'
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },


        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom, now) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom, [now]) : output;
        },

        _relativeTime : {
            future : 'in %s',
            past : '%s ago',
            s : 'a few seconds',
            m : 'a minute',
            mm : '%d minutes',
            h : 'an hour',
            hh : '%d hours',
            d : 'a day',
            dd : '%d days',
            M : 'a month',
            MM : '%d months',
            y : 'a year',
            yy : '%d years'
        },

        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },

        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace('%d', number);
        },
        _ordinal : '%d',
        _ordinalParse : /\d{1,2}/,

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        firstDayOfWeek : function () {
            return this._week.dow;
        },

        firstDayOfYear : function () {
            return this._week.doy;
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '';
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) {
                return parseTokenOneDigit;
            }
            /* falls through */
        case 'SS':
            if (strict) {
                return parseTokenTwoDigits;
            }
            /* falls through */
        case 'SSS':
            if (strict) {
                return parseTokenThreeDigits;
            }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return config._locale._meridiemParse;
        case 'x':
            return parseTokenOffsetMs;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return strict ? config._locale._ordinalParse : config._locale._ordinalParseLenient;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), 'i'));
            return a;
        }
    }

    function utcOffsetFromString(string) {
        string = string || '';
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(
                            input.match(/\d{1,2}/)[0], 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._meridiem = input;
            // config._isPm = config._locale.isPM(input);
            break;
        // HOUR
        case 'h' : // fall through to hh
        case 'hh' :
            config._pf.bigHour = true;
            /* falls through */
        case 'H' : // fall through to HH
        case 'HH' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX OFFSET (MILLISECONDS)
        case 'x':
            config._d = new Date(toInt(input));
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = utcOffsetFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = config._locale.weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day || normalizedInput.date,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._pf.bigHour === true && config._a[HOUR] <= 12) {
            config._pf.bigHour = undefined;
        }
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR],
                config._meridiem);
        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be 'T' or undefined
                    config._f = isoDates[i][0] + (match[6] || ' ');
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += 'Z';
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function makeDateFromInput(config) {
        var input = config._i, matched;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if ((matched = aspNetJsonRegex.exec(input)) !== null) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            dateFromConfig(config);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, locale) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = locale.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(posNegDuration, withoutSuffix, locale) {
        var duration = moment.duration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            years = round(duration.as('y')),

            args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days < relativeTimeThresholds.d && ['dd', days] ||
                months === 1 && ['M'] ||
                months < relativeTimeThresholds.M && ['MM', months] ||
                years === 1 && ['y'] || ['yy', years];

        args[2] = withoutSuffix;
        args[3] = +posNegDuration > 0;
        args[4] = locale;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f,
            res;

        config._locale = config._locale || moment.localeData(config._l);

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (moment.isMoment(input)) {
            return new Moment(input, true);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        res = new Moment(config);
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    moment = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = locale;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso,
            diffRes;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' &&
                ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(moment(duration.from), moment(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function (threshold, limit) {
        if (relativeTimeThresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return relativeTimeThresholds[threshold];
        }
        relativeTimeThresholds[threshold] = limit;
        return true;
    };

    moment.lang = deprecate(
        'moment.lang is deprecated. Use moment.locale instead.',
        function (key, value) {
            return moment.locale(key, value);
        }
    );

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    moment.locale = function (key, values) {
        var data;
        if (key) {
            if (typeof(values) !== 'undefined') {
                data = moment.defineLocale(key, values);
            }
            else {
                data = moment.localeData(key);
            }

            if (data) {
                moment.duration._locale = moment._locale = data;
            }
        }

        return moment._locale._abbr;
    };

    moment.defineLocale = function (name, values) {
        if (values !== null) {
            values.abbr = name;
            if (!locales[name]) {
                locales[name] = new Locale();
            }
            locales[name].set(values);

            // backwards compat for now: also set the locale
            moment.locale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    };

    moment.langData = deprecate(
        'moment.langData is deprecated. Use moment.localeData instead.',
        function (key) {
            return moment.localeData(key);
        }
    );

    // returns locale data
    moment.localeData = function (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return moment._locale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null && hasOwnProp(obj, '_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    moment.isDate = isDate;

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d - ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                if ('function' === typeof Date.prototype.toISOString) {
                    // native implementation is ~50x faster, use it when we can
                    return this.toDate().toISOString();
                } else {
                    return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
                }
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {
            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function (keepLocalTime) {
            return this.utcOffset(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.utcOffset(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.subtract(this._dateUtcOffset(), 'm');
                }
            }
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.localeData().postformat(output);
        },

        add : createAdder(1, 'add'),

        subtract : createAdder(-1, 'subtract'),

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (that.utcOffset() - this.utcOffset()) * 6e4,
                anchor, diff, output, daysAdjust;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month' || units === 'quarter') {
                output = monthDiff(this, that);
                if (units === 'quarter') {
                    output = output / 3;
                } else if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = this - that;
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're locat/utc/offset
            // or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.localeData().calendar(format, this, moment(now)));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.utcOffset() > this.clone().month(0).utcOffset() ||
                this.utcOffset() > this.clone().month(5).utcOffset());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf : function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond') {
                return this;
            }
            return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
        },

        isAfter: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this > +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return inputMs < +this.clone().startOf(units);
            }
        },

        isBefore: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this < +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return +this.clone().endOf(units) < inputMs;
            }
        },

        isBetween: function (from, to, units) {
            return this.isAfter(from, units) && this.isBefore(to, units);
        },

        isSame: function (input, units) {
            var inputMs;
            units = normalizeUnits(units || 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this === +input;
            } else {
                inputMs = +moment(input);
                return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
            }
        },

        min: deprecate(
                 'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        zone : deprecate(
                'moment().zone is deprecated, use moment().utcOffset instead. ' +
                'https://github.com/moment/moment/issues/1779',
                function (input, keepLocalTime) {
                    if (input != null) {
                        if (typeof input !== 'string') {
                            input = -input;
                        }

                        this.utcOffset(input, keepLocalTime);

                        return this;
                    } else {
                        return -this.utcOffset();
                    }
                }
        ),

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        utcOffset : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === 'string') {
                    input = utcOffsetFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._dateUtcOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.add(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(input - offset, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }

                return this;
            } else {
                return this._isUTC ? offset : this._dateUtcOffset();
            }
        },

        isLocal : function () {
            return !this._isUTC;
        },

        isUtcOffset : function () {
            return this._isUTC;
        },

        isUtc : function () {
            return this._isUTC && this._offset === 0;
        },

        zoneAbbr : function () {
            return this._isUTC ? 'UTC' : '';
        },

        zoneName : function () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        },

        parseZone : function () {
            if (this._tzm) {
                this.utcOffset(this._tzm);
            } else if (typeof this._i === 'string') {
                this.utcOffset(utcOffsetFromString(this._i));
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).utcOffset();
            }

            return (this.utcOffset() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        week : function (input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            var unit;
            if (typeof units === 'object') {
                for (unit in units) {
                    this.set(unit, units[unit]);
                }
            }
            else {
                units = normalizeUnits(units);
                if (typeof this[units] === 'function') {
                    this[units](value);
                }
            }
            return this;
        },

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        locale : function (key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = moment.localeData(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        },

        lang : deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        ),

        localeData : function () {
            return this._locale;
        },

        _dateUtcOffset : function () {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return -Math.round(this._d.getTimezoneOffset() / 15) * 15;
        }

    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate('dates accessor is deprecated. Use date instead.', makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate('years accessor is deprecated. Use year instead.', makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    // alias isUtc for dev-friendliness
    moment.fn.isUTC = moment.fn.isUtc;

    /************************************
        Duration Prototype
    ************************************/


    function daysToYears (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    function yearsToDays (years) {
        // years * 365 + absRound(years / 4) -
        //     absRound(years / 100) + absRound(years / 400);
        return years * 146097 / 400;
    }

    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years = 0;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);

            // Accurately convert days to years, assume start from year 0.
            years = absRound(daysToYears(days));
            days -= absRound(yearsToDays(years));

            // 30 days to a month
            // TODO (iskren): Use anchor date (like 1st Jan) to compute this.
            months += absRound(days / 30);
            days %= 30;

            // 12 months -> 1 year
            years += absRound(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;
        },

        abs : function () {
            this._milliseconds = Math.abs(this._milliseconds);
            this._days = Math.abs(this._days);
            this._months = Math.abs(this._months);

            this._data.milliseconds = Math.abs(this._data.milliseconds);
            this._data.seconds = Math.abs(this._data.seconds);
            this._data.minutes = Math.abs(this._data.minutes);
            this._data.hours = Math.abs(this._data.hours);
            this._data.months = Math.abs(this._data.months);
            this._data.years = Math.abs(this._data.years);

            return this;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var output = relativeTime(this, !withSuffix, this.localeData());

            if (withSuffix) {
                output = this.localeData().pastFuture(+this, output);
            }

            return this.localeData().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            var days, months;
            units = normalizeUnits(units);

            if (units === 'month' || units === 'year') {
                days = this._days + this._milliseconds / 864e5;
                months = this._months + daysToYears(days) * 12;
                return units === 'month' ? months : months / 12;
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(yearsToDays(this._months / 12));
                switch (units) {
                    case 'week': return days / 7 + this._milliseconds / 6048e5;
                    case 'day': return days + this._milliseconds / 864e5;
                    case 'hour': return days * 24 + this._milliseconds / 36e5;
                    case 'minute': return days * 24 * 60 + this._milliseconds / 6e4;
                    case 'second': return days * 24 * 60 * 60 + this._milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond': return Math.floor(days * 24 * 60 * 60 * 1000) + this._milliseconds;
                    default: throw new Error('Unknown unit ' + units);
                }
            }
        },

        lang : moment.fn.lang,
        locale : moment.fn.locale,

        toIsoString : deprecate(
            'toIsoString() is deprecated. Please use toISOString() instead ' +
            '(notice the capitals)',
            function () {
                return this.toISOString();
            }
        ),

        toISOString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        },

        localeData : function () {
            return this._locale;
        },

        toJSON : function () {
            return this.toISOString();
        }
    });

    moment.duration.fn.toString = moment.duration.fn.toISOString;

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    for (i in unitMillisecondFactors) {
        if (hasOwnProp(unitMillisecondFactors, i)) {
            makeDurationGetter(i.toLowerCase());
        }
    }

    moment.duration.fn.asMilliseconds = function () {
        return this.as('ms');
    };
    moment.duration.fn.asSeconds = function () {
        return this.as('s');
    };
    moment.duration.fn.asMinutes = function () {
        return this.as('m');
    };
    moment.duration.fn.asHours = function () {
        return this.as('h');
    };
    moment.duration.fn.asDays = function () {
        return this.as('d');
    };
    moment.duration.fn.asWeeks = function () {
        return this.as('weeks');
    };
    moment.duration.fn.asMonths = function () {
        return this.as('M');
    };
    moment.duration.fn.asYears = function () {
        return this.as('y');
    };

    /************************************
        Default Locale
    ************************************/


    // Set default locale, other locale will inherit from English.
    moment.locale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LOCALES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    'Accessing Moment through the global scope is ' +
                    'deprecated, and will be removed in an upcoming ' +
                    'release.',
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === 'function' && define.amd) {
        define(function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQtc3JjL2NvbXBvbmVudHMvY29uc29sZS5qcyIsImNsaWVudC1zcmMvY29tcG9uZW50cy9lZGl0b3IuanMiLCJjbGllbnQtc3JjL2NvbXBvbmVudHMvZW50aXR5LXNlbGVjdG9yLmpzIiwiY2xpZW50LXNyYy9jb21wb25lbnRzL2luZm8uanMiLCJjbGllbnQtc3JjL2NvbXBvbmVudHMvbGF5b3V0LmpzIiwiY2xpZW50LXNyYy9jb21wb25lbnRzL21vZGFsLmpzIiwiY2xpZW50LXNyYy9jb21wb25lbnRzL3ByZXZpZXdlci5qcyIsImNsaWVudC1zcmMvY29tcG9uZW50cy9zZXNzaW9ucy5qcyIsImNsaWVudC1zcmMvY29tcG9uZW50cy90b3AtbWVudS5qcyIsImNsaWVudC1zcmMvZW50cnkuanMiLCJjbGllbnQtc3JjL2xpYi9maWxlLXN5c3RlbS5qcyIsImNsaWVudC1zcmMvbGliL3NvY2tzLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVxdWVzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdGUvbGliL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0ZS9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZG9taWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2ZpbGVzaXplL2xpYi9maWxlc2l6ZS5qcyIsIm5vZGVfbW9kdWxlcy9mb3JlYWNoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dtLWdhdGhlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ncmVlbi1tZXNhLWRvbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ncmVlbi1tZXNhLWRvbS9ub2RlX21vZHVsZXMvY29tcG9uZW50LWNsYXNzZXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3JlZW4tbWVzYS1kb20vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC1kZWxlZ2F0ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ncmVlbi1tZXNhLWRvbS9ub2RlX21vZHVsZXMvY29tcG9uZW50LWRlbGVnYXRlL25vZGVfbW9kdWxlcy9kaXNjb3JlLWNsb3Nlc3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3JlZW4tbWVzYS1kb20vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC1kZWxlZ2F0ZS9ub2RlX21vZHVsZXMvZGlzY29yZS1jbG9zZXN0L25vZGVfbW9kdWxlcy9tYXRjaGVzLXNlbGVjdG9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dyZWVuLW1lc2EtZG9tL25vZGVfbW9kdWxlcy9jb21wb25lbnQtZG9taWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dyZWVuLW1lc2EtZG9tL25vZGVfbW9kdWxlcy9jb21wb25lbnQtZXZlbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3JlZW4tbWVzYS1kb20vbm9kZV9tb2R1bGVzL2NvbXBvbmVudC1pbmRleG9mL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dyZWVuLW1lc2EtZG9tL25vZGVfbW9kdWxlcy9jb21wb25lbnQtbWF0Y2hlcy1zZWxlY3Rvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ncmVlbi1tZXNhLWRvbS9ub2RlX21vZHVsZXMvY29tcG9uZW50LXF1ZXJ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dyZWVuLW1lc2EtZG9tL25vZGVfbW9kdWxlcy9jb21wb25lbnQtdHlwZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ncmVlbi1tZXNhLWRvbS9ub2RlX21vZHVsZXMvZ3JlZW4tbWVzYS1jc3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3JlZW4tbWVzYS1kb20vbm9kZV9tb2R1bGVzL2dyZWVuLW1lc2EtdHJhdmVyc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3JlZW4tbWVzYS1kb20vbm9kZV9tb2R1bGVzL2dyZWVuLW1lc2EtdmFsdWUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3JlZW4tbWVzYS1kb20vbm9kZV9tb2R1bGVzL3RyaW0vaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXJrZWQvbGliL21hcmtlZC5qcyIsIm5vZGVfbW9kdWxlcy9tb21lbnQvbW9tZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuMEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDajNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3h2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50Jyk7XG5cbnZhciBib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsb2cgOiBmdW5jdGlvbiAoc3RyKXtcbiAgICBib3guaW5uZXJIVE1MICs9IFwiPHA+PGVtPlwiICsgbW9tZW50KCkuZm9ybWF0KCdoOm1tOnNzIGEnKStcIjwvZW0+OiBcIiArIHN0ciArIFwiPC9wPlwiO1xuICAgIGJveC5wYXJlbnROb2RlLnNjcm9sbFRvcCA9IGJveC5wYXJlbnROb2RlLnNjcm9sbEhlaWdodDtcbiAgfSxcbiAgZXJyb3IgOiBmdW5jdGlvbiAoc3RyKXtcbiAgICBib3guaW5uZXJIVE1MICs9IFwiPHAgY2xhc3M9J2Vycm9yJz48ZW0+XCIgKyBtb21lbnQoKS5mb3JtYXQoJ2g6bW06c3MgYScpK1wiPC9lbT46IFwiICsgc3RyICsgXCI8L3A+XCI7XG4gICAgYm94LnBhcmVudE5vZGUuc2Nyb2xsVG9wID0gYm94LnBhcmVudE5vZGUuc2Nyb2xsSGVpZ2h0OyBcbiAgfSxcbiAgYXBwZW5kVG8gOiBmdW5jdGlvbiAoZWxlbWVudCl7XG5cbiAgICBlbGVtZW50LmFwcGVuZENoaWxkKGJveCk7XG4gICAgZWxlbWVudC5zdHlsZS5PdmVyZmxvd1kgPSBcInNjcm9sbFwiO1xuICAgIGVsZW1lbnQuc3R5bGUuT3ZlcmZsb3dYID0gXCJoaWRkZW5cIjtcblxuICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMuZWxlbWVudCA9IGJveDtcblxuIiwiLypcbiAgXG4gIFNpbXBsZSB3cmFwcGVyIGFyb3VuZCBBQ0UuIEl0IHRyaWdnZXJzICdzYXZlJyBzaWduYWxzIGFuZCBjYW4gb25seSBlZGl0IG9uZSB0aGluZyBhdCBvbmNlLlxuICBTb21ldGhpbmcgZWxzZSBuZWVkcyB0byBkZWFsIHdpdGggdXBkYXRpbmcgdGhpcy5cblxuKi9cblxudmFyIGFjZSA9IHJlcXVpcmUoJ2JyYWNlJyk7XG5yZXF1aXJlKCdicmFjZS9tb2RlL2pzb24nKTtcbnJlcXVpcmUoJ2JyYWNlL21vZGUvbWFya2Rvd24nKTtcbnJlcXVpcmUoJ2JyYWNlL3RoZW1lL21vbm9rYWknKTtcblxudmFyIGRvbWlmeSA9IHJlcXVpcmUoJ2RvbWlmeScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjb250ZW50VmlldywgbGF5b3V0KXtcblxuICB2YXIgZW1pdHRlciA9IG5ldyAocmVxdWlyZSgnZXZlbnRzJykpLkV2ZW50RW1pdHRlcigpO1xuXG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gIGVsZW1lbnQuc3R5bGUud2lkdGggPSBjb250ZW50Vmlldy5zaXplKCkueCArIFwicHhcIjtcbiAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBjb250ZW50Vmlldy5zaXplKCkueSArIFwicHhcIjtcbiAgZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgZWxlbWVudC5zdHlsZS50b3AgPSBcIjBweFwiO1xuICBlbGVtZW50LnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXG4gIGNvbnRlbnRWaWV3LmFkZEVsZW1lbnQoZWxlbWVudCk7XG5cbiAgdmFyIGVkaXRvciA9IGFjZS5lZGl0KGVsZW1lbnQpO1xuICBlZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VXNlV3JhcE1vZGUodHJ1ZSk7XG4gIGVkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuXG4gIGxheW91dC5vbigncmVzaXplJywgZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpe1xuXG4gICAgZWxlbWVudC5zdHlsZS53aWR0aCA9IGNvbnRlbnRWaWV3LnNpemUoKS54ICsgXCJweFwiO1xuICAgIGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gY29udGVudFZpZXcuc2l6ZSgpLnkgKyBcInB4XCI7XG4gICAgZWRpdG9yLnJlc2l6ZSgpO1xuXG4gIH0pO1xuXG4gIC8vIGhpZGUgdGhlIGVkaXRvciwgc2V0IHRoZSBjdXJyZW50bHkgYWN0aXZlIFxuICB2YXIgY3VycmVudEVudGl0eSA9IGZhbHNlO1xuICB2YXIgb3JpZ2luYWxCb2R5ID0gZmFsc2U7XG4gIHZhciBjdXJyZW50Qm9keSA9IGZhbHNlO1xuICB2YXIgaXNEaXJ0eSA9IGZhbHNlO1xuXG4gIGVkaXRvci5vbignY2hhbmdlJywgZnVuY3Rpb24gKCl7XG5cbiAgICBpZiAoY3VycmVudEVudGl0eSl7XG5cbiAgICAgIGVtaXR0ZXIuZW1pdCgnY2hhbmdlJywgY3VycmVudEVudGl0eSwgZWRpdG9yLmdldFZhbHVlKCkpO1xuXG4gICAgfVxuXG4gIH0pO1xuXG4gIHZhciBjdXJyZW50RW50aXR5ID0gZmFsc2U7XG5cbiAgLy8gZWRpdCB0aGlzIGNvbnRlbnQuLi5cbiAgZW1pdHRlci5vcGVuID0gZnVuY3Rpb24gZWRpdFNlc3Npb24gKGVudGl0eSwgYm9keSl7XG5cbiAgICBjdXJyZW50RW50aXR5ID0gZW50aXR5O1xuICAgIC8vIG1ha2UgdGhlIGVkaXRvciB2aXNpYmxlLlxuICAgIGlmIChlbnRpdHkubWltZSA9PT0gXCJ0ZXh0L3gtbWFya2Rvd25cIil7XG4gICAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoJ2FjZS9tb2RlL21hcmtkb3duJyk7XG4gICAgfSBlbHNlIGlmIChlbnRpdHkubWltZSA9PT0gXCJhcHBsaWNhdGlvbi9qc29uXCIpe1xuICAgICAgZWRpdG9yLmdldFNlc3Npb24oKS5zZXRNb2RlKCdhY2UvbW9kZS9qc29uJyk7XG4gICAgfVxuXG4gICAgZWRpdG9yLnNldFZhbHVlKGJvZHksIDEpO1xuICAgIGVkaXRvci5mb2N1cygpO1xuXG4gICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcblxuICB9O1xuXG4gIGVtaXR0ZXIucmVhZCA9IGZ1bmN0aW9uIHJlYWRTZXNzaW9uICgpe1xuICAgIHJldHVybiBlZGl0b3IuZ2V0VmFsdWUoKTtcbiAgfVxuICBlbWl0dGVyLndyaXRlID0gZnVuY3Rpb24gd3JpdGVTZXNzaW9uKGJvZHkpe1xuICAgIGVkaXRvci5zZXRWYWx1ZShib2R5LCAxKTtcbiAgICBlZGl0b3IuZm9jdXMoKTtcbiAgfVxuXG4gIGVtaXR0ZXIuZm9jdXMgPSBmdW5jdGlvbiAoKXtcbiAgICBlZGl0b3IuZm9jdXMoKTtcbiAgfVxuXG4gIC8vIG5vIHNlc3Npb25zIHRvIGVkaXQuLiBnZXQgcmlkLiBcbiAgZW1pdHRlci5jbG9zZSA9IGZ1bmN0aW9uICgpe1xuICAgIC8vIGhleSwgc28sIGRvIHdlIHdhbnQgdG8gXG4gICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG5cbiAgfVxuXG4gIHJldHVybiBlbWl0dGVyO1xuXG59IiwidmFyIGRvbWlmeSA9IHJlcXVpcmUoJ2RvbWlmeScpO1xudmFyIGRvbSA9IHJlcXVpcmUoJ2dyZWVuLW1lc2EtZG9tJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHZmcywgYXBwLCBib3gpe1xuXG4gIHZhciBmaWxlcyA9IGRvbWlmeSgnPHVsPjwvdWw+JylcbiAgZmlsZXMuY2xhc3NOYW1lID0gXCJib3gtaW5uZXIgZmlsZXNcIjtcbiAgYm94LmFkZEVsZW1lbnQoZmlsZXMpO1xuXG4gIC8vIHRoaXMgZXZlbnQgZ2V0cyB0cmlnZ2VyZWQgd2hlbmV2ZXIgdGhlIHZpcnR1YWwgZmlsZSBzeXN0ZW0gaGFzIGZpbmlzaGVkIHN5bmNocm9uaXNpbmcgd2l0aCB0aGUgc2VydmVyXG4gIHZmcy5vbignc3luYycsIGZ1bmN0aW9uIChwYXRoKXtcblxuICAgIHZmcy5nZXRBbGwocmVmcmVzaFRyZWUpO1xuXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGRlbGV0ZUNoaWxkcmVuIChub2RlKXtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbiAoKXsgdGhpcy5yZW1vdmUoKTsgdGhpcy5vbmNsaWNrID0gbnVsbDsgfTtcbiAgICB2YXIgZm5zID0gW107XG4gICAgZm9yRWFjaC5jYWxsKCBub2RlLmNoaWxkTm9kZXMgLCBmdW5jdGlvbiAobm9kZSl7IFxuICAgICAgZm5zLnB1c2goZm4uYmluZChub2RlKSlcbiAgICB9KTtcbiAgICBmb3JFYWNoLmNhbGwoZm5zLCBmdW5jdGlvbihmbil7Zm4oKX0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVQgKG8pe1xuICAgIHJldHVybiAnPGxpIGNsYXNzPVwiZmlsZVwiPicgK1xuICAgICAgICAnPHNwYW4gY2xhc3M9XCJ0eXBjbiB0eXBjbi1kb2N1bWVudC10ZXh0XCI+PC9zcGFuPicgK1xuICAgICAgICAnPGEgaHJlZj1cIiNcIj4nICsgXG4gICAgICAgICAgby5uYW1lICtcbiAgICAgICAgJzwvYT4nICtcbiAgICAgICAgJzxzcGFuIGNsYXNzPVwidHlwY24gdHlwY24taG92ZXIgdHlwY24tZXllLW91dGxpbmVcIj48L3NwYW4+JyArIFxuICAgICAgICAnPHNwYW4gY2xhc3M9XCJ0eXBjbiB0eXBjbi1ob3ZlciB0eXBjbi1pbmZvLWxhcmdlXCI+PC9zcGFuPicgKyBcbiAgICAgICc8L2xpPic7XG4gIH1cblxuICBmdW5jdGlvbiBmb2xkZXJUIChvKXtcbiAgICByZXR1cm4gJzxsaT4nICtcbiAgICAgICAgJzxzcGFuIGNsYXNzPVwidHlwY24gdHlwY24tZm9sZGVyXCI+PC9zcGFuPicgK1xuICAgICAgICAnPHNwYW4gY2xhc3M9XCJ0eXBjbiB0eXBjbi1mb2xkZXItb3BlblwiPjwvc3Bhbj4nICtcbiAgICAgICAgJzxhIGhyZWY9XCIjXCI+JyArIFxuICAgICAgICAgIG8ubmFtZSArIFxuICAgICAgICAnPC9hPicgK1xuICAgICAgICAnPHNwYW4gY2xhc3M9XCJ0eXBjbiB0eXBjbi1ob3ZlciB0eXBjbi1kb2N1bWVudC1hZGRcIj48L3NwYW4+JyArXG4gICAgICAgICc8c3BhbiBjbGFzcz1cInR5cGNuIHR5cGNuLWhvdmVyIHR5cGNuLWZvbGRlci1hZGRcIj48L3NwYW4+JyArIFxuICAgICAgICAnPHNwYW4gY2xhc3M9XCJ0eXBjbiB0eXBjbi1ob3ZlciB0eXBjbi1pbmZvLWxhcmdlXCI+PC9zcGFuPicgKyBcbiAgICAgICc8L2xpPic7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZnJlc2hUcmVlICh0cmVlKXtcblxuICAgIC8vZGVsZXRlQ2hpbGRyZW4oZmlsZXMpO1xuXG4gICAgZG9tKCdsaScsIGZpbGVzKS5yZW1vdmUoKTtcbiAgICB2YXIgJGZpbGVzID0gZG9tKGZpbGVzKTtcblxuICAgIGZ1bmN0aW9uIHNob3dDb250ZW50cyAodHJlZSwgJHBhcmVudCwgbGV2ZWwpe1xuXG4gICAgICAvL3ZhciBlbCA9IGRvbWlmeShuZXdGb2xkZXIoKSk7XG4gICAgLy8gICRuZXdGb2xkZXIgPSBkb20oJ2EnLCBlbCk7XG4gICAgIC8vICRwYXJlbnQuYXBwZW5kKGVsKTtcblxuICAgICAgdHJlZS5mb3JFYWNoKGZ1bmN0aW9uIChlbnRpdHkpe1xuXG4gICAgICAgIHZhciBlbCwgJGEsICR1bCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChlbnRpdHkudHlwZSA9PT0gXCJmaWxlXCIpe1xuXG4gICAgICAgICAgZWwgPSBkb21pZnkoZmlsZVQoZW50aXR5KSk7XG4gICAgICAgICAgJGEgPSBkb20oJ2EnLCBlbCk7XG5cbiAgICAgICAgICAkcHJldmlldyA9IGRvbSgnc3Bhbi50eXBjbi1leWUtb3V0bGluZScsIGVsKTtcbiAgICAgICAgICAkaW5mbyA9IGRvbSgnc3Bhbi50eXBjbi1pbmZvLWxhcmdlJywgZWwpO1xuICAgICAgICAgICRkZWxldGUgPSBkb20oJ3NwYW4udHlwY24tdHJhc2gnLCBlbCk7XG5cbiAgICAgICAgICAkYS5vbignbW91c2V1cCcsIChmdW5jdGlvbiAoZW50aXR5LCAkZWwsIGV2ZW50KXtcblxuICAgICAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSAxKXtcblxuICAgICAgICAgICAgICBhcHAuZW1pdCgnZWRpdC1lbnRpdHknLCBlbnRpdHkucGF0aCk7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQud2hpY2ggPT09IDMpe1xuXG4gICAgICAgICAgICAgIGZpbGVDb250ZXh0TWVudShlbnRpdHksICRlbCk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0pLmJpbmQoe30sIGVudGl0eSwgZG9tKGVsKSkpXG5cbiAgICAgICAgICAkcHJldmlldy5vbignY2xpY2snLCAoZnVuY3Rpb24gKGVudGl0eSwgZXZlbnQpe1xuXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBhcHAuZW1pdCgncHJldmlldy1lbnRpdHknLCBlbnRpdHkucGF0aCk7XG5cbiAgICAgICAgICB9KS5iaW5kKHt9LCBlbnRpdHkpKTtcblxuICAgICAgICAgICRpbmZvLm9uKCdjbGljaycsIChmdW5jdGlvbiAoZW50aXR5LCBldmVudCl7XG5cbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGFwcC5lbWl0KCdlZGl0LWVudGl0eS1pbmZvJywgZW50aXR5LnBhdGgpO1xuXG4gICAgICAgICAgfSkuYmluZCh7fSwgZW50aXR5KSk7XG5cblxuICAgICAgICB9IGVsc2UgaWYgKGVudGl0eS50eXBlID09PSBcImZvbGRlclwiKXtcblxuICAgICAgICAgIGVsID0gZG9taWZ5KGZvbGRlclQoZW50aXR5KSk7XG4gICAgICAgICAgJGEgPSBkb20oJ2EnLCBlbCk7XG4gICAgICAgICAgXG4gICAgICAgICAgJHVsID0gZG9tKCc8dWwgY2xhc3M9XCJsZXZlbC0nICsgKGxldmVsICsgMSkrICdcIj48L3VsPicpO1xuXG4gICAgICAgICAgJGEub24oJ21vdXNldXAnLCAoZnVuY3Rpb24oZW50aXR5LCAkZWwsICR1bCwgZXZlbnQpe1xuXG4gICAgICAgICAgICBpZiAoZXZlbnQud2hpY2ggPT09IDEpe1xuICAgICAgICAgICAgICAkZWwudG9nZ2xlQ2xhc3MoJ29wZW4nKTtcbiAgICAgICAgICAgICAgJHVsLnRvZ2dsZUNsYXNzKCdvcGVuJyk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0pLmJpbmQoe30sIGVudGl0eSwgZG9tKGVsKSwgJHVsKSk7XG5cblxuXG4gICAgICAgICAgc2hvd0NvbnRlbnRzKGVudGl0eS5jb250ZW50cywgJHVsLCBsZXZlbCArIDEpO1xuXG4gICAgICAgIH1cblxuICAgICAgICAkcGFyZW50LmFwcGVuZChlbCk7XG4gICAgICAgIGlmICgkdWwpe1xuICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCR1bCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBzaG93Q29udGVudHModHJlZSwgJGZpbGVzLCAwKTtcblxuICAgIGRvbSgndWwuZmlsZXMgID4gbGknLCBib3guZWxlbWVudCkuYWRkQ2xhc3MoJ29wZW4nKTtcbiAgICBkb20oJ3VsLmZpbGVzID4gdWwubGV2ZWwtMScsIGJveC5lbGVtZW50KS5hZGRDbGFzcygnb3BlbicpO1xuXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlQ29udGV4dE1lbnUoZW50aXR5LCAkZWwpe1xuXG4gICAgY29uc29sZS5sb2coJ0NvbnRlbnQgbWVudSBub3QgaW1wbGVtZW50ZWQnKTtcblxuICB9XG5cbn07IiwiLypcbiAgXG4gIFNpbXBsZSB3cmFwcGVyIGFyb3VuZCBBQ0UuIEl0IHRyaWdnZXJzICdzYXZlJyBzaWduYWxzIGFuZCBjYW4gb25seSBlZGl0IG9uZSB0aGluZyBhdCBvbmNlLlxuICBTb21ldGhpbmcgZWxzZSBuZWVkcyB0byBkZWFsIHdpdGggdXBkYXRpbmcgdGhpcy5cblxuKi9cblxudmFyIGRvbWlmeSA9IHJlcXVpcmUoJ2RvbWlmeScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjb250ZW50VmlldywgbGF5b3V0KXtcblxuICB2YXIgc3RhY2sgPSBbXTtcblxuICB2YXIgZW1pdHRlciA9IG5ldyAocmVxdWlyZSgnZXZlbnRzJykpLkV2ZW50RW1pdHRlcigpO1xuXG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gIGVsZW1lbnQuc3R5bGUud2lkdGggPSBjb250ZW50Vmlldy5zaXplKCkueCArIFwicHhcIjtcbiAgZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBjb250ZW50Vmlldy5zaXplKCkueSArIFwicHhcIjtcbiAgZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgZWxlbWVudC5zdHlsZS50b3AgPSBcIjBweFwiO1xuICBlbGVtZW50LnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXG4gIGNvbnRlbnRWaWV3LmFkZEVsZW1lbnQoZWxlbWVudCk7XG5cbiAgLypcbiAgdmFyIGVkaXRvciA9IGFjZS5lZGl0KGVsZW1lbnQpO1xuICAvL2VkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZSgnYWNlL21vZGUvbWFya2Rvd24nKTtcbiAgZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFVzZVdyYXBNb2RlKHRydWUpO1xuICBlZGl0b3Iuc2V0U2hvd1ByaW50TWFyZ2luKGZhbHNlKTtcbiAgKi9cblxuICBsYXlvdXQub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KXtcblxuICAgIGVsZW1lbnQuc3R5bGUud2lkdGggPSBjb250ZW50Vmlldy5zaXplKCkueCArIFwicHhcIjtcbiAgICBlbGVtZW50LnN0eWxlLmhlaWdodCA9IGNvbnRlbnRWaWV3LnNpemUoKS55ICsgXCJweFwiO1xuXG4gIH0pO1xuXG4gIC8vIGhpZGUgdGhlIGVkaXRvciwgc2V0IHRoZSBjdXJyZW50bHkgYWN0aXZlIFxuICAvKlxuICB2YXIgY3VycmVudEVudGl0eSA9IGZhbHNlO1xuICB2YXIgb3JpZ2luYWxCb2R5ID0gZmFsc2U7XG4gIHZhciBjdXJyZW50Qm9keSA9IGZhbHNlO1xuICB2YXIgaXNEaXJ0eSA9IGZhbHNlO1xuICAqL1xuXG4gICAvLyBlZGl0IHRoaXMgY29udGVudC4uLlxuICBlbWl0dGVyLm9wZW4gPSBmdW5jdGlvbiBlZGl0U2Vzc2lvbiAoZW50aXR5LCBib2R5LCBvcmdCb2R5KXtcblxuICAgIGVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XG5cbiAgfTtcblxuICBlbWl0dGVyLnJlYWQgPSBmdW5jdGlvbiByZWFkU2Vzc2lvbiAoKXtcbiAgICAvL3JldHVybiBlZGl0b3IuZ2V0VmFsdWUoKTtcbiAgfVxuICAvLyBtZXRob2QgZm9yIGxldHRpbmcgdGhlIGVkaXRvciBrbm93IHRoYXQgdGhlIGNvbnRlbnQgaGFzIGJlZW4gcGVyc2lzdGVkXG4gIGVtaXR0ZXIuc3luY2VkID0gZnVuY3Rpb24gbWFya0FzU3luY2hlZChlbnRpdHkpe1xuXG5cbiAgfTtcblxuICAvLyBubyBzZXNzaW9ucyB0byBlZGl0Li4gZ2V0IHJpZC4gXG4gIGVtaXR0ZXIuY2xvc2UgPSBmdW5jdGlvbiAoKXtcbiAgICAvLyBoZXksIHNvLCBkbyB3ZSB3YW50IHRvIFxuICAgIGVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuXG5cbiAgfVxuXG4gIHJldHVybiBlbWl0dGVyO1xuXG5cbn0iLCJ2YXIgJCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IuYmluZChkb2N1bWVudCk7XG52YXIgY29uc29sZSA9IHJlcXVpcmUoJy4vY29uc29sZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNjcmVlbkluaXRpYWxpc2VyICgpe1xuXG4gIC8qXG4gICAgICAtLXRvcCBtZW51LS0tLS0tLS0tLS0tLVxuICAgICAgLW4tLS10YWJzLS0tLS0tLS0tLS0tLS1cbiAgICAgIC1hLS0gICAgICAgICAgICAgICAgICAtXG4gICAgICAtdi0tIGVkaXQgd2luZG93ICAgICAgLVxuICAgICAgLSAtLSAgICAgICAgICAgICAgICAgIC1cbiAgICAgIC0tZm9vdGVyLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgdmFyIGVtaXR0ZXIgPSBuZXcgKHJlcXVpcmUoJ2V2ZW50cycpKS5FdmVudEVtaXR0ZXI7XG5cbiAgLy8gaGVpZ2h0cyBjb25maWcuLiBcbiAgdmFyIHRvcE1lbnVIZWlnaHQgPSAzMDtcbiAgdmFyIGZpbGVOYXZpZ2F0aW9uV2lkdGggPSAzMDA7XG4gIHZhciBlZGl0b3JUYWJIZWlnaHQgPSAyNTtcbiAgdmFyIGNvbnNvbGVIZWlnaHQgPSAxMDA7XG5cbiAgLy8gc29tZSBjc3MgY2xhc3NlcyBjb25maWcuLi4gXG4gIHZhciBmaWxlTmF2aWdhdGlvbkNsYXNzID0gJ2ZpbGUtbmF2JztcbiAgdmFyIHBhZ2VDbGFzcyA9ICdwYWdlJztcbiAgdmFyIHRvcE1lbnVDbGFzcyA9ICd0b3AtbWVudSc7XG4gIHZhciBlZGl0b3JXcmFwcGVyQ2xhc3MgPSAnY29udGVudC12aWV3JztcbiAgdmFyIGVkaXRvclRhYnNDbGFzcyA9ICd0YWJzJztcbiAgdmFyIGVkaXRvclZpZXdDbGFzcyA9ICdlZGl0b3InO1xuICB2YXIgY29uc29sZUNsYXNzID0gJ2NvbnNvbGUnO1xuXG4gIC8vIGNyZWF0ZSBhbiBvdXRlciB3cmFwcGVyLi5cbiAgdmFyIHBhZ2UgPSBjcmVhdGVCb3gocGFnZUNsYXNzKTtcbiAgcGFnZS5lbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcblxuICB2YXIgdG9wTWVudSA9IGNyZWF0ZUJveCh0b3BNZW51Q2xhc3MpO1xuICBwYWdlLmFkZEJveCh0b3BNZW51KTtcblxuICB2YXIgZmlsZU5hdmlnYXRpb24gPSBjcmVhdGVCb3goZmlsZU5hdmlnYXRpb25DbGFzcyk7XG4gIHBhZ2UuYWRkQm94KGZpbGVOYXZpZ2F0aW9uKTtcblxuICB2YXIgZWRpdG9yV3JhcHBlciA9IGNyZWF0ZUJveChlZGl0b3JXcmFwcGVyQ2xhc3MpO1xuICBwYWdlLmFkZEJveChlZGl0b3JXcmFwcGVyKTtcblxuICB2YXIgZWRpdG9yVGFicyA9IGNyZWF0ZUJveChlZGl0b3JUYWJzQ2xhc3MpO1xuICBlZGl0b3JXcmFwcGVyLmFkZEJveChlZGl0b3JUYWJzKTtcblxuICB2YXIgZWRpdG9yVmlldyA9IGNyZWF0ZUJveChlZGl0b3JWaWV3Q2xhc3MpO1xuICBlZGl0b3JXcmFwcGVyLmFkZEJveChlZGl0b3JWaWV3KTtcblxuICB2YXIgY29uc29sZVZpZXcgPSBjcmVhdGVCb3goY29uc29sZUNsYXNzKTtcbiAgcGFnZS5hZGRCb3goY29uc29sZVZpZXcpO1xuXG4gIHJlcXVpcmUoJy4vY29uc29sZS5qcycpLmFwcGVuZFRvKGNvbnNvbGVWaWV3LmVsZW1lbnQpO1xuXG4gIC8vY29uc29sZVZpZXcuYWRkRWxlbWVudChjb25zb2xlLmVsZW1lbnQpO1xuXG4gIC8vIG5vdyBhcHBlbmQgdG8gdGhlIGFjdHVhbCBib2R5Li4uXG4gIHBhZ2UuYXBwZW5kVG9FbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKSk7XG5cbiAgdmFyIGdyID0gKDEgKyBNYXRoLnNxcnQoNSkpIC8gMjtcbiAgLy8gbWFrZSBzdXJlIHdlIGhhdmUgYSBoYW5kbGVyLi4uXG4gIGZ1bmN0aW9uIGhhbmRsZVJlc2l6ZSAoZSl7XG5cbiAgICB2YXIgaW5uZXJXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuICAgIHZhciBpbm5lckhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgIGZpbGVOYXZpZ2F0aW9uV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAtICh3aW5kb3cuaW5uZXJXaWR0aCAvIGdyKTtcblxuICAgIHBhZ2Uuc2l6ZShpbm5lcldpZHRoLCBpbm5lckhlaWdodCk7XG4gICAgcGFnZS5wb3NpdGlvbigwLCAwKTtcblxuICAgIHRvcE1lbnUuc2l6ZShpbm5lcldpZHRoLCB0b3BNZW51SGVpZ2h0KTtcbiAgICB0b3BNZW51LnBvc2l0aW9uKDAsIDApO1xuXG4gICAgY29uc29sZVZpZXcuc2l6ZShpbm5lcldpZHRoLCBjb25zb2xlSGVpZ2h0KTtcbiAgICBjb25zb2xlVmlldy5wb3NpdGlvbigwLCBpbm5lckhlaWdodCAtIGNvbnNvbGVIZWlnaHQpO1xuXG4gICAgZmlsZU5hdmlnYXRpb24uc2l6ZShmaWxlTmF2aWdhdGlvbldpZHRoIC0gMTAsIGlubmVySGVpZ2h0IC0gdG9wTWVudS5zaXplKCkueSAtIGNvbnNvbGVWaWV3LnNpemUoKS55IC0gMTApO1xuICAgIGZpbGVOYXZpZ2F0aW9uLnBvc2l0aW9uKDAsICh0b3BNZW51LnNpemUoKS55KSk7XG5cbiAgICBlZGl0b3JXcmFwcGVyLnNpemUoaW5uZXJXaWR0aCAtIChmaWxlTmF2aWdhdGlvbldpZHRoICsgMSksIGlubmVySGVpZ2h0IC0gdG9wTWVudS5zaXplKCkueSAtIGNvbnNvbGVWaWV3LnNpemUoKS55KTtcbiAgICBlZGl0b3JXcmFwcGVyLnBvc2l0aW9uKGZpbGVOYXZpZ2F0aW9uV2lkdGggKyAxLCh0b3BNZW51LnNpemUoKS55KSk7XG5cbiAgICBlZGl0b3JUYWJzLnNpemUoZWRpdG9yV3JhcHBlci5zaXplKCkueCwgZWRpdG9yVGFiSGVpZ2h0KTtcbiAgICBlZGl0b3JUYWJzLnBvc2l0aW9uKDAsIDApO1xuXG4gICAgZWRpdG9yVmlldy5zaXplKGVkaXRvcldyYXBwZXIuc2l6ZSgpLngsIGVkaXRvcldyYXBwZXIuc2l6ZSgpLnkgLSBlZGl0b3JUYWJIZWlnaHQpO1xuICAgIGVkaXRvclZpZXcucG9zaXRpb24oMCwgZWRpdG9yVGFiSGVpZ2h0KTtcblxuICAgIGVtaXR0ZXIuZW1pdCgncmVzaXplZCcsIGlubmVyV2lkdGgsIGlubmVySGVpZ2h0KTtcblxuICB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGhhbmRsZVJlc2l6ZSwgZmFsc2UpO1xuXG4gIGVtaXR0ZXIucGFnZSA9IHBhZ2U7XG4gIGVtaXR0ZXIubWVudSA9IHRvcE1lbnU7XG4gIGVtaXR0ZXIubmF2ID0gZmlsZU5hdmlnYXRpb247XG4gIGVtaXR0ZXIudGFicyA9IGVkaXRvclRhYnM7XG4gIGVtaXR0ZXIuZWRpdG9yID0gZWRpdG9yVmlldztcbiAgZW1pdHRlci5jb25zb2xlID0gY29uc29sZVZpZXc7XG5cbiAgLy8gdHJpZ2dlciBhIHJlc2l6ZSBtYW51YWxseSB0byBnZXQgaW5pdGlhbCBwb3NpdGlvbnMgYW5kIHNpemVzLi4uIFxuICBoYW5kbGVSZXNpemUoKTtcblxuICByZXR1cm4gZW1pdHRlcjtcblxufVxuXG5mdW5jdGlvbiBjcmVhdGVCb3ggKGNsYXNzTmFtZSl7XG5cbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHZhciBzdHlsZSA9IGVsLnN0eWxlO1xuICBlbC5jbGFzc05hbWUgPSBcImJveCBcIiArIGNsYXNzTmFtZSA7XG4gIHN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICBzdHlsZS50b3AgPSBcIjBweFwiO1xuICBzdHlsZS5sZWZ0ID0gXCIwcHhcIjtcbiAgc3R5bGUud2lkdGggPSBcIjBweFwiO1xuICBzdHlsZS5oZWlnaHQgPSBcIjBweFwiO1xuXG4gIHJldHVybiB7XG4gICAgZWxlbWVudCA6IGVsLFxuICAgIHBvc2l0aW9uIDogZnVuY3Rpb24gKHgsIHkpe1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB4IDogcGFyc2VJbnQoc3R5bGUubGVmdCwgMTApLFxuICAgICAgICAgIHkgOiBwYXJzZUludChzdHlsZS50b3AsIDEwKVxuICAgICAgICB9XG4gICAgICB9IFxuICAgICAgc3R5bGUudG9wID0geSArIFwicHhcIjtcbiAgICAgIHN0eWxlLmxlZnQgPSB4ICsgXCJweFwiO1xuICAgIH0sXG4gICAgc2l6ZSA6IGZ1bmN0aW9uICh4LCB5KXtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgeCA6IHBhcnNlSW50KHN0eWxlLndpZHRoLCAxMCksXG4gICAgICAgICAgeSA6IHBhcnNlSW50KHN0eWxlLmhlaWdodCwgMTApXG4gICAgICAgIH1cbiAgICAgIH0gXG4gICAgICBzdHlsZS5oZWlnaHQgPSB5ICsgXCJweFwiO1xuICAgICAgc3R5bGUud2lkdGggPSB4ICsgXCJweFwiO1xuICAgIH0sXG4gICAgYWRkQm94IDogZnVuY3Rpb24gKGJveCl7XG4gICAgICBib3guYXBwZW5kVG9FbGVtZW50KGVsKTtcbiAgICB9LFxuICAgIGFkZEVsZW1lbnQgOiBmdW5jdGlvbiAoZWxlbWVudCl7XG4gICAgICBlbC5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICB9LFxuICAgIGFwcGVuZFRvRWxlbWVudCA6IGZ1bmN0aW9uIChlbGVtZW50KXtcbiAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIH1cbiAgfVxuXG59IiwidmFyIGRvbSA9IHJlcXVpcmUoJ2dyZWVuLW1lc2EtZG9tJyk7XG52YXIgZWFjaCA9IHJlcXVpcmUoJ2ZvcmVhY2gnKTtcblxudmFyIGJhY2tkcm9wID0gJzxkaXYgY2xhc3M9XCJtb2RhbC1iYWNrZHJvcCBmYWRlXCI+PC9kaXY+JztcbnZhciBidXR0b24gPSBmdW5jdGlvbiAobyl7IHJldHVybiAnPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tbWluaSAnICsgby5jbGFzc2VzICsnXCI+JyArIG8ub3B0aW9uICsnPC9idXR0b24+JzsgfTtcblxudmFyIG1vZGFsID0gZnVuY3Rpb24gKG8peyByZXR1cm4gJycgKyBcbiAgJzxkaXYgY2xhc3M9XCJtb2RhbCBmYWRlXCI+JyArXG4gICcgPGRpdiBjbGFzcz1cIm1vZGFsLWhlYWRlclwiPicgK1xuICAnICAgPGgzPicrIG8uaGVhZGVyICsgJzwvaDM+JyArXG4gICcgPC9kaXY+JyArIFxuICAnIDxkaXYgY2xhc3M9XCJtb2RhbC1ib2R5XCI+JyArXG4gICcgICA8cD4nICsgby5tZXNzYWdlICsgJzwvcD4nICtcbiAgJyA8L2Rpdj4nICtcbiAgJyA8ZGl2IGNsYXNzPVwibW9kYWwtZm9vdGVyXCI+JyArXG4gICcgICA8ZGl2IGNsYXNzPVwiYnRuLWdyb3VwXCI+JyArXG4gICcgICA8L2Rpdj4nICtcbiAgJzwvZGl2PicgK1xuICAnPC9kaXY+J1xufTtcblxudmFyIGxvYWRpbmcgPSAnJyArXG4nPGRpdiBjbGFzcz1cIm1vZGFsIGZhZGVcIj4nICtcbicgPGRpdiBjbGFzcz1cIm1vZGFsLWhlYWRlclwiPkxvYWRpbmcuLi4gcGxlYXNlIHdhaXQ8L2Rpdj4nICtcbicgPGRpdiBjbGFzcz1cIm1vZGFsLWJvZHkgdGV4dC1jZW50ZXJcIj48aW1nIHNyYz1cIi9pbWFnZXMvYWpheC1sb2FkZXIuZ2lmXCI+PC9kaXY+JyArIFxuJyA8ZGl2IGNsYXNzPVwibW9kYWwtZm9vdGVyXCI+PC9kaXY+JyArXG4nPC9kaXY+JztcblxuZnVuY3Rpb24gUG9wdXBzICgpe1xuXG4gIHRoaXMuYmFja2Ryb3AgPSBkb20oYmFja2Ryb3ApO1xuICB0aGlzLmxvYWRlciA9IGRvbShsb2FkaW5nKTtcblxuICByZXR1cm4gdGhpcztcblxufVxuXG5Qb3B1cHMucHJvdG90eXBlID0ge1xuICBsb2FkaW5nIDogZnVuY3Rpb24gKCl7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KTtcblxuICAgIGRvbSgnYm9keScpLmFwcGVuZCh0aGlzLmJhY2tkcm9wKTtcbiAgICBkb20oJ2JvZHknKS5hcHBlbmQodGhpcy5sb2FkZXIpO1xuXG4gICAgdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dCgoZnVuY3Rpb24gKCl7XG5cbiAgICAgIHRoaXMuYmFja2Ryb3AuYWRkQ2xhc3MoJ2luJyk7XG4gICAgICB0aGlzLmxvYWRlci5hZGRDbGFzcygnaW4nKTtcblxuICAgIH0pLmJpbmQodGhpcyksIDEwMCk7XG4gIH0sXG4gIG5vdExvYWRpbmcgOiBmdW5jdGlvbiAoKXtcblxuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXQpO1xuXG4gICAgdGhpcy5iYWNrZHJvcC5yZW1vdmVDbGFzcygnaW4nKTtcbiAgICB0aGlzLmxvYWRlci5yZW1vdmVDbGFzcygnaW4nKTtcblxuICAgIHRoaXMuYmFja2Ryb3AucmVtb3ZlKCk7XG4gICAgdGhpcy5sb2FkZXIucmVtb3ZlKCk7XG5cbiAgfSxcbiAgbWVzc2FnZSA6IGZ1bmN0aW9uIChoZWFkZXIsIG1lc3NhZ2UsIGZuKXtcblxuICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgIGZuKCk7XG5cbiAgfSxcbiAgY29uZmlybSA6IGZ1bmN0aW9uIChoZWFkZXIsIG1lc3NhZ2UsIG9wdGlvbnMpe1xuXG4gICAgdmFyIGNvbmZpcm1Cb3ggPSBkb20obW9kYWwoeyBoZWFkZXIgOiBoZWFkZXIsIG1lc3NhZ2U6IG1lc3NhZ2UgfSkpO1xuXG4gICAgdmFyIGJ0bkdyb3VwID0gZG9tKGNvbmZpcm1Cb3gpLmZpbmQoJy5idG4tZ3JvdXAnKTtcblxuICAgIGRvbSgnYm9keScpLmFwcGVuZCh0aGlzLmJhY2tkcm9wKTtcbiAgICBkb20oJ2JvZHknKS5hcHBlbmQoY29uZmlybUJveCk7XG5cbiAgICB0aGlzLmJhY2tkcm9wLmNzcyh7XG4gICAgICBoZWlnaHQgOiB3aW5kb3cuaW5uZXJIZWlnaHQgKyBcInB4XCJcbiAgICB9KVxuXG4gICAgZWFjaChvcHRpb25zLCBmdW5jdGlvbiAob3B0aW9uKXtcblxuICAgICAgdmFyIGJ0biA9IGRvbShidXR0b24oe29wdGlvbiA6IG9wdGlvbi50ZXh0LCBjbGFzc2VzOiBvcHRpb24uY2xhc3NlcyA/IG9wdGlvbi5jbGFzc2VzIDogXCJcIn0pKTtcblxuICAgICAgYnRuR3JvdXAuYXBwZW5kKGJ0bik7XG5cbiAgICAgIGJ0bi5vbignY2xpY2snLCAoZnVuY3Rpb24gKGUpe1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICB0aGlzLmJhY2tkcm9wLnJlbW92ZSgpO1xuICAgICAgICBjb25maXJtQm94LnJlbW92ZSgpO1xuXG4gICAgICAgIG9wdGlvbi5jYWxsYmFjaygpO1xuXG4gICAgICB9KS5iaW5kKHRoaXMpKTtcblxuICAgIH0sIHRoaXMpO1xuXG4gICAgc2V0VGltZW91dCgoZnVuY3Rpb24gKCl7IFxuICAgICAgY29uZmlybUJveC5hZGRDbGFzcygnaW4nKTtcbiAgICAgIHRoaXMuYmFja2Ryb3AuYWRkQ2xhc3MoJ2luJyk7XG4gICAgfSkuYmluZCh0aGlzKSwxMCk7XG5cbiAgfVxuXG59O1xuXG52YXIgcG9wdXBzID0gbmV3IFBvcHVwcygpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBvcHVwczsiLCIvKlxuICBcbiAgU2ltcGxlIHdyYXBwZXIgYXJvdW5kIEFDRS4gSXQgdHJpZ2dlcnMgJ3NhdmUnIHNpZ25hbHMgYW5kIGNhbiBvbmx5IGVkaXQgb25lIHRoaW5nIGF0IG9uY2UuXG4gIFNvbWV0aGluZyBlbHNlIG5lZWRzIHRvIGRlYWwgd2l0aCB1cGRhdGluZyB0aGlzLlxuXG4qL1xuXG4vL3ZhciBhY2UgPSByZXF1aXJlKCdicmFjZScpO1xuLy9yZXF1aXJlKCdicmFjZS9tb2RlL2pzb24nKTtcbi8vcmVxdWlyZSgnYnJhY2UvbW9kZS9tYXJrZG93bicpO1xuLy9yZXF1aXJlKCdicmFjZS90aGVtZS9tb25va2FpJyk7XG52YXIgbWFya2VkID0gcmVxdWlyZSgnbWFya2VkJyk7XG5cbnZhciBkb20gPSByZXF1aXJlKCdncmVlbi1tZXNhLWRvbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjb250ZW50VmlldywgbGF5b3V0KXtcblxuICB2YXIgZW1pdHRlciA9IG5ldyAocmVxdWlyZSgnZXZlbnRzJykpLkV2ZW50RW1pdHRlcigpO1xuXG4gIHZhciAkZWxlbWVudCA9IGRvbSgnPGRpdj48L2Rpdj4nKTtcblxuICAkZWxlbWVudC5hZGRDbGFzcygncHJldmlldycpO1xuICAkZWxlbWVudC5jc3Moe1xuICAgIGRpc3BsYXkgOiAnbm9uZScsXG4gICAgJ21pbi13aWR0aCcgOiBjb250ZW50Vmlldy5zaXplKCkueCArICdweCcsXG4gICAgJ21pbi1oZWlnaHQnIDogY29udGVudFZpZXcuc2l6ZSgpLnkgKyAncHgnLFxuICAgIHBvc2l0aW9uIDogJ2Fic29sdXRlJyxcbiAgICB0b3AgOiAwLFxuICAgIGxlZnQgOiAwXG4gIH0pO1xuXG4gICRlbGVtZW50LmFwcGVuZFRvKGNvbnRlbnRWaWV3LmVsZW1lbnQpO1xuXG5cbiAgLy9jb250ZW50Vmlldy5hZGRFbGVtZW50KCRlbGVtZW50LmVscyk7XG5cbi8vICB2YXIgZWRpdG9yID0gYWNlLmVkaXQoZWxlbWVudCk7XG4vLyAgZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuLy8gIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VXNlV3JhcE1vZGUodHJ1ZSk7XG4vLyAgZWRpdG9yLnNldFNob3dQcmludE1hcmdpbihmYWxzZSk7XG5cbiAgbGF5b3V0Lm9uKCdyZXNpemUnLCBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCl7XG5cbiAgIC8vIGVsZW1lbnQuc3R5bGUud2lkdGggPSBjb250ZW50Vmlldy5zaXplKCkueCArIFwicHhcIjtcbiAgICAvL2VsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gY29udGVudFZpZXcuc2l6ZSgpLnkgKyBcInB4XCI7XG4gICAgLy9lZGl0b3IucmVzaXplKCk7XG4gICAgJGVsZW1lbnQuY3NzKHtcbiAgICAgICdtaW4td2lkdGgnIDogY29udGVudFZpZXcuc2l6ZSgpLnggKyAncHgnLFxuICAgICAgJ21pbi1oZWlnaHQnIDogY29udGVudFZpZXcuc2l6ZSgpLnkgKyAncHgnXG4gICAgfSk7XG5cbiAgfSk7XG5cbiAgLy8gaGlkZSB0aGUgZWRpdG9yLCBzZXQgdGhlIGN1cnJlbnRseSBhY3RpdmUgXG4gIHZhciBjdXJyZW50RW50aXR5ID0gZmFsc2U7XG4gIHZhciBvcmlnaW5hbEJvZHkgPSBmYWxzZTtcbiAgdmFyIGN1cnJlbnRCb2R5ID0gZmFsc2U7XG4gIHZhciBpc0RpcnR5ID0gZmFsc2U7XG5cbiAgLy9lZGl0b3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpe1xuXG4gIC8vICBpZiAoY3VycmVudEVudGl0eSl7XG5cbiAgLy8gICAgZW1pdHRlci5lbWl0KCdjaGFuZ2UnLCBjdXJyZW50RW50aXR5LCBlZGl0b3IuZ2V0VmFsdWUoKSk7XG5cbiAgLy8gIH1cblxuICAvL30pO1xuXG4gIHZhciBjdXJyZW50RW50aXR5ID0gZmFsc2U7XG5cbiAgLy8gZWRpdCB0aGlzIGNvbnRlbnQuLi5cbiAgZW1pdHRlci5vcGVuID0gZnVuY3Rpb24gZWRpdFNlc3Npb24gKGVudGl0eSwgYm9keSl7XG5cbiAgICBjdXJyZW50RW50aXR5ID0gZW50aXR5O1xuICAgIC8vIG1ha2UgdGhlIGVkaXRvciB2aXNpYmxlLlxuICAgIC8vaWYgKGVudGl0eS5taW1lID09PSBcInRleHQveC1tYXJrZG93blwiKXtcbiAgICAvLyAgZWRpdG9yLmdldFNlc3Npb24oKS5zZXRNb2RlKCdhY2UvbW9kZS9tYXJrZG93bicpO1xuICAgLy8gfSBlbHNlIGlmIChlbnRpdHkubWltZSA9PT0gXCJhcHBsaWNhdGlvbi9qc29uXCIpe1xuICAgIC8vICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoJ2FjZS9tb2RlL2pzb24nKTtcbiAgICAvL31cblxuICAgIGlmIChlbnRpdHkubWltZSA9PT0gJ3RleHQveC1tYXJrZG93bicpe1xuXG4gICAgICAkZWxlbWVudC5odG1sKCc8ZGl2IGNsYXNzPVwibWQtcHJldmlldy1jb250ZW50XCI+JyArIG1hcmtlZChib2R5KSArICc8L2Rpdj4nKTtcblxuICAgIH0gZWxzZSBpZiAoZW50aXR5Lm1pbWUgPT09ICdhcHBsaWNhdGlvbi9qc29uJyl7XG5cbiAgICAgICRlbGVtZW50Lmh0bWwoJzxkaXYgY2xhc3M9XCJtZC1wcmV2aWV3LWNvbnRlbnRcIj4nICsgbWFya2VkKCd+fn5qc29uXFxuJyArIEpTT04uc3RyaW5naWZ5KEpTT04ucGFyc2UoYm9keSksIGZhbHNlLCA0KSArICd+fn5cXG4nKSArICc8L2Rpdj4nKTtcblxuICAgIH1cblxuICAgIC8vZWRpdG9yLnNldFZhbHVlKGJvZHksIDEpO1xuICAgIC8vZWRpdG9yLmZvY3VzKCk7XG5cbiAgICAkZWxlbWVudC5jc3Moe1xuICAgICAgZGlzcGxheSA6ICcnXG4gICAgfSk7XG5cbiAgfTtcblxuICAvL2VtaXR0ZXIucmVhZCA9IGZ1bmN0aW9uIHJlYWRTZXNzaW9uICgpe1xuICAvLyAgcmV0dXJuIGVkaXRvci5nZXRWYWx1ZSgpO1xuICAvL31cbiAgZW1pdHRlci53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlU2Vzc2lvbihib2R5KXtcbiAgICAkZWxlbWVudC5odG1sKG1hcmtlZChib2R5KSk7XG4gIH1cblxuICAvLyBubyBzZXNzaW9ucyB0byBlZGl0Li4gZ2V0IHJpZC4gXG4gIGVtaXR0ZXIuY2xvc2UgPSBmdW5jdGlvbiAoKXtcbiAgICAvLyBoZXksIHNvLCBkbyB3ZSB3YW50IHRvIFxuICAgICRlbGVtZW50LmNzcyh7XG4gICAgICBkaXNwbGF5IDogJ25vbmUnXG4gICAgfSk7XG5cbiAgfVxuXG4gIHJldHVybiBlbWl0dGVyO1xuXG59IiwidmFyIGNvbnNvbGUgPSByZXF1aXJlKCcuL2NvbnNvbGUuanMnKTtcbnZhciBkb21pZnkgPSByZXF1aXJlKCdkb21pZnknKTtcbnZhciBkb20gPSByZXF1aXJlKCdncmVlbi1tZXNhLWRvbScpO1xudmFyIHBvcHVwcyA9IHJlcXVpcmUoJy4vbW9kYWwuanMnKTtcbnZhciBmaWxlc2l6ZSA9IHJlcXVpcmUoJ2ZpbGVzaXplJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCwgdmZzLCBlZGl0b3IsIGluZm8sIHByZXZpZXdlciwgYm94KXtcblxuICBcblxuICAvKlxuXG4gICAgXCJTZXNzaW9uc1wiIG1hbmlmZXN0cyBhcyB0aGUgdGFicyBhY3Jvc3MgdGhlIHRvcCBvZiB0aGUgY29udGVudCBhcmVhLlxuXG4gICAgVGhlcmUgYXJlIHRocmVlIHR5cGVzIG9mIHNlc3Npb246XG4gICAgICAtIGVkaXQgc2Vzc2lvbiAocG93ZXJlZCBieSBBQ0UpXG4gICAgICAtIGluZm8gc2Vzc2lvbiAocG93ZXJlZCBieSBhIGN1c3RvbSBmb3JtL2RhdGEgdGhpbmcpXG4gICAgICAtIHByZXZpZXcgc2Vzc2lvbiAocG93ZXJlZCBieSBhIG1hcmtkb3duIHBhcnNlcilcblxuICAgIG5ldyBzZXNzaW9ucyBjYW4gYmUgY3JlYXRlZCBieSB0aGUgYXBwbGljYXRpb24gZXh0ZXJuYWxseSB2aWEgc2lnbmFscy4uLlxuXG4gICAgLy8gIGFwcC5vbignZWRpdC1lbnRpdHknLCAuLi4pXG4gICAgLy8gIGFwcC5vbignZWRpdC1lbnRpdHktaW5mbycsIC4uLilcbiAgICAvLyAgYXBwLm9uKCdwcmV2aWV3LWVudGl0eScsIC4uLilcblxuICAgIGV4aXN0aW5nIHNlc3Npb25zIGNhbiBiZSByZWFjdGl2YXRlZCBieSBjbGlja2luZyBvbiB0aGUgdGFicywgd2hpY2ggaXNzdWUgdGhlIHNhbWUgc2lnbmFscy4uXG4gICAgLy8gIGFwcC5vbignZWRpdC1lbnRpdHknLCAuLi4pXG4gICAgLy8gIGFwcC5vbignZWRpdC1pbmZvLWVudGl0eScsIC4uLilcbiAgICAvLyAgYXBwLm9uKCdwcmV2aWV3LWVudGl0eScsIC4uLikgIFxuXG4gICAgZXhpc3Rpbmcgc2Vzc2lvbnMgY2FuIGJlIGNsb3NlZCBieSBjbGlja2luZyBvbiB0aGUgY2xvc2UgaWNvbiBvbiB0aGUgdGFiLi5cblxuICAgIC8vIGFwcC5vbignZW5kLWVkaXQtZW50aXR5JywgLi4uKVxuICAgIC8vIGFwcC5vbignZW5kLWVkaXQtaW5mby1lbnRpdHknLCAuLi4pXG4gICAgLy8gYXBwLm9uKCdlbmQtcHJldmlldy1lbnRpdHknLCAuLi4pXG5cbiAgICBXaGVuIGNsb3NpbmcgZWRpdCBhbmQgZWRpdC1pbmZvIHNlc3Npb25zLCB0aGUgZGF0YSBpbiB0aGUgZWRpdG9yL2luZm8gb2JqZWN0cyBuZWVkc1xuICAgIGNvbXBhcmluZyB3aXRoIHRoZSBwZXJzaXN0ZWQgZGF0YSBhbmQgdGhlIHVzZXIgbXVzdCBiZSBwcm9tcHRlZCB0byBlaXRoZXIgZGlzY2FyZCBcbiAgICBvciBzYXZlIHRoZXNlIGNoYW5nZXMgYmVmb3JlIGNsb3NpbmcsIG9yIGNhbmNlbGxpbmcuXG5cbiAgICAvLyBhcHAub24oJ2VudGl0eS1kZWxldGVkJywuLi4pXG4gICAgLy8gYXBwLm9uKCdlbnRpdHktcmVuYW1lZCcsLi4uKVxuXG4gICAgV2hlbiBhbiBlbnRpdHkgaXMgY2hhbmdlZCBvbiB0aGUgc2VydmVyLCB0aGVuIHdoZW4gYSBzZXNzaW9uIGNvbmNlcm5pbmcgdGhpcyBlbnRpdHkgaXNcbiAgICBjdXJyZW50bHkgYWN0aXZlIG9yIGlzIHJlYWN0aXZhdGVkIGJ5IHRoZSB1c2VyLFxuICAgIHRoZSB1c2VyIG11c3QgYmUgcHJvbXB0ZWQgdG8gZWl0aGVyIGdldCB0aGUgbmV3IHZlcnNpb24gb3IgaWdub3JlIHRoZSBuZXcgdmVyc2lvblxuXG4gICAgLy8gYXBwLm9uKCdlbnRpdHktZGVsZXRlZCcsLi4uKVxuICAgIC8vIGFwcC5vbignZW50aXR5LXJlbmFtZWQnLC4uLilcblxuXG4gICAgV2hhdCBkb2VzIGEgc2Vzc2lvbiBsb29rIGxpa2U/XG5cbiAgICB7XG4gICAgICBlbnRpdHkgOiB7IC4uLiB9LCAvLyB0aGUgZGV0YWlsZWQgZW50aXR5IG9iamVjdC4gVGhpcyBkb2Vzbid0IGNvbnRhaW4gdGhlIGJvZHlcbiAgICAgIGJvZGllcyA6IHtcbiAgICAgICAgcGVyc2lzdGVkIDogJycgLy8gdGhlIGNhbm9uaWNhbCBib2R5IG9uIHRoZSBzZXJ2ZXJcbiAgICAgICAgdXNlciA6ICcnIC8vIHRoZSB1c2VyJ3MgZWRpdGVkIHZlcnNpb24gXG4gICAgICB9LFxuICAgICAgdHlwZSA6ICdlZGl0IHwgZWRpdC1pbmZvIHwgcHJldmlldycsIC8vIG5lZWRlZCB0byBtYWtlIHN1cmUgdGhlIHJpZ2h0IHRoaW5nIGlzIGFjdGl2YXRlZCB3aGVuIHRoZSBzZXNzaW9uIGJlY29tZXMgYWN0aXZlXG4gICAgICBlbGVtZW50cyA6IHtcbiAgICAgICAgJHRhYiA6ICRlbCAvLyBhIHJlZmVyZW5jZSB0byB0aGUgc2Vzc2lvbidzIHRhYi5cbiAgICAgIH0gIFxuXG4gICAgfVxuICAgIFxuXG4gICovXG5cbiAgdmFyIHVsID0gZG9taWZ5KCc8dWwgY2xhc3M9XCJ0YWJzXCI+PC91bD4nKTtcbiAgYm94LmFkZEVsZW1lbnQodWwpO1xuICAkdWwgPSBkb20odWwpO1xuXG4gIC8vIHdlIHVzZSBhbiBhcnJheSBiZWNhdXNlIG9yZGVyaW5nIGlzIHVzZWZ1bCBoZXJlLlxuICB2YXIgc2Vzc2lvbnMgPSBbXTtcblxuICBhcHAub24oJ3ByZXZpZXctZW50aXR5JywgZnVuY3Rpb24gKHBhdGgpe1xuXG4gICAgdmFyIHNlc3Npb24gPSBmaW5kU2Vzc2lvbihwYXRoLCAncHJldmlldycpO1xuXG4gICAgaWYgKCFzZXNzaW9uKXtcbiAgICAgIGNyZWF0ZVByZXZpZXdTZXNzaW9uKHBhdGgsIGZ1bmN0aW9uIChlcnIsIHBhdGgpe1xuICAgICAgICBvcGVuU2Vzc2lvbihwYXRoLCAncHJldmlldycpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wZW5TZXNzaW9uKHBhdGgsICdwcmV2aWV3Jyk7XG4gICAgfVxuXG4gIH0pO1xuXG4gICAgLy8gdGhlIGFwcGxpY2F0aW9uIHRlbGxzIHVzIHdoYXQgdGhlIHVzZXIgd2FudHMgdG8gZG8uLi5cbiAgYXBwLm9uKCdlZGl0LWVudGl0eScsIGZ1bmN0aW9uIChwYXRoKXtcblxuICAgIHZhciBzZXNzaW9uID0gZmluZFNlc3Npb24ocGF0aCwgJ2VkaXQnKTtcblxuICAgIGlmICghc2Vzc2lvbil7XG5cbiAgICAgIGNyZWF0ZUVkaXRTZXNzaW9uKHBhdGgsIGZ1bmN0aW9uIChlcnIsIHBhdGgpe1xuICAgICAgICBvcGVuU2Vzc2lvbihwYXRoLCAnZWRpdCcpO1xuICAgICAgfSk7XG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICBvcGVuU2Vzc2lvbihwYXRoLCAnZWRpdCcpO1xuXG4gICAgfVxuXG4gIH0pO1xuXG4gIGFwcC5vbignc2F2ZS1lbnRpdHknLCBmdW5jdGlvbiAoKXtcblxuICAgIHZhciBzZXNzaW9uID0gZmluZEFjdGl2ZVNlc3Npb24oKTtcbiAgICBlZGl0b3IuZm9jdXMoKTtcblxuICAgIGlmIChzZXNzaW9uLnR5cGUgPT09IFwiZWRpdFwiKXtcbiAgICAgIGlmIChzZXNzaW9uLmJvZGllcy51c2VyICE9PSBzZXNzaW9uLmJvZGllcy5wZXJzaXN0ZWQpe1xuICAgICAgICBtYXJrU2Vzc2lvbkFzU3luY2hyb25pc2luZyhzZXNzaW9uKTtcbiAgICAgICAgdmZzLndyaXRlRmlsZShzZXNzaW9uLnBhdGgsIHNlc3Npb24uYm9kaWVzLnVzZXIsIGZ1bmN0aW9uIChlcnIsIGVudGl0eSl7XG4gICAgICAgICAgLy8gd2UgZG9uJ3QgY2FyZSBhdCB0aGlzIHBvaW50Li4uIFxuICAgICAgICAgIGNvbnNvbGUubG9nKCdTYXZlZCA8c3Ryb25nPicgKyBlbnRpdHkubmFtZSArICc8L3N0cm9uZz4gdG8gJyArIGVudGl0eS5yZWxQYXRoICsgJyAoJyArIGZpbGVzaXplKGVudGl0eS5zaXplKSArICcpJyk7XG5cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gIH0pO1xuXG4gIGFwcC5vbignZW5kLWVkaXQtZW50aXR5JywgZnVuY3Rpb24gKHBhdGgpe1xuXG4gICAgdmFyIHNlc3Npb24gPSBmaW5kU2Vzc2lvbihwYXRoLCAnZWRpdCcpO1xuXG4gICAgaWYgKHNlc3Npb24pe1xuICAgICAgY2xvc2VTZXNzaW9uKHBhdGgsICdlZGl0Jyk7XG4gICAgfVxuXG4gIH0pO1xuXG4gIGFwcC5vbignZW5kLXByZXZpZXctZW50aXR5JywgZnVuY3Rpb24gKHBhdGgpe1xuXG4gICAgdmFyIHNlc3Npb24gPSBmaW5kU2Vzc2lvbihwYXRoLCAncHJldmlldycpO1xuXG4gICAgaWYgKHNlc3Npb24pe1xuICAgICAgY2xvc2VTZXNzaW9uKHBhdGgsICdwcmV2aWV3Jyk7XG4gICAgfVxuXG4gIH0pO1xuXG5cbiAgLy8gdGhlIGVkaXRvciByZXBvcnRzIHdoZW4gdGhlIHVzZXIgaGFzIGNoYW5nZWQgYW4gZW50aXR5Li4uXG4gIGVkaXRvci5vbignY2hhbmdlJywgZnVuY3Rpb24gKGVudGl0eSwgdXNlcil7XG5cbiAgICB2YXIgc2Vzc2lvbiA9IGZpbmRBY3RpdmVTZXNzaW9uKCk7XG5cbiAgICBpZiAoc2Vzc2lvbi5wYXRoID09PSBlbnRpdHkucmVsUGF0aCl7XG4gICAgICBzZXNzaW9uLmJvZGllcy51c2VyID0gdXNlcjtcbiAgICAgIGlmIChzZXNzaW9uLmJvZGllcy51c2VyICE9PSBzZXNzaW9uLmJvZGllcy5wZXJzaXN0ZWQgJiYgc2Vzc2lvbi5zdGF0dXMgPT09IFwic3luY2VkXCIpe1xuICAgICAgICBtYXJrU2Vzc2lvbkFzRGVzeW5jZWQoc2Vzc2lvbik7XG4gICAgICB9IGVsc2UgaWYgKHNlc3Npb24uc3RhdHVzID09PSBcImRlc3luY2VkXCIgJiYgc2Vzc2lvbi5ib2RpZXMudXNlciA9PT0gc2Vzc2lvbi5ib2RpZXMucGVyc2lzdGVkKXtcbiAgICAgICAgbWFya1Nlc3Npb25Bc1N5bmNlZChzZXNzaW9uKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignT3JwaGFuIHNlc3Npb24gZGV0ZWN0ZWQhJyk7XG4gICAgfVxuXG4gIH0pO1xuXG4gIC8vIHRoZSBmaWxlIHN5c3RlbSBjYW4gYWxzbyB0ZWxsIHVzIGFuIGVudGl0eSBoYXMgY2hhbmdlZC4uLlxuICB2ZnMub24oJ2VudGl0eS11cGRhdGVkJywgZnVuY3Rpb24gKGNoYW5nZVR5cGUsIHBhdGgpe1xuXG4gICAgLypcbiAgICAgIFdlIGNhbiBnZXQgaW50byBhIHBpY2tsZSBoZXJlLiBUaGVyZSBhcmUgYSBjb3VwbGUgb2Ygc2l0dWF0aW9ucyB3ZSBjb3VsZFxuICAgICAgZmluZCBvdXJzZWx2ZXMgaW4uXG5cbiAgICAgIDEpIFRoZSBlbnRpdHkgaGFzIGJlZW4gdXBkYXRlZC4gSXQgaXMgaW4gdGhlIHNhbWUgbG9jYXRpb24gYW5kIHRoZSBjb250ZW50cyBvZiBcbiAgICAgIHRoZSBib2R5IGFyZSB0aGUgc2FtZSBhcyB3ZSBoYXZlIGluc2lkZSB0aGUgc2Vzc2lvbi4gVHlwaWNhbGx5IHRoaXMgaXMgYmVjYXVzZVxuICAgICAgdGhlIHVzZXIgaGFzICdzYXZlZCcgdGhlIGVudGl0eSBhbmQgdGhpcyBpcyBqdXN0IHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgXG4gICAgICBzYXlpbmcgdGhhdCB0aGUgZmlsZSBoYXMgY2hhbmdlZC5cblxuICAgICAgSW4gdGhpcyBjYXNlIHRoZSAncGVyc2lzdGVkJyBib2R5IHNob3VsZCBub3cgbWF0Y2ggdGhlICd1c2VyJyBib2R5IGFuZCB3ZSBjYW4gXG4gICAgICBtYXJrIHRoZSBzZXNzaW9uIGFzICdzeW5jZWQnIGFuZCBjYXJyeSBvbiBhcyBub3JtYWwuIFxuXG4gICAgICAyKSBBcyBhYm92ZSwgZXhjZXB0IHRoZSBuZXcgJ3BlcnNpc3RlZCcgYm9keSBpcyBkb2VzIG5vdCBtYXRjaCB0aGUgZWl0aGVyIHRoZVxuICAgICAgdXNlciBib2R5IG9yIHRoZSBwZXJzaXN0ZWQgYm9keSBpbiB0aGUgc2Vzc2lvbi4gQXQgdGhpcyBwb2ludCB3ZSBuZWVkIHRvIHByZXNlbnRcbiAgICAgIHRoZSB1c2VyIHdpdGggYSBjaG9pY2UuIERvIHRoZXkgd2FudCB0byBrZWVwIHRoZSB2ZXJzaW9uIG9mIHRoZSBmaWxlIHRoZXkgaGF2ZSwgXG4gICAgICBvciBkbyB0aGV5IHdpc2ggdG8gYXBwbHkgdGhlIG5ldyB2ZXJzaW9uIG9mIHRoZSBmaWxlXG5cbiAgICAgIDMpIFxuICAgICovXG5cbiAgICAvLyB3ZSdyZSBvbmx5IGludGVyZXN0ZWQgaW4gdHdvIHR5cGVzIGhlcmUuIENoYW5nZSBhbmQgZGVsZXRlLiBDYW4ndCBhY3R1YWxseVxuICAgIC8vIGdldCBhIHNpbmdsZSAncmVuYW1lJyBvciAnJ1xuXG4gICAgdmFyIHNlc3Npb247XG5cbiAgICBpZiAoY2hhbmdlVHlwZSA9PT0gXCJ1cGRhdGVcIil7IFxuXG4gICAgICB2ZnMucmVhZEZpbGUocGF0aCwgZnVuY3Rpb24gKGVyciwgZW50aXR5LCBib2R5KXtcblxuICAgICAgICBzZXNzaW9uID0gZmluZFNlc3Npb24ocGF0aCwgJ2VkaXQnKTtcbiAgICAgICAgc2Vzc2lvbi5ib2RpZXMucGVyc2lzdGVkID0gYm9keTtcblxuICAgICAgICBpZiAoYm9keSA9PT0gc2Vzc2lvbi5ib2RpZXMudXNlcil7XG4gICAgICAgICAgbWFya1Nlc3Npb25Bc1N5bmNlZChzZXNzaW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXJrU2Vzc2lvbkFzRGVzeW5jZWQoc2Vzc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cblxuICAgIH0gZWxzZSBpZiAoY2hhbmdlVHlwZSA9PT0gXCJkZWxldGVcIil7XG5cbiAgICB9XG5cbiAgfSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbiAocGF0aCwgZW50aXR5LCBib2R5KXtcblxuICAgIHJldHVybiB7XG4gICAgICBlbnRpdHkgOiBlbnRpdHksXG4gICAgICBwYXRoIDogcGF0aCxcbiAgICAgIGVsZW1lbnRzIDoge1xuICAgICAgICAkdGFiIDogZG9tKCc8bGk+PGEgaHJlZj1cIiNcIj48L2E+PHNwYW4gY2xhc3M9XCJ0eXBjbiB0eXBjbi1wb3dlclwiPjwvc3Bhbj48c3BhbiBjbGFzcz1cInR5cGNuIHR5cGNuLW1lZGlhLXJlY29yZFwiPjwvc3Bhbj48c3BhbiBjbGFzcz1cInR5cGNuIHR5cGNuLWFycm93LXN5bmNcIj48L3NwYW4+PC9saT4nKVxuICAgICAgfSxcbiAgICAgIHN0YXR1cyA6ICdzeW5jZWQnLFxuICAgICAgYWN0aXZlIDogZmFsc2UsXG4gICAgICBib2RpZXMgOiB7XG4gICAgICAgICAgcGVyc2lzdGVkIDogYm9keSxcbiAgICAgICAgICB1c2VyIDogYm9keVxuICAgICAgfVxuICAgIH1cblxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUHJldmlld1Nlc3Npb24gKHBhdGgsIGZuKXtcblxuICAgIHZmcy5yZWFkRmlsZShwYXRoLCBmdW5jdGlvbiAoZXJyLCBlbnRpdHksIGJvZHkpe1xuXG4gICAgICBpZiAoZXJyKXtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgJyArIHBhdGggKyAnIHdpdGggZXJyb3IgJyArIGVycik7XG4gICAgICAgIGZuIChlcnIsIHBhdGgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBzZXNzaW9uID0gY3JlYXRlU2Vzc2lvbihwYXRoLCBlbnRpdHksIGJvZHkpO1xuXG4gICAgICBzZXNzaW9uLnR5cGUgPSAncHJldmlldyc7XG5cbiAgICAgIHNlc3Npb24uZWxlbWVudHMuJHRhYi5hZGRDbGFzcygncHJldmlldycpO1xuXG4gICAgICB2YXIgJGEgPSBkb20oJ2EnLCBzZXNzaW9uLmVsZW1lbnRzLiR0YWIpO1xuXG4gICAgICAkYS50ZXh0KCdQcmV2aWV3OiAnICsgZW50aXR5Lm5hbWUpO1xuXG4gICAgICAkYS5vbignY2xpY2snLCBmdW5jdGlvbiAoZSl7XG4gICAgICAgIGFwcC5lbWl0KCdwcmV2aWV3LWVudGl0eScsIHBhdGgpXG4gICAgICB9KTtcblxuICAgICAgZG9tKCdzcGFuJywgc2Vzc2lvbi5lbGVtZW50cy4kdGFiKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpe1xuICAgICAgICBhcHAuZW1pdCgnZW5kLXByZXZpZXctZW50aXR5JywgcGF0aClcbiAgICAgIH0pO1xuXG4gICAgICAkdWwuYXBwZW5kKHNlc3Npb24uZWxlbWVudHMuJHRhYik7XG5cbiAgICAgIC8vIHNlc3Npb24gZ2V0cyBhZGRlZCB0byB0aGUgZW5kIGxpc3Qgb2Ygc2Vzc2lvbnMuLi5cbiAgICAgIHNlc3Npb25zLnB1c2goc2Vzc2lvbik7XG5cbiAgICAgIGZuKGZhbHNlLCBwYXRoKTtcblxuICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVFZGl0U2Vzc2lvbiAocGF0aCwgZm4pe1xuICAgIC8vIGdldCB0aGUgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIuLlxuXG4gICAgdmZzLnJlYWRGaWxlKHBhdGgsIGZ1bmN0aW9uIChlcnIsIGVudGl0eSwgYm9keSl7XG5cbiAgICAgIGlmIChlcnIpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gbG9hZCAnICsgcGF0aCArICcgd2l0aCBlcnJvciAnICsgZXJyKTtcbiAgICAgICAgZm4gKGVyciwgcGF0aCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHNlc3Npb24gPSBjcmVhdGVTZXNzaW9uKHBhdGgsIGVudGl0eSwgYm9keSk7XG5cbiAgICAgIHNlc3Npb24udHlwZSA9ICdlZGl0JztcblxuICAgICAgdmFyICRhID0gZG9tKCdhJywgc2Vzc2lvbi5lbGVtZW50cy4kdGFiKTtcblxuICAgICAgJGEudGV4dChlbnRpdHkubmFtZSk7XG5cbiAgICAgICRhLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKXtcbiAgICAgICAgYXBwLmVtaXQoJ2VkaXQtZW50aXR5JywgcGF0aClcbiAgICAgIH0pO1xuXG4gICAgICBkb20oJ3NwYW4nLCBzZXNzaW9uLmVsZW1lbnRzLiR0YWIpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCl7XG4gICAgICAgIGFwcC5lbWl0KCdlbmQtZWRpdC1lbnRpdHknLCBwYXRoKVxuICAgICAgfSk7XG5cbiAgICAgICR1bC5hcHBlbmQoc2Vzc2lvbi5lbGVtZW50cy4kdGFiKTtcblxuICAgICAgLy8gc2Vzc2lvbiBnZXRzIGFkZGVkIHRvIHRoZSBlbmQgbGlzdCBvZiBzZXNzaW9ucy4uLlxuICAgICAgc2Vzc2lvbnMucHVzaChzZXNzaW9uKTtcblxuICAgICAgZm4oZmFsc2UsIHBhdGgpO1xuXG4gICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhdXNlQWN0aXZlU2Vzc2lvbiAoKXtcblxuICAgIGlmIChzZXNzaW9uc1swXS5hY3RpdmUpe1xuICAgICAgc2Vzc2lvbnNbMF0uZWxlbWVudHMuJHRhYi5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICBzZXNzaW9uc1swXS5hY3RpdmUgPSBmYWxzZTtcblxuICAgICAgaWYgKHNlc3Npb25zWzBdLnR5cGUgPT09ICdwcmV2aWV3Jyl7XG4gICAgICAgIHByZXZpZXdlci5jbG9zZSgpO1xuICAgICAgfSBlbHNlIGlmIChzZXNzaW9uc1swXS50eXBlID09PSAnZWRpdCcpe1xuICAgICAgICBlZGl0b3IuY2xvc2UoKTtcbiAgICAgIH1cblxuICAgIH1cblxuICB9XG5cblxuICBmdW5jdGlvbiBvcGVuU2Vzc2lvbiAocGF0aCwgdHlwZSl7XG5cbiAgICBwYXVzZUFjdGl2ZVNlc3Npb24oKTtcbiAgICByZXN1bWVTZXNzaW9uKHBhdGgsIHR5cGUpO1xuXG4gIH1cblxuICBmdW5jdGlvbiBjbG9zZVNlc3Npb24gKHBhdGgsIHR5cGUpe1xuXG4gICAgdmFyIHNlc3Npb24gPSBmaW5kU2Vzc2lvbihwYXRoLCB0eXBlKTtcblxuICAgIGlmIChzZXNzaW9uKXtcblxuICAgICAgc2Vzc2lvbi5lbGVtZW50cy4kdGFiLnJlbW92ZSgpO1xuXG4gICAgICAvLyByZW1vdmUgdGhpcyBzZXNzaW9uIGZyb20gdGhlIGxpc3Qgb2Ygc2Vzc2lvbnMuLi5cbiAgICAgIHNlc3Npb25zLnNwbGljZShzZXNzaW9ucy5pbmRleE9mKHNlc3Npb24pLCAxKTtcblxuICAgICAgLy8ga2lsbCB0aGUgcmVmZXJlbmNlIHRvIHRoZSBET00gbm9kZSBzbyBpdCBjYW4gYmUgZ2FyYmFnZSBjb2xsZWN0ZWRcbiAgICAgIHNlc3Npb24uZWxlbWVudHMuJHRhYiA9IG51bGw7XG5cbiAgICAgIGlmICh0eXBlID09PSAncHJldmlldycpe1xuICAgICAgICBwcmV2aWV3ZXIuY2xvc2UoKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkaXQnKXtcbiAgICAgICAgZWRpdG9yLmNsb3NlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZXNzaW9uc1swXSl7XG5cbiAgICAgICAgcmVzdW1lU2Vzc2lvbihzZXNzaW9uc1swXS5wYXRoLCBzZXNzaW9uc1swXS50eXBlKTtcblxuICAgICAgfVxuXG4gICAgfVxuXG4gIH1cblxuICBmdW5jdGlvbiByZXN1bWVTZXNzaW9uIChwYXRoLCB0eXBlKXtcblxuICAgIHZhciBzZXNzaW9uID0gZmluZFNlc3Npb24ocGF0aCwgdHlwZSk7XG5cbiAgICBzZXNzaW9uLmVsZW1lbnRzLiR0YWIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIHNlc3Npb24uYWN0aXZlID0gdHJ1ZTtcblxuICAgIHNlc3Npb25zLnVuc2hpZnQoc2Vzc2lvbnMuc3BsaWNlKHNlc3Npb25zLmluZGV4T2Yoc2Vzc2lvbiksIDEpWzBdKTtcblxuICAgIGlmICh0eXBlID09PSAnZWRpdCcpe1xuXG4gICAgICBlZGl0b3Iub3BlbihzZXNzaW9uLmVudGl0eSwgc2Vzc2lvbi5ib2RpZXMudXNlcik7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdwcmV2aWV3Jyl7XG5cbiAgICAgIHByZXZpZXdlci5vcGVuKHNlc3Npb24uZW50aXR5LCBzZXNzaW9uLmJvZGllcy51c2VyKTtcblxuICAgIH1cblxuICB9XG5cblxuICBmdW5jdGlvbiBtYXJrU2Vzc2lvbkFzRGVzeW5jZWQgKHNlc3Npb24pe1xuICAgIC8vIGFkZCBhbiBhc3RlcmlzayB0byB0aGUgdGFiXG4gICAgc2Vzc2lvbi5zdGF0dXMgPSBcImRlc3luY2VkXCI7XG4gICAgc2Vzc2lvbi5lbGVtZW50cy4kdGFiLmFkZENsYXNzKCdkZXN5bmMnKTtcbiAgICBzZXNzaW9uLmVsZW1lbnRzLiR0YWIucmVtb3ZlQ2xhc3MoJ3N5bmNocm9uaXNpbmcnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1hcmtTZXNzaW9uQXNTeW5jZWQgKHNlc3Npb24pe1xuICAgIC8vIHJlbW92ZSB0aGUgYXN0ZXJpc2sgZnJvbSB0aGUgdGFiXG4gICAgc2Vzc2lvbi5zdGF0dXMgPSBcInN5bmNlZFwiO1xuICAgIHNlc3Npb24uZWxlbWVudHMuJHRhYi5yZW1vdmVDbGFzcygnZGVzeW5jJyk7XG4gICAgc2Vzc2lvbi5lbGVtZW50cy4kdGFiLnJlbW92ZUNsYXNzKCdzeW5jaHJvbmlzaW5nJyk7XG4gIH1cblxuICBmdW5jdGlvbiBtYXJrU2Vzc2lvbkFzU3luY2hyb25pc2luZyAoc2Vzc2lvbil7XG4gICAgc2Vzc2lvbi5lbGVtZW50cy4kdGFiLnJlbW92ZUNsYXNzKCdkZXN5bmMnKTtcbiAgICBzZXNzaW9uLmVsZW1lbnRzLiR0YWIuYWRkQ2xhc3MoJ3N5bmNocm9uaXNpbmcnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRBY3RpdmVTZXNzaW9uICgpe1xuICAgIHJldHVybiBzZXNzaW9uc1swXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRTZXNzaW9uIChwYXRoLCB0eXBlKXtcbiAgICB2YXIgaW5kZXggPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlc3Npb25zLmxlbmd0aDsgaSsrKXtcbiAgICAgIGlmIChzZXNzaW9uc1tpXS5wYXRoID09PSBwYXRoICYmIHNlc3Npb25zW2ldLnR5cGUgPT09IHR5cGUpe1xuICAgICAgICByZXR1cm4gc2Vzc2lvbnNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG4gIC8qXG5cbiAgdmFyIGVkaXRTZXNzaW9ucyA9IFtdO1xuXG4gIHZhciBtb2RlID0gXCJ3YWl0XCI7XG5cblxuXG4gIHdpbmRvdy5vbmtleWRvd24gPSBmdW5jdGlvbiAoZSl7XG5cbiAgICBpZigoZS5jdHJsS2V5IHx8IGUubWV0YUtleSkpe1xuXG4gICAgICBpZiAoZS53aGljaCA9PSA4Mykge1xuXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgYXBwLmVtaXQoJ3NhdmUtZW50aXR5Jyk7XG5cbiAgICAgIH1cblxuICAgIH1cblxuICB9XG5cbiAgYXBwLm9uKCdzYXZlLWVudGl0eScsIGZ1bmN0aW9uICgpe1xuXG4gICAgaWYgKGVkaXRTZXNzaW9uc1swXSl7XG4gICAgICB2YXIgY3VycmVudEJvZHkgPSBlZGl0b3IucmVhZCgpO1xuICAgICAgaWYgKGVkaXRTZXNzaW9uc1swXS5ib2R5ICE9PSBjdXJyZW50Qm9keSl7XG4gICAgICAgIHNhdmVFbnRpdHkoZWRpdFNlc3Npb25zWzBdLmVudGl0eSwgY3VycmVudEJvZHkpO1xuICAgICAgfVxuICAgIH1cblxuICB9KTtcblxuICBhcHAub24oJ29wZW4tZW50aXR5JywgZnVuY3Rpb24gKHBhdGgpe1xuIFxuICAgIHZmcy5yZWFkRmlsZShwYXRoLCBmdW5jdGlvbiAoZXJyLCBlbnRpdHksIGJvZHkpe1xuXG4gICAgICB2YXIgc2Vzc2lvbkluZGV4ID0gZmluZFNlc3Npb25JbmRleChwYXRoKTtcblxuICAgICAgaWYgKHNlc3Npb25JbmRleCA9PT0gZmFsc2Upe1xuXG4gICAgICAgIC8vIGJyYW5kIG5ldyBzZXNzaW9uIVxuXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBleGlzdGluZyBlZGl0U2Vzc2lvbnMuLi5cbiAgICAgICAgaWYgKGVkaXRTZXNzaW9ucy5sZW5ndGgpe1xuXG4gICAgICAgICAgY29uc29sZS5sb2coJ1BhdXNpbmcgJyArIGVkaXRTZXNzaW9uc1swXS5lbnRpdHkubmFtZSk7XG4gICAgICAgICAgLy8gd2UgZGVhY3RpdmF0ZSB0aGUgY3VycmVudCB0aGluZy4uLlxuICAgICAgICAgIGVkaXRTZXNzaW9uc1swXS50YWIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgIC8vIHBlcnNpc3QgdGhlIGN1cnJlbnQgdXNlciBjb250ZW50Li4uXG4gICAgICAgICAgZWRpdFNlc3Npb25zWzBdLmJvZHkgPSBlZGl0b3IucmVhZCgpO1xuICAgICAgICAgIC8vIGFuZCBjbG9zZS4uLlxuICAgICAgICAgIGVkaXRvci5jbG9zZSgpO1xuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnT3BlbmluZyAnICsgZW50aXR5Lm5hbWUpO1xuICAgICAgICB2YXIgJHRhYiA9IGRvbSgnPGxpPjxhIGhyZWY9XCIjXCI+JyArIGVudGl0eS5uYW1lICsnPC9hPjxzcGFuIGNsYXNzPVwidHlwY24gdHlwY24tZGVsZXRlXCI+PHNwYW4+PC9saT4nKTtcblxuICAgICAgICAkdWwuYXBwZW5kKCR0YWIpXG5cbiAgICAgICAgLy8gZXZlbnQgaGFuZGxlciBmb3IgbGVmdGNsaWNrL3JpZ2h0Y2xpY2sgb24gdGhlIHRhYi4uLiBcbiAgICAgICAgZG9tKCdhJywgJHRhYikub24oJ21vdXNldXAnLCBmdW5jdGlvbiAoZXZlbnQpe1xuXG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgIGlmIChldmVudC53aGljaCA9PT0gMSl7XG4gICAgICAgICAgICBhcHAuZW1pdCgnb3Blbi1lbnRpdHknLCBlbnRpdHkucmVsUGF0aCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChldmVudC53aGljaCA9PT0gMyl7XG4gICAgICAgICAgICBjb250ZXh0TWVudSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBldmVudCBoYW5kbGVyIGZvciBjbGlja2luZyB0aGUgJ2Nsb3NlJyBpY29uIG9uIHRoZSB0YWIuLi5cbiAgICAgICAgZG9tKCdzcGFuJywgJHRhYikub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KXtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKCdDbG9zaW5nICcgKyBlbnRpdHkubmFtZSk7XG4gICAgICAgICAgYXBwLmVtaXQoJ2Nsb3NlLWVudGl0eScsIGVudGl0eS5yZWxQYXRoKTtcblxuICAgICAgICB9KTtcblxuICAgICAgICBlZGl0U2Vzc2lvbnMudW5zaGlmdCh7XG4gICAgICAgICAgZW50aXR5IDogZW50aXR5LFxuICAgICAgICAgIGJvZHkgOiBib2R5LFxuICAgICAgICAgIHBhdGggOiBwYXRoLFxuICAgICAgICAgIHRhYiA6ICR0YWJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZWRpdFNlc3Npb25zWzBdLnRhYi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIGVkaXRvci5vcGVuKGVkaXRTZXNzaW9uc1swXS5lbnRpdHksIGVkaXRTZXNzaW9uc1swXS5ib2R5KVxuXG4gICAgICB9IGVsc2UgaWYgKHNlc3Npb25JbmRleCA9PT0gMCkge1xuXG4gICAgICAgIC8vIGFjdHVhbGx5IGRvIG5vdGhpbmcuIEl0J3MgYWxyZWFkeSBvcGVuLlxuXG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIC8vIHdlIHdhbnQgdG8gcHVsbCBhbiBleGlzdGluZyBzZXNzaW9uIHRvIHRoZSBmcm9udC4uLlxuICAgICAgICAgIC8vIHdlIGRlYWN0aXZhdGUgdGhlIGN1cnJlbnQgdGhpbmcuLi5cbiAgICAgICAgICBlZGl0U2Vzc2lvbnNbMF0udGFiLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAvLyBwZXJzaXN0IHRoZSBjdXJyZW50IHVzZXIgY29udGVudC4uLlxuICAgICAgICAgIGVkaXRTZXNzaW9uc1swXS5ib2R5ID0gZWRpdG9yLnJlYWQoKTtcbiAgICAgICAgICAvLyBhbmQgY2xvc2UuLi5cbiAgICAgICAgICBlZGl0b3IuY2xvc2UoKTtcblxuICAgICAgICAgIC8vIHRoaXMgcG9wcyBpdCB0byB0aGUgZnJvbnQuLlxuICAgICAgICAgIGVkaXRTZXNzaW9ucy51bnNoaWZ0KGVkaXRTZXNzaW9ucy5zcGxpY2UoW3Nlc3Npb25JbmRleF0sIDEpWzBdKTtcblxuXG4gICAgICAgICAgLy8gdGhlbiB3ZSBjYW4gbWFrZSBpdCBhY3RpdmUuLlxuICAgICAgICAgIGVkaXRTZXNzaW9uc1swXS50YWIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgIGVkaXRvci5vcGVuKGVkaXRTZXNzaW9uc1swXS5lbnRpdHksIGVkaXRTZXNzaW9uc1swXS5ib2R5LCBib2R5KTtcbiAgICAgICAgICAvLyByZXN0b3JlIHRoZSBvcmlnaW5hbCB2ZXJzaW9uLi5cbiAgICAgICAgICBlZGl0U2Vzc2lvbnNbMF0uYm9keSA9IGJvZHk7XG5cblxuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfSk7XG5cbiAgYXBwLm9uKCdjbG9zZS1lbnRpdHknLCBmdW5jdGlvbiAocGF0aCl7XG5cbiAgICB2YXIgc2Vzc2lvbkluZGV4ID0gZmluZFNlc3Npb25JbmRleChwYXRoKTtcblxuICAgIHZmcy5yZWFkRmlsZShwYXRoLCBmdW5jdGlvbiAoZXJyLCBlbnRpdHksIGJvZHkpe1xuXG4gICAgICBpZiAoc2Vzc2lvbkluZGV4ICE9PSBmYWxzZSl7XG5cbiAgICAgICAgLy8gdGhpcyBpcyBhIHNlc3Npb24gd2hpY2ggaXNuJ3QgY3VycmVudGx5IGFjdGl2ZS4uXG4gICAgICAgIGlmIChlZGl0U2Vzc2lvbnNbc2Vzc2lvbkluZGV4XS5ib2R5ICE9PSBib2R5KXtcbiAgICAgICAgICBwb3B1cHMuY29uZmlybShlZGl0U2Vzc2lvbnNbc2Vzc2lvbkluZGV4XS5lbnRpdHkubmFtZSwgJ1lvdSBoYXZlIHNvbWUgdW5zYXZlZCBjaGFuZ2VzLiBEbyB5b3Ugd2FudCB0bzonLCBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0ZXh0IDogJ0Nsb3NlIHdpdGhvdXQgc2F2aW5nPycsXG4gICAgICAgICAgICAgICAgY2xhc3NlcyA6ICcnLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrIDogZnVuY3Rpb24gY2xvc2VXaXRob3V0U2F2aW5nKCl7XG5cbiAgICAgICAgICAgICAgICAgIGNsb3NlRW50aXR5KHNlc3Npb25JbmRleCk7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0ZXh0IDogJ1NhdmUgaXQsIHRoZW4gY2xvc2U/JyxcbiAgICAgICAgICAgICAgICBjbGFzc2VzIDogJycsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgOiBmdW5jdGlvbiBjbG9zZUFuZFNhdmUoKXtcblxuICAgICAgICAgICAgICAgICAgc2F2ZUVudGl0eShlZGl0U2Vzc2lvbnNbc2Vzc2lvbkluZGV4XS5lbnRpdHksIGVkaXRvci5yZWFkKCkpO1xuICAgICAgICAgICAgICAgICAgY2xvc2VFbnRpdHkoc2Vzc2lvbkluZGV4KTtcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0ZXh0IDogJ0p1c3QgbGVhdmUgaXQgb3BlbiBmb3Igbm93PycsXG4gICAgICAgICAgICAgICAgY2xhc3NlcyA6ICcnLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrIDogZnVuY3Rpb24gY2xvc2VBbmRTYXZlKCl7XG4gICAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nLi4gXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sICAgICAgICAgICAgIFxuICAgICAgICAgICAgXSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjbG9zZUVudGl0eShzZXNzaW9uSW5kZXgpO1xuICAgICAgICB9XG5cblxuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfSk7XG5cbiAgYXBwLm9uKCdpbmZvLWVudGl0eScsIGZ1bmN0aW9uIChwYXRoKXtcblxuXG5cbiAgfSk7XG5cbiAgZWRpdG9yLm9uKCd1bnN5bmNlZCcsIGZ1bmN0aW9uIChlbnRpdHkpe1xuXG4gICAgdmFyIGluZGV4ID0gZmluZFNlc3Npb25JbmRleChlbnRpdHkucmVsUGF0aCk7XG5cbiAgICBpZiAoaW5kZXggIT09IGZhbHNlKXtcblxuICAgICAgZG9tKCdhJywgZWRpdFNlc3Npb25zW2luZGV4XS50YWIpLmh0bWwoJzxlbT4nICsgZW50aXR5Lm5hbWUgKyBcIjwvZW0+ICogXCIgKTsgICAgXG5cbiAgICB9XG5cbiAgfSk7XG5cbiAgZWRpdG9yLm9uKCdzeW5jZWQnLCBmdW5jdGlvbiAoZW50aXR5KXtcblxuICAgIHZhciBpbmRleCA9IGZpbmRTZXNzaW9uSW5kZXgoZW50aXR5LnJlbFBhdGgpO1xuXG4gICAgaWYgKGluZGV4ICE9PSBmYWxzZSl7XG5cbiAgICAgIGRvbSgnYScsIGVkaXRTZXNzaW9uc1tpbmRleF0udGFiKS5odG1sKCBlbnRpdHkubmFtZSApOyAgICBcblxuICAgIH1cblxuICB9KTtcblxuICBlZGl0b3Iub24oJ3NhdmUnLCBmdW5jdGlvbiAoZW50aXR5LCBib2R5KXtcblxuXG4gICAgc2F2ZUVudGl0eShlbnRpdHksIGJvZHkpO1xuXG4gICAgdmFyIGluZGV4ID0gZmluZFNlc3Npb25JbmRleChlbnRpdHkucmVsUGF0aCk7XG5cbiAgICBpZiAoaW5kZXggIT09IGZhbHNlKXtcbiAgICAgIGVkaXRTZXNzaW9uc1tpbmRleF0uYm9keSA9IGJvZHk7XG4gICAgfVxuXG5cbiAgfSk7XG5cbiAgLy8gbmV3IGVudGl0aWVzIGZyb20gdGhlIFxuICBmdW5jdGlvbiBmaW5kU2Vzc2lvbkluZGV4IChwYXRoKXtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRpdFNlc3Npb25zLmxlbmd0aDsgaSsrKXtcbiAgICAgIGlmIChlZGl0U2Vzc2lvbnNbaV0ucGF0aCA9PT0gcGF0aCkgcmV0dXJuIGk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIH1cblxuICBmdW5jdGlvbiBjbG9zZUVudGl0eSAoc2Vzc2lvbklkKXtcblxuICAgICAgZWRpdFNlc3Npb25zW3Nlc3Npb25JZF0udGFiLnJlbW92ZSgpO1xuXG4gICAgICAvLyBkZXN0cm95IHRoZSByZWZlcmVuY2UgdG8gdGFiLi4uIFxuICAgICAgZWRpdFNlc3Npb25zW3Nlc3Npb25JZF0udGFiID0gbnVsbDtcbiAgICAgIC8vIHJlbW92ZSB0aGUgc2Vzc2lvbi4uXG4gICAgICBlZGl0U2Vzc2lvbnMuc3BsaWNlKHNlc3Npb25JZCwgMSk7XG5cbiAgICBpZiAoc2Vzc2lvbklkID09PSAwICYmIGVkaXRTZXNzaW9ucy5sZW5ndGgpeyAvLyBpcyB0aGVyZSBhbm90aGVyIHNlc3Npb24/XG4gICAgICBcbiAgICAgIGVkaXRTZXNzaW9uc1swXS50YWIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgZWRpdG9yLm9wZW4oZWRpdFNlc3Npb25zWzBdLmVudGl0eSwgZWRpdFNlc3Npb25zWzBdLmJvZHkpXG5cbiAgICB9IGVsc2UgaWYgKHNlc3Npb25JZCA9PT0gMCAmJiAhZWRpdFNlc3Npb25zLmxlbmd0aCl7XG4gICAgICBlZGl0b3IuY2xvc2UoKTtcbiAgICB9XG4gICAgLy8gc3VibWl0IHRvIHRoZSBtZXJjeSBvZiB0aGUgZ2FyYmFnZSBjb2xsZWN0b3IuLlxuXG4gIH1cblxuICBmdW5jdGlvbiBzYXZlRW50aXR5IChlbnRpdHksIGJvZHkpe1xuXG5cbiAgICBjb25zb2xlLmxvZygnU2F2aW5nICcgKyBlbnRpdHkubmFtZSk7XG5cbiAgICB2ZnMud3JpdGVGaWxlKGVudGl0eS5yZWxQYXRoLCBib2R5LCBmdW5jdGlvbiAoZXJyLCBlbnRpdHkpe1xuICAgICAgaWYgKCFlcnIpe1xuICAgICAgICAvLyB3ZSBhY3R1YWxseSBkb24ndCBuZWVkIHRvIGRvIGFueXRoaWduIGhlcmUgYXQgdGhpcyBwb2ludC4uLiBcbiAgICAgICAgY29uc29sZS5sb2coZW50aXR5Lm5hbWUgKyBcIiBzYXZlZFwiKTtcbiAgICAgICAgaWYgKGVkaXRTZXNzaW9uc1swXS5lbnRpdHkucmVsUGF0aCA9PT0gZW50aXR5LnJlbFBhdGgpe1xuICAgICAgICAgIGVkaXRvci5zeW5jZWQoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ09vcHMhIFVuYWJsZSB0byBzYXZlIScpO1xuICAgICAgfVxuXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb250ZW50TWVudSAoKXtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAqL1xuXG59OyIsInZhciBkb20gPSByZXF1aXJlKCdncmVlbi1tZXNhLWRvbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcHAsIGJveCl7XG5cbiAgdmFyICRtZW51ID0gZG9tKCcnICsgXG4gICAgJzx1bCBjbGFzcz1cImJveC1pbm5lciBtZW51LWNvbnRlbnRcIj4nICtcbiAgICAnPGxpPjxzcGFuIGNsYXNzPVwidHlwY24gdHlwY24tdGgtbWVudVwiPjwvc3Bhbj4nICsgXG4gICAgICAnPHVsPicgKyBcbiAgICAgICAgJzxsaT48YSBocmVmPVwiI1wiIHJlbD1cInJlbHMvc2F2ZS1maWxlXCI+PHNwYW4gY2xhc3M9XCJ0eXBjbiB0eXBjbi1hcnJvdy1zeW5jXCI+PC9zcGFuPlNhdmU8L2E+PC9saT4nICsgXG4gICAgICAnPC91bD4nICsgXG4gICAgJzwvbGk+JyArXG4gICc8L3VsPicpO1xuXG4gICRtZW51LmFwcGVuZFRvKGJveC5lbGVtZW50KTtcblxuICBkb20oJ2FbcmVsPVwicmVscy9zYXZlLWZpbGVcIl0nLCAkbWVudSkub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpe1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGFwcC5lbWl0KCdzYXZlLWVudGl0eScpO1xuXG4gIH0pO1xuXG5cbn0iLCIvLyBhbGwgSSB3YW50IHRvIGRvIGluaXRpYWxseSwgYXMgYSB0ZXN0LCBpcyBnZXQgYSBsaXN0IG9mIGZpbGVzLi4uIFxuXG52YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ2Jyb3dzZXItcmVxdWVzdCcpO1xudmFyIHZmc1Jvb3QgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL3Zmc1wiO1xudmFyIHNvY2tSb290ID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9jb21tc1wiXG52YXIgZG9taWZ5ID0gcmVxdWlyZSgnZG9taWZ5Jyk7XG52YXIgbWFya2VkID0gcmVxdWlyZSgnbWFya2VkJyk7XG52YXIgRGVsZWdhdGUgPSByZXF1aXJlKCdkb20tZGVsZWdhdGUnKS5EZWxlZ2F0ZTtcblxuXG4vLyBhcHBsaWNhdGlvbiBsZXZlbCBicm9rZXIuLi4gXG52YXIgYXBwID0gbmV3IChyZXF1aXJlKCdldmVudHMnKSkuRXZlbnRFbWl0dGVyKCk7XG5cbi8vIGxheW91dCBwcm92aWRlci4uXG52YXIgbGF5b3V0ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2xheW91dC5qcycpKClcblxudmFyIGNvbnNvbGUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvY29uc29sZS5qcycpO1xuLy8gdmlydHVhbCBmaWxlIHN5c3RlbS4uLlxudmFyIHZmcyA9IHJlcXVpcmUoJy4vbGliL2ZpbGUtc3lzdGVtJykuaW5pdGlhbGlzZUZpbGVTeXN0ZW0odmZzUm9vdCwgc29ja1Jvb3QpO1xuXG4vLyBpbml0aWFsaXNlIHRoZSBlbnRpdHkgc2VsZWN0b3IuIFRoaXMgTVVTVCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB2ZnM6c3luYyBldmVudC5cbnZhciBlbnRpdHlTZWxlY3RvciA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9lbnRpdHktc2VsZWN0b3IuanMnKSh2ZnMsIGFwcCwgbGF5b3V0Lm5hdik7XG5cbnZhciB0b3BNZW51ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL3RvcC1tZW51LmpzJykoYXBwLCBsYXlvdXQubWVudSlcblxuLy8gYW4gaW5zdGFuY2Ugb2YgdGhlIGVkaXRvciBhYnN0cmFjdGlvbi4uXG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2VkaXRvci5qcycpKGxheW91dC5lZGl0b3IsIGxheW91dCk7XG4vLyBhbiBpbnN0YW5jZSBvZiB0aGUgaW5mbyBlZGl0b3IgYWJzdHJhY3Rpb24uLlxudmFyIGluZm8gPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvaW5mby5qcycpKGxheW91dC5lZGl0b3IsIGxheW91dCk7XG4vLyBhbiBpbnN0YW5jZSBvZiB0aGUgZWRpdG9yIGFic3RyYWN0aW9uLi5cbnZhciBwcmV2aWV3ZXIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvcHJldmlld2VyLmpzJykobGF5b3V0LmVkaXRvciwgbGF5b3V0KTtcblxuLy8gYW4gZWRpdCBzZXNzaW9uIG1hbmFnZXIuXG52YXIgc2Vzc2lvbnMgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvc2Vzc2lvbnMuanMnKShhcHAsIHZmcywgZWRpdG9yLCBpbmZvLCBwcmV2aWV3ZXIsIGxheW91dC50YWJzKTtcblxuLy8gbm93IHdlIHdhbnQgdG8gbGlzdGVuIHRvIHZhcmlvdXMgc2lnbmFscyBjb21pbmcgZnJvbSB0aGUgZW50aXR5IHNlbGVjdG9yIHNvIHRoYXQgd2UgXG4vLyBjYW4gYWN0dWFsbHkgaW50ZXJhY3Qgd2l0aCB0aGUgc3lzdGVtLi4uXG5cbndpbmRvdy5vbmtleWRvd24gPSBmdW5jdGlvbiAoZSl7XG5cbiAgaWYoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpKXtcblxuICAgIGlmIChlLndoaWNoID09IDgzKSB7XG5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGFwcC5lbWl0KCdzYXZlLWVudGl0eScpO1xuXG4gICAgfVxuXG4gIH1cblxufVxuXG5cblxuLy8gdGhlIGVudGl0eSBzZWxlY3RvciAob3IgJ2ZpbGUgbmF2aWdhdGlvbiB0aGluZycgdG8geW91IGFuZCBJLCBidXQgd2UgY2FuJ3QgY2FsbCBpdCB0aGF0KVxuXG5cblxuLypcblxudmFyICQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yLmJpbmQoZG9jdW1lbnQpO1xuXG4kKCdib2R5Jykub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG5cbnZhciBTb2Nrc0pTID0gcmVxdWlyZSgnLi9saWIvc29ja3MuanMnKTtcblxuXG5cbnZhciBhY2UgPSByZXF1aXJlKCdicmFjZScpO1xucmVxdWlyZSgnYnJhY2UvbW9kZS9qc29uJyk7XG5yZXF1aXJlKCdicmFjZS9tb2RlL21hcmtkb3duJyk7XG5yZXF1aXJlKCdicmFjZS90aGVtZS9tb25va2FpJyk7XG5cbnZhciBmaWxlU3lzdGVtID0ge1xuICBjaGlsZHJlbiA6IHtcbiAgICByb290IDoge1xuICAgICAgZW50aXRpZXMgOiBbXSxcbiAgICAgIG5hbWUgOiBcIi9cIixcbiAgICAgIGhyZWYgOiB2ZnNSb290ICsgXCIvXCIsXG4gICAgICBjaGlsZHJlbiA6IHt9LFxuICAgICAgcGFyZW50IDogZmFsc2VcbiAgICB9XG4gIH1cbn07XG5cbnZhciBzb2NrZXQgPSBuZXcgU29ja3NKUyhzb2NrUm9vdCk7XG5cbnNvY2tldC5vbm9wZW4gPSBmdW5jdGlvbiAoKXtcbiAgY29uc29sZS5sb2coJ3NvY2tldCBvcGVuIScpO1xufVxuc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChlKXtcblxuICB2YXIgbXNnID0gSlNPTi5wYXJzZShlLmRhdGEpO1xuXG4gIGZvciAodmFyIGkgaW4gbXNnKXtcblxuICAgIGNvbnNvbGUubG9nKG1zZ1tpXSwgaSlcblxuICB9XG5cbn1cblxudmFyIGVkaXRTZXNzaW9ucyA9IHt9O1xudmFyIGFjdGl2ZURpcmVjdG9yeSA9IGZhbHNlO1xudmFyIGFjdGl2ZVNlc3Npb24gPSBmYWxzZTtcbnZhciBkaXJlY3RvcnlDYWNoZSA9IHt9O1xuXG52YXIgZmlsZVN5c3RlbVZpZXdFbGVtZW50cyA9IHt9O1xudmFyIGZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaDtcblxudmFyIHBhZ2UgPSBjcmVhdGVCb3goJ3BhZ2UnKTtcbnBhZ2UucG9zaXRpb24oMCwwKTtcbnBhZ2Uuc2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KTtcbnBhZ2UuYXBwZW5kVG9FbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKSk7XG5cbnZhciB0b3BNZW51ID0gY3JlYXRlQm94KCd0b3AtbWVudScpO1xudG9wTWVudS5wb3NpdGlvbigwLDApO1xudG9wTWVudS5zaXplKHdpbmRvdy5pbm5lcldpZHRoLCAzMCk7XG5cbnZhciB0b3BNZW51Q29udGVudCA9IGRvbWlmeShbXG4gICc8dWwgY2xhc3M9XCJib3gtaW5uZXIgbWVudS1jb250ZW50XCI+JyxcbiAgJzxsaT48c3Bhbj5GaWxlPC9zcGFuPjx1bD48bGk+PGEgaHJlZj1cIiNcIiByZWw9XCJyZWxzL25ldy1maWxlXCI+TmV3IGZpbGU8L2E+PC9saT48bGk+PGEgaHJlZj1cIiNcIiByZWw9XCJyZWxzL25ldy1mb2xkZXJcIj5OZXcgZm9sZGVyPC9hPjwvbGk+PC91bD48L2xpPicsXG4gICc8L3VsPidcbl0uam9pbignXFxuJykpO1xuXG50b3BNZW51LmFkZEVsZW1lbnQodG9wTWVudUNvbnRlbnQpO1xuXG52YXIgZmlsZU5hdmlnYXRpb24gPSBjcmVhdGVCb3goJ2ZpbGUtbmF2Jyk7XG5maWxlTmF2aWdhdGlvbi5wb3NpdGlvbigwLCh0b3BNZW51LnNpemUoKS55KSk7XG5maWxlTmF2aWdhdGlvbi5zaXplKDMwMSwgd2luZG93LmlubmVySGVpZ2h0IC0gdG9wTWVudS5zaXplKCkueSk7XG5wYWdlLmFkZEJveChmaWxlTmF2aWdhdGlvbik7XG5cbnZhciBmaWxlcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG5maWxlcy5jbGFzc05hbWUgPSBcImJveC1pbm5lciBmaWxlc1wiO1xuZmlsZU5hdmlnYXRpb24uYWRkRWxlbWVudChmaWxlcyk7XG5cblxudmFyIGNvbnRlbnRWaWV3ID0gY3JlYXRlQm94KCdjb250ZW50LXZpZXcnKTtcbmNvbnRlbnRWaWV3LnBvc2l0aW9uKDMwMSwodG9wTWVudS5zaXplKCkueSkpO1xuY29udGVudFZpZXcuc2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCAtIDMwMiwgd2luZG93LmlubmVySGVpZ2h0IC0gdG9wTWVudS5zaXplKCkueSk7XG5wYWdlLmFkZEJveChjb250ZW50Vmlldyk7XG5cbnZhciBjb250ZW50ID0gZG9taWZ5KFtcbiAgJzxkaXYgY2xhc3M9XCJib3gtaW5uZXIgY29udGVudFwiPicsXG4gICc8dWwgY2xhc3M9XCJ0YWJzXCI+PC91bD4nLFxuICAnPHVsIGNsYXNzPVwidGFiLWJvZGllc1wiPjwvdWw+JyxcbiAgJzwvZGl2Pidcbl0uam9pbignXFxuJykpO1xuXG5cbiAgXG4gIC8vIGRvZXNuJ3QgYmVsb25nIGhlcmUuLi5cbiAgdmFyIHRvcE1lbnVDb250ZW50ID0gZG9taWZ5KFtcbiAgICAnPHVsIGNsYXNzPVwiYm94LWlubmVyIG1lbnUtY29udGVudFwiPicsXG4gICAgJzxsaT48c3Bhbj5GaWxlPC9zcGFuPjx1bD48bGk+PGEgaHJlZj1cIiNcIiByZWw9XCJyZWxzL25ldy1maWxlXCI+TmV3IGZpbGU8L2E+PC9saT48bGk+PGEgaHJlZj1cIiNcIiByZWw9XCJyZWxzL25ldy1mb2xkZXJcIj5OZXcgZm9sZGVyPC9hPjwvbGk+PC91bD48L2xpPicsXG4gICAgJzwvdWw+J1xuICBdLmpvaW4oJ1xcbicpKTtcblxuICB0b3BNZW51LmFkZEVsZW1lbnQodG9wTWVudUNvbnRlbnQpO1xuICBcblxuY29udGVudFZpZXcuYWRkRWxlbWVudChjb250ZW50KTtcblxucGFnZS5hZGRCb3godG9wTWVudSk7XG5cbnZhciBkZWxlZ2F0ZSA9IG5ldyBEZWxlZ2F0ZShkb2N1bWVudC5ib2R5KTtcblxuZGVsZWdhdGUub24oJ2NsaWNrJywgJ3VsLm1lbnUtY29udGVudCBsaSB1bCBsaSBhJywgZnVuY3Rpb24gKGUpe1xuXG4gIHZhciByZWwgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ3JlbCcpO1xuXG4gIHN3aXRjaCAocmVsKXtcblxuICAgIGNhc2UgXCJyZWxzL25ldy1mb2xkZXJcIjogXG5cbiAgICAgIGNyZWF0ZUZvbGRlcihhY3RpdmVEaXJlY3RvcnkpO1xuXG4gICAgICBicmVhaztcblxuICAgIGNhc2UgXCJyZWxzL25ldy1maWxlXCI6XG5cbiAgICAgIGNyZWF0ZUZpbGUoYWN0aXZlRGlyZWN0b3J5KTtcblxuICAgICAgYnJlYWs7XG5cbiAgfVxuXG59KTtcblxuXG5mdW5jdGlvbiBnZXRDb250ZW50Vmlld1NpemUgKCl7XG4gIHZhciBoZWFkZXJIZWlnaHQgPSBjb250ZW50LnF1ZXJ5U2VsZWN0b3IoJ3VsLnRhYnMnKS5vZmZzZXRIZWlnaHQ7XG4gIHZhciBwYWdlU2l6ZSA9IGNvbnRlbnRWaWV3LnNpemUoKTtcbiAgcmV0dXJuIHtcbiAgICB4IDogcGFnZVNpemUueCxcbiAgICB5IDogcGFnZVNpemUueSxcbiAgICBoZWFkZXJIZWlnaHQgOiBoZWFkZXJIZWlnaHRcbiAgfVxuXG59O1xuXG53aW5kb3cub25yZXNpemUgPSBmdW5jdGlvbiAoZXZlbnQpe1xuICBwYWdlLnNpemUod2luZG93LmlubmVyV2lkdGgsIHdpbmRvdy5pbm5lckhlaWdodCk7XG4gIGZpbGVOYXZpZ2F0aW9uLnNpemUoMzAwLCB3aW5kb3cuaW5uZXJIZWlnaHQpO1xuICBjb250ZW50Vmlldy5zaXplKHdpbmRvdy5pbm5lcldpZHRoIC0gMzAxLCB3aW5kb3cuaW5uZXJIZWlnaHQpO1xufVxuXG53aW5kb3cub25rZXlkb3duID0gZnVuY3Rpb24gKGUpe1xuICBpZigoZS5jdHJsS2V5IHx8IGUubWV0YUtleSkgJiYgZS53aGljaCA9PSA4Mykge1xuICAgICAgLy8gU2F2ZSBGdW5jdGlvblxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgc2F2ZVNlc3Npb24oKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2F2ZVNlc3Npb24gKCl7XG5cbiAgdmFyIHZhbCA9IGFjdGl2ZVNlc3Npb24uZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpO1xuXG4gIGlmICh2YWwgIT09IGFjdGl2ZVNlc3Npb24ub3JpZ2luYWxWYWx1ZSl7XG4gIFxuICAgIHZhciBiZWluZ1NhdmVkID0gYWN0aXZlU2Vzc2lvbjtcblxuICAgIHNhdmVGaWxlKGFjdGl2ZVNlc3Npb24ucGF0aCwgdmFsLCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSl7XG5cbiAgICAgIGlmICghZXJyKXtcblxuICAgICAgICB2YXIgY3VycmVudFZhbCA9IGJlaW5nU2F2ZWQuZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpO1xuICAgICAgICBpZiAoY3VycmVudFZhbCA9PT0gdmFsKXtcbiAgICAgICAgICBiZWluZ1NhdmVkLnRhYkhlYWRlci5xdWVyeVNlbGVjdG9yKCdhJykuaW5uZXJUZXh0ID0gYmVpbmdTYXZlZC5lbnRpdHkubmFtZVxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFsZXJ0KGVycik7XG4gICAgICB9XG5cbiAgICB9KVxuXG4gIH1cblxufVxuXG5mdW5jdGlvbiBlbmRTZXNzaW9uIChlbnRpdHkpe1xuXG4gIHZhciBzZXNzaW9uID0gZWRpdFNlc3Npb25zW2VudGl0eS5ocmVmXTtcblxuICB2YXIgdmFsID0gc2Vzc2lvbi5lZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCk7XG5cbiAgaWYgKHZhbCAhPT0gc2Vzc2lvbi5vcmlnaW5hbFZhbHVlKXtcbiAgICBpZighY29uZmlybSgnWW91IHdpbGwgbG9zZSBjaGFuZ2VzLiBBcmUgeW91IHN1cmUgeW91IHdpc2ggdG8gcXVpdD8nKSl7XG4gICAgICByZXR1cm47XG5cbiAgICB9XG4gIH1cblxuICBzZXNzaW9uLmVkaXRvci5kZXN0cm95KCk7XG4gIHNlc3Npb24udGFiSGVhZGVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2Vzc2lvbi50YWJIZWFkZXIpO1xuICBzZXNzaW9uLnRhYi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNlc3Npb24udGFiKTtcbiAgc2Vzc2lvbi50YWIgPSBudWxsO1xuICBzZXNzaW9uLnRhYkhlYWRlci5xdWVyeVNlbGVjdG9yKCdhJykub25jbGljayA9IG51bGw7XG4gIHNlc3Npb24udGFiSGVhZGVyLnF1ZXJ5U2VsZWN0b3IoJ3NwYW4udHlwY24tZGVsZXRlJykub25jbGljayA9IG51bGw7XG4gIHNlc3Npb24udGFiSGVhZGVyID0gbnVsbDtcbiAgZGVsZXRlIGVkaXRTZXNzaW9uc1tlbnRpdHkuaHJlZl07XG5cbn1cblxuZnVuY3Rpb24gY3JlYXRlQm94IChjbGFzc05hbWUpe1xuXG4gIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB2YXIgc3R5bGUgPSBlbC5zdHlsZTtcbiAgZWwuY2xhc3NOYW1lID0gXCJib3ggXCIgKyBjbGFzc05hbWUgO1xuICBzdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgc3R5bGUudG9wID0gXCIwcHhcIjtcbiAgc3R5bGUubGVmdCA9IFwiMHB4XCI7XG4gIHN0eWxlLndpZHRoID0gXCIwcHhcIjtcbiAgc3R5bGUuaGVpZ2h0ID0gXCIwcHhcIjtcblxuICByZXR1cm4ge1xuICAgIGVsZW1lbnQgOiBlbCxcbiAgICBwb3NpdGlvbiA6IGZ1bmN0aW9uICh4LCB5KXtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgeCA6IHBhcnNlSW50KHN0eWxlLmxlZnQsIDEwKSxcbiAgICAgICAgICB5IDogcGFyc2VJbnQoc3R5bGUudG9wLCAxMClcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICAgIHN0eWxlLnRvcCA9IHkgKyBcInB4XCI7XG4gICAgICBzdHlsZS5sZWZ0ID0geCArIFwicHhcIjtcbiAgICB9LFxuICAgIHNpemUgOiBmdW5jdGlvbiAoeCwgeSl7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHggOiBwYXJzZUludChzdHlsZS53aWR0aCwgMTApLFxuICAgICAgICAgIHkgOiBwYXJzZUludChzdHlsZS5oZWlnaHQsIDEwKVxuICAgICAgICB9XG4gICAgICB9IFxuICAgICAgc3R5bGUuaGVpZ2h0ID0geSArIFwicHhcIjtcbiAgICAgIHN0eWxlLndpZHRoID0geCArIFwicHhcIjtcbiAgICB9LFxuICAgIGFkZEJveCA6IGZ1bmN0aW9uIChib3gpe1xuICAgICAgYm94LmFwcGVuZFRvRWxlbWVudChlbCk7XG4gICAgfSxcbiAgICBhZGRFbGVtZW50IDogZnVuY3Rpb24gKGVsZW1lbnQpe1xuICAgICAgZWwuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG4gICAgfSxcbiAgICBhcHBlbmRUb0VsZW1lbnQgOiBmdW5jdGlvbiAoZWxlbWVudCl7XG4gICAgICBlbGVtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICB9XG4gIH1cblxufVxuXG5mdW5jdGlvbiBjcmVhdGVBY2VJbnN0YW5jZSAoZWxlbWVudCl7XG4gIHZhciBlZGl0b3IgPSBhY2UuZWRpdChlbGVtZW50KTtcbiAgZWRpdG9yLmdldFNlc3Npb24oKS5zZXRNb2RlKCdhY2UvbW9kZS9tYXJrZG93bicpO1xuICBlZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gIGVkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuICByZXR1cm4gZWRpdG9yO1xufVxuXG5cblxuZnVuY3Rpb24gaW5zZXJ0VGV4dCAobm9kZSwgdGV4dCl7XG4gIG5vZGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dCkpO1xufVxuXG5mdW5jdGlvbiBtYWtlRWRpdFNlc3Npb25BY3RpdmUgKGVudGl0eSl7XG5cbiAgdmFyIHNlc3Npb247XG5cbiAgc2Vzc2lvbiA9IGVkaXRTZXNzaW9uc1tlbnRpdHkuaHJlZl07XG5cbiAgZm9yRWFjaC5jYWxsKGNvbnRlbnQucXVlcnlTZWxlY3RvckFsbCgndWwudGFiLWJvZGllcyBsaScpLCBmdW5jdGlvbiAobGkpe1xuICAgIGxpLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIH0pO1xuXG4gIGZvckVhY2guY2FsbChjb250ZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3VsLnRhYnMgbGkuYWN0aXZlJyksIGZ1bmN0aW9uIChsaSl7XG4gICAgbGkuY2xhc3NOYW1lID0gbGkuY2xhc3NOYW1lLnJlcGxhY2UoJ2FjdGl2ZScsICcnKTtcbiAgfSk7XG5cbiAgc2Vzc2lvbi50YWIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gIHNlc3Npb24udGFiSGVhZGVyLmNsYXNzTmFtZSArPSBcImFjdGl2ZVwiO1xuXG4gIGFjdGl2ZVNlc3Npb24gPSBzZXNzaW9uO1xuXG59XG5cbmZ1bmN0aW9uIGVkaXRGaWxlIChlbnRpdHksIGVsZW1lbnQsIGV2ZW50KXtcblxuICBpZiAoIWV2ZW50IHx8IChldmVudC53aGljaCA9PT0gMSAmJiBldmVudC50YXJnZXQudGFnTmFtZSAhPT0gXCJJTlBVVFwiKSl7XG5cbiAgICB2YXIgc2Vzc2lvbjtcblxuICAgIGlmICghZWRpdFNlc3Npb25zW2VudGl0eS5ocmVmXSl7XG4gICAgICBzZXNzaW9uID0gY3JlYXRlRWRpdFNlc3Npb24oZW50aXR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2Vzc2lvbiA9IGVkaXRTZXNzaW9uc1tlbnRpdHkuaHJlZl07XG4gICAgfVxuXG4gICAgbG9hZEZpbGUoZW50aXR5LmhyZWYsIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlKXtcblxuICAgICAgdmFyIG9yaWdpbmFsVmFsdWUgPSByZXNwb25zZTsgXG4gICAgICBzZXNzaW9uLm9yaWdpbmFsVmFsdWUgPSBvcmlnaW5hbFZhbHVlO1xuICAgICAgc2Vzc2lvbi5lZGl0b3Iuc2V0VmFsdWUob3JpZ2luYWxWYWx1ZSk7XG5cbiAgICAgIHNlc3Npb24uZWRpdG9yLmdldFNlc3Npb24oKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGUpe1xuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gc2Vzc2lvbi5lZGl0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAhPT0gb3JpZ2luYWxWYWx1ZSl7XG4gICAgICAgICAgc2Vzc2lvbi50YWJIZWFkZXIucXVlcnlTZWxlY3RvcignYScpLmlubmVyVGV4dCA9IHNlc3Npb24uZW50aXR5Lm5hbWUgKyBcIiAqIFwiIFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlc3Npb24udGFiSGVhZGVyLnF1ZXJ5U2VsZWN0b3IoJ2EnKS5pbm5lclRleHQgPSBzZXNzaW9uLmVudGl0eS5uYW1lXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIGZvckVhY2guY2FsbChjb250ZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3VsLnRhYi1ib2RpZXMgbGknKSwgZnVuY3Rpb24gKGxpKXtcbiAgICAgICAgbGkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIH0pO1xuXG4gICAgICBmb3JFYWNoLmNhbGwoY29udGVudC5xdWVyeVNlbGVjdG9yQWxsKCd1bC50YWJzIGxpLmFjdGl2ZScpLCBmdW5jdGlvbiAobGkpe1xuICAgICAgICBsaS5jbGFzc05hbWUgPSBsaS5jbGFzc05hbWUucmVwbGFjZSgnYWN0aXZlJywgJycpO1xuICAgICAgfSk7XG5cbiAgICAgIHNlc3Npb24udGFiLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgc2Vzc2lvbi50YWJIZWFkZXIuY2xhc3NOYW1lICs9IFwiYWN0aXZlXCI7XG5cbiAgICAgIGFjdGl2ZVNlc3Npb24gPSBzZXNzaW9uO1xuXG4gICAgfSk7XG5cbiAgfSBlbHNlIGlmIChldmVudC53aGljaCA9PT0gMyl7XG5cbiAgICB2YXIgY2xpY2tTaGllbGQgPSBkb21pZnkoJzxkaXY+PC9kaXY+Jyk7XG4gICAgY2xpY2tTaGllbGQuc3R5bGUud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCArIFwicHhcIjtcbiAgICBjbGlja1NoaWVsZC5zdHlsZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgKyBcInB4XCI7XG4gICAgY2xpY2tTaGllbGQuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgY2xpY2tTaGllbGQuc3R5bGUudG9wID0gXCIwcHhcIjtcbiAgICBjbGlja1NoaWVsZC5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcblxuICAgICQoJ2JvZHknKS5hcHBlbmRDaGlsZChjbGlja1NoaWVsZCk7XG5cbiAgICB2YXIgcmVzZXQgPSBmdW5jdGlvbiByZXNldCgpe1xuICAgICAgY2xpY2tTaGllbGQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCByZXNldCk7XG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2hpbGQoY2xpY2tTaGllbGQpO1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNoaWxkKGNvbnRleHRNZW51KVxuICAgIH1cblxuICAgIGNsaWNrU2hpZWxkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVzZXQpO1xuXG4gICAgLy8gcmlnaHQuLi5cbiAgICB2YXIgY29udGV4dE1lbnUgPSBkb21pZnkoJzx1bCBjbGFzcz1cImNvbnRleHQtbWVudVwiPicgK1xuICAgICAgJzxsaT48YSBocmVmPVwiI1wiIHJlbD1cInJlbHMvcmVuYW1lLWZpbGVcIj5SZW5hbWU8L2E+PC9saT4nICtcbiAgICAgICc8bGk+PGEgaHJlZj1cIiNcIiByZWw9XCJyZWxzL2RlbGV0ZS1maWxlXCI+RGVsZXRlPC9hPjwvbGk+JyArXG4gICAgICAnPC91bD4nKVxuXG4gICAgJCgnYm9keScpLmFwcGVuZENoaWxkKGNvbnRleHRNZW51KTtcblxuICAgIGNvbnRleHRNZW51LnN0eWxlLnRvcCA9IGV2ZW50LmNsaWVudFkgKyBcInB4XCI7XG4gICAgY29udGV4dE1lbnUuc3R5bGUubGVmdCA9IGV2ZW50LmNsaWVudFggKyBcInB4XCI7XG5cbiAgICB2YXIgZGVsID0gbmV3IERlbGVnYXRlKGNvbnRleHRNZW51KTtcbiAgICBkZWwub24oJ2NsaWNrJywgJ2EnLCBmdW5jdGlvbiAoZSl7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICByZXNldCgpO1xuICAgICAgLy9hbGVydChlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ3JlbCcpKVxuICAgICAgc3dpdGNoIChlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ3JlbCcpKXtcblxuICAgICAgICBjYXNlIFwicmVscy9vcGVuLWZpbGVcIiA6XG4gICAgICAgICAgZWRpdEZpbGUoZW50aXR5KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcInJlbHMvcmVuYW1lLWZpbGVcIiA6IFxuICAgICAgICAgIGVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgICAgICAgICBlbGVtZW50LnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuICAgICAgICAgIGlucHV0LnZhbHVlID0gZW50aXR5Lm5hbWU7XG4gICAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICBpbnB1dC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZSl7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMgJiYgaW5wdXQudmFsdWUgIT09IFwiXCIpe1xuICAgICAgICAgICAgICByZW5hbWVGaWxlIChlbnRpdHksIGlucHV0LnZhbHVlKTtcbiAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlucHV0KTtcbiAgICAgICAgICAgICAgaW5wdXQub25rZXlkb3duID0gbnVsbDtcbiAgICAgICAgICAgICAgaW5wdXQub25jbGljayA9IGZhbHNlO1xuICAgICAgICAgICAgICBpbnB1dCA9IG51bGw7XG5cblxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpbnB1dC5vbmNsaWNrID0gZnVuY3Rpb24gKGUpe1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJyZWxzL2RlbGV0ZS1maWxlXCI6XG4gICAgICAgICAgZGVsZXRlRmlsZShlbnRpdHkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfVxuXG59XG5cbmZ1bmN0aW9uIHJlbmFtZUZpbGUgKGVudGl0eSwgbmV3TmFtZSl7XG5cbiAgdmFyIHVyaSA9IGVudGl0eS5ocmVmLnJlcGxhY2UoZW50aXR5Lm5hbWUsIG5ld05hbWUpO1xuXG4gIHZhciBvbGRVcmkgPSBlbnRpdHkuaHJlZi5yZXBsYWNlKHZmc1Jvb3QsICcnKTtcblxuICB2YXIgc2Vzc2lvbiA9IGZhbHNlO1xuXG4gIGlmIChlZGl0U2Vzc2lvbnNbZW50aXR5LmhyZWZdKXtcbiAgICBzZXNzaW9uID0gZWRpdFNlc3Npb25zW2VudGl0eS5ocmVmXTtcbiAgfVxuXG4gIHJlcXVlc3QoeyBtZXRob2Q6ICdQT1NUJywgdXJsIDogdXJpLCBqc29uIDogeyByZW5hbWVGcm9tIDogb2xkVXJpIH19LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSwgYm9keSl7XG4gICAgbG9hZERpcmVjdG9yeShhY3RpdmVEaXJlY3RvcnkpO1xuICAgIGlmIChzZXNzaW9uKXtcbiAgICAgIGVkaXRTZXNzaW9uc1t1cmldID0gc2Vzc2lvbjtcbiAgICAgIGVkaXRTZXNzaW9uc1t1cmldLnBhdGggPSB1cmk7XG4gICAgICBlZGl0U2Vzc2lvbnNbZW50aXR5LmhyZWZdID0gbnVsbDtcbiAgICAgIGVkaXRTZXNzaW9uc1t1cmldLnRhYkhlYWRlci5xdWVyeVNlbGVjdG9yKCdhJykuaW5uZXJUZXh0ID0gbmV3TmFtZTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZW5hbWVGb2xkZXIgKGN1cnJlbnRQYXRoLCBvbGRGb2xkZXJOYW1lLCBuZXdGb2xkZXJOYW1lKXtcblxuICB2YXIgdXJpID0gY3VycmVudFBhdGgucmVwbGFjZShvbGRGb2xkZXJOYW1lLCBuZXdGb2xkZXJOYW1lKTtcblxuICB2YXIgb2xkVXJpID0gY3VycmVudFBhdGgucmVwbGFjZSh2ZnNSb290LCAnJyk7XG5cbiAgcmVxdWVzdCh7IG1ldGhvZDogJ1BPU1QnLCB1cmw6IHVyaSwganNvbiA6IHsgcmVuYW1lRnJvbSA6IG9sZFVyaX19LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSwgYm9keSl7XG4gICAgbG9hZERpcmVjdG9yeShhY3RpdmVEaXJlY3RvcnkpO1xuICB9KTtcblxuXG59XG5cbmZ1bmN0aW9uIGRlbGV0ZUZpbGUgKGVudGl0eSl7XG4gIGFsZXJ0KCdkZWxldGUgZmlsZScpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVGb2xkZXIgKHBhdGgpe1xuICByZXF1ZXN0KHsgbWV0aG9kIDogJ1BVVCcsIHVybCA6IHBhdGggKyBcIk5ldyBmb2xkZXIvXCJ9LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSwgYm9keSl7XG4gICAgaWYgKCFlcnIpe1xuICAgICAgbG9hZERpcmVjdG9yeShhY3RpdmVEaXJlY3RvcnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhbGVydChlcnIpO1xuICAgIH1cblxuICB9KVxufVxuXG5mdW5jdGlvbiBjcmVhdGVGaWxlIChwYXRoKXtcbiAgcmVxdWVzdCh7IG1ldGhvZCA6ICdQVVQnLCB1cmwgOiBwYXRoICsgJ1VudGl0bGVkLm1kJywgYm9keSA6ICcnfSwgZnVuY3Rpb24gKGVyciwgcmVzcG9uc2UsIGJvZHkpe1xuICAgIGlmICghZXJyKXtcbiAgICAgIGxvYWREaXJlY3RvcnkoYWN0aXZlRGlyZWN0b3J5KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBhbGVydChlcnIpO1xuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWRpdFNlc3Npb24gKGVudGl0eSl7XG5cbiAgdmFyIHBhdGggPSBlbnRpdHkuaHJlZjtcblxuICB2YXIgY29udGFpbmVyID0gZG9taWZ5KCc8bGk+PC9saT4nKTtcbiAgdmFyIHRhYkhlYWRlciA9IGRvbWlmeSgnPGxpPjxhIGhyZWY9XCIjXCI+JyArIGVudGl0eS5uYW1lICsnPC9hPjxzcGFuIGNsYXNzPVwidHlwY24gdHlwY24tZGVsZXRlXCI+PHNwYW4+PC9saT4nKTtcbiAgdGFiSGVhZGVyLnF1ZXJ5U2VsZWN0b3IoJ2EnKS5vbmNsaWNrID0gbWFrZUVkaXRTZXNzaW9uQWN0aXZlLmJpbmQoe30sIGVudGl0eSk7XG4gIGNvbnRlbnQucXVlcnlTZWxlY3RvcigndWwudGFicycpLmFwcGVuZENoaWxkKHRhYkhlYWRlcik7XG5cbiAgdmFyIHNpemUgPSBnZXRDb250ZW50Vmlld1NpemUoKTtcblxuICB2YXIgdGFiQm9keSA9IGNyZWF0ZUJveCgnZWRpdC13aW5kb3cnKTtcbiAgdGFiQm9keS5zaXplKHNpemUueCwgc2l6ZS55IC0gc2l6ZS5oZWFkZXJIZWlnaHQpO1xuICB0YWJCb2R5LnBvc2l0aW9uKDAsIHNpemUuaGVhZGVySGVpZ2h0KTtcbiAgdGFiQm9keS5hcHBlbmRUb0VsZW1lbnQoY29udGFpbmVyKTtcbiAgY29udGVudC5xdWVyeVNlbGVjdG9yKCd1bC50YWItYm9kaWVzJykuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcblxuICB2YXIgZWRpdG9yID0gYWNlLmVkaXQodGFiQm9keS5lbGVtZW50KTtcbiAgaWYgKGVudGl0eS5uYW1lLm1hdGNoKC9cXC5tZCQvKSl7XG4gIGVkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZSgnYWNlL21vZGUvbWFya2Rvd24nKTtcbiAgfSBlbHNlIHtcbiAgICBlZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoJ2FjZS9tb2RlL2pzb24nKTtcbiAgfVxuICBlZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gIGVkaXRvci5zZXRTaG93UHJpbnRNYXJnaW4oZmFsc2UpO1xuXG4gIGVkaXRTZXNzaW9uc1twYXRoXSA9IHtcbiAgICBlZGl0b3IgOiBlZGl0b3IsXG4gICAgcGF0aCA6IHBhdGgsXG4gICAgYm94IDogdGFiQm9keSxcbiAgICB0YWIgOiBjb250YWluZXIsXG4gICAgZW50aXR5IDogZW50aXR5LFxuICAgIHRhYkhlYWRlciA6IHRhYkhlYWRlclxuICB9XG5cbiAgdGFiSGVhZGVyLnF1ZXJ5U2VsZWN0b3IoJ3NwYW4udHlwY24tZGVsZXRlJykub25jbGljayA9IGZ1bmN0aW9uIChlKXtcblxuICAgIGVuZFNlc3Npb24oZW50aXR5KTtcblxuICB9O1xuXG4gIGVkaXRvci5vbignY2hhbmdlJywgZnVuY3Rpb24gKCl7XG5cbiAgICB2YXIgY3VycmxpbmUgPSBlZGl0b3IuZ2V0U2VsZWN0aW9uUmFuZ2UoKS5zdGFydC5yb3c7XG4gICAgdmFyIHdob2xlbGluZXRleHQgPSBlZGl0b3Iuc2Vzc2lvbi5nZXRMaW5lKGN1cnJsaW5lKTtcbiAgICB2YXIgY3VycmNoYXIgPSBlZGl0b3IuZ2V0U2VsZWN0aW9uUmFuZ2UoKS5zdGFydC5jb2x1bW47XG5cbiAgICB2YXIgZG9TZWFyY2ggPSBmYWxzZTtcbiAgICB2YXIgdXJpID0gZmFsc2U7XG4gICAgdmFyIG1vZGUgPSBmYWxzZTtcblxuICAgIGlmIChjdXJyY2hhciA9PT0gKHdob2xlbGluZXRleHQubGVuZ3RoIC0gMSkgJiYgKC9yZWNvbW1lbmRhdGlvbnM6JC8udGVzdCh3aG9sZWxpbmV0ZXh0KSkpe1xuXG4gICAgICBkb1NlYXJjaCA9IHRydWU7XG4gICAgICB1cmkgPSBcInNvbWV0aGluZ1wiO1xuICAgICAgbW9kZSA9IFwicmVjb21tZW5kYXRpb25zXCI7XG5cbiAgICB9IGVsc2UgaWYgKGN1cnJjaGFyID09PSAod2hvbGVsaW5ldGV4dC5sZW5ndGggLSAxKSAmJiAoL3F1YWxpdHlzdGF0ZW1lbnRzOiQvLnRlc3Qod2hvbGVsaW5ldGV4dCkpKXtcblxuICAgICAgZG9TZWFyY2ggPSB0cnVlO1xuICAgICAgdXJpID0gXCJzb21ldGhpbmdlbHNlXCI7XG4gICAgICBtb2RlID0gXCJRdWFsaXR5IHN0YXRlbWVudHNcIjtcblxuICAgIH1cblxuICAgIGlmIChkb1NlYXJjaCl7XG5cbiAgICAgIHZhciBvZmZzZXQgPSBlZGl0b3IucmVuZGVyZXIuc2Nyb2xsZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgcGFkZGluZyA9IGVkaXRvci5yZW5kZXJlci4kcGFkZGluZztcbiAgICAgIHZhciBjdXIgPSBlZGl0b3IuZ2V0Q3Vyc29yUG9zaXRpb24oKTtcblxuICAgICAgLy8gZ2V0IHRoZSB4IGFuZCB5IHBvc2l0aW9uIG9mIFxuICAgICAgdmFyIHggPSBNYXRoLmNlaWwoKGN1ci5jb2x1bW4gKyAxKSAqIGVkaXRvci5yZW5kZXJlci5jaGFyYWN0ZXJXaWR0aCkgKyBvZmZzZXQubGVmdCArIHBhZGRpbmc7XG4gICAgICB2YXIgeSA9IE1hdGguY2VpbChjdXIucm93ICogZWRpdG9yLnJlbmRlcmVyLmxpbmVIZWlnaHQpICsgb2Zmc2V0LnRvcDtcblxuICAgICAgdmFyIGlucHV0ID0gZG9taWZ5KCc8aW5wdXQgcGxhY2Vob2xkZXI9XCJTZWFyY2ggZm9yIGNvbmNlcHRzXCIgY2xhc3M9XCJhdXRvY29tcGxldGUtaW5wdXRcIiB0eXBlPVwidGV4dFwiPjwvaW5wdXQ+Jyk7XG4gICAgICAvL2lucHV0LnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgLy9pbnB1dC5zdHlsZS56SW5kZXggPSAxO1xuICAgICAgaW5wdXQuc3R5bGUubGVmdCA9IHggKyBcInB4XCI7XG4gICAgICBpbnB1dC5zdHlsZS50b3AgPSB5ICsgXCJweFwiO1xuXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlucHV0KTtcblxuICAgICAgaW5wdXQuZm9jdXMoKTtcblxuICAgICAgdmFyIGxhc3RWYWwgPSBcIlwiO1xuICAgICAgdmFyIHJlcXVlc3RJblByb2dyZXNzID0gZmFsc2U7XG5cbiAgICAgIHZhciBjb250YWluZXI7XG5cbiAgICAgIGZ1bmN0aW9uIGdldFJlc3VsdHMgKHRlcm0pe1xuICAgICAgICAgIHJlcXVlc3QoJy9sZC9jb25jZXB0cy8nICsgdGVybSwgZnVuY3Rpb24gKGVyciwgcmVzcG9uc2UsIGJvZHkpe1xuICAgICAgICAgICAgcmVxdWVzdEluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgICBwcm9jZXNzUmVzdWx0cyhlcnIsIEpTT04ucGFyc2UoYm9keSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gcHJvY2Vzc1Jlc3VsdHMgKGVyciwgYm9keSl7XG4gICAgICAgIHJlcXVlc3RJblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgIGlmIChsYXN0VmFsICE9PSBpbnB1dC52YWx1ZSl7XG4gICAgICAgICAgbGFzdFZhbCA9IGlucHV0LnZhbHVlO1xuICAgICAgICAgIGdldFJlc3VsdHMobGFzdFZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlY3QgPSBpbnB1dC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICBpZiAoY29udGFpbmVyKXtcbiAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICBjb250YWluZXIgPSBkb21pZnkoJzx1bCBjbGFzcz1cImF1dG9jb21wbGV0ZS1wb3B1cFwiPjwvdWw+Jyk7XG4gICAgICAgIGNvbnRhaW5lci5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLnRvcCA9IHJlY3QuYm90dG9tICsgXCJweFwiO1xuICAgICAgICBjb250YWluZXIuc3R5bGUubGVmdCA9IHJlY3QubGVmdCArIFwicHhcIjtcblxuICAgICAgICBib2R5LmZvckVhY2goZnVuY3Rpb24gKGNvbmNlcHQsIGluZGV4KXtcblxuICAgICAgICAgIHZhciBsaSA9IGRvbWlmeSgnPGxpPicgKyBjb25jZXB0LnZhbHVlLm9iamVjdCArJzwvbGk+Jyk7XG4gICAgICAgICAgbGkub25jbGljayA9IGZ1bmN0aW9uIChlKXtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgLy8gcmVtb3ZlIGV2ZW50IGhhbmRsZXJzIGZyb20gb3RoZXIgbGlzLi5cbiAgICAgICAgICAgIHZhciBmbnMgPSBbXTtcbiAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpJyksIGZ1bmN0aW9uIChsaSl7XG4gICAgICAgICAgICAgIC8vaW5wdXQudmFsdWUgPSBjb25jZXB0LnZhbHVlLm9iamVjdDtcbiAgICAgICAgICAgICAgY3VycmVudFZhbCA9IGxhc3RWYWwgPSBpbnB1dC52YWx1ZSA9IGNvbmNlcHQudmFsdWUub2JqZWN0O1xuICAgICAgICAgICAgICBsaS5vbmNsaWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgIGZucy5wdXNoKGZ1bmN0aW9uICgpe1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChsaSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmbnMuZm9yRWFjaChmdW5jdGlvbiAoZm4peyBmbigpOyB9KTtcblxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpbnB1dCk7XG5cbiAgICAgICAgICAgIHZhciBsb2FkaW5nID0gZG9taWZ5KCc8bGkgY2xhc3M9XCJsb2FkaW5nXCI+U2VhcmNoaW5nIGZvciAnICsgbW9kZSArICcgZm9yICcgKyBjb25jZXB0LnZhbHVlLm9iamVjdCArJzwvbGk+Jyk7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobG9hZGluZyk7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS50b3AgPSByZWN0LnRvcCArIFwicHhcIjtcblxuICAgICAgICAgICAgc2VhcmNoRm9yVGhpbmdzKGNvbmNlcHQudmFsdWUub2JqZWN0KTtcblxuXG4gICAgICAgICAgICAvL2RvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgICAgIC8vZWRpdG9yLmZvY3VzKCk7XG4gICAgICAgICAgICAvL2VkaXRvci5pbnNlcnQoY29uY2VwdC52YWx1ZS5zdWJqZWN0KTtcbiAgICAgICAgICAgIC8vZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpbnB1dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsaSk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuXG4gICAgICAgIC8vY29uc29sZS5sb2coaW5wdXQuY2FsY3VsYXRlQm91bmRpbmdSZWN0KCkpXG4gICAgICAgIC8vY29uc29sZS5sb2coYm9keSk7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBzZWFyY2hGb3JUaGluZ3MgKHRhZyl7XG4gICAgICAgIGlmIChtb2RlID09PSBcInJlY29tbWVuZGF0aW9uc1wiKXtcbiAgICAgICAgICByZXF1ZXN0KCcvbGQvcmVjb21tZW5kYXRpb25zLycgKyB0YWcsIGZ1bmN0aW9uIChlcnIsIHJlcyl7XG4gICAgICAgICAgICB2YXIgdHJpcGxlcyA9IEpTT04ucGFyc2UocmVzLmJvZHkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2codHJpcGxlcyk7XG4gICAgICAgICAgICB2YXIgcmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBkb21pZnkoJzxkaXYgY2xhc3M9XCJsZC1yZXN1bHRcIj48aDM+UmVjb21tZW5kYXRpb25zPC9oMz48dWw+PC91bD48L2Rpdj4nKTtcbiAgICAgICAgICAgIHZhciB1bCA9IHJlc3VsdHMucXVlcnlTZWxlY3RvcigndWwnKTtcblxuICAgICAgICAgICAgcmVzdWx0cy5zdHlsZS50b3AgPSByZWN0LnRvcCArIFwicHhcIjtcbiAgICAgICAgICAgIHJlc3VsdHMuc3R5bGUubGVmdCA9IHJlY3QubGVmdCArIFwicHhcIjtcbiAgICAgICAgICAgIHJlc3VsdHMuc3R5bGUubWF4SGVpZ2h0ID0gKHdpbmRvdy5pbm5lckhlaWdodCAtIHJlY3QudG9wIC0gMjAwKSArICdweCdcblxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChjb250YWluZXIpO1xuICAgICAgICAgICAgY29udGFpbmVyID0gXCJcIjtcblxuICAgICAgICAgICAgdHJpcGxlcy5mb3JFYWNoKGZ1bmN0aW9uICh0cmlwbGUpe1xuXG4gICAgICAgICAgICAgIHZhciBsaSA9IGRvbWlmeSgnPGxpPjwvbGk+Jyk7XG4gICAgICAgICAgICAgIHZhciBpZCA9IGRvbWlmeSgnPHAgY2xhc3M9XCJpZFwiPicgKyB0cmlwbGUuc3ViamVjdCArICc8L3A+Jyk7XG4gICAgICAgICAgICAgIHZhciB0ZXh0ID0gZG9taWZ5KCc8ZGl2PicgKyBtYXJrZWQodHJpcGxlLm9iamVjdC5yZXBsYWNlKC9cXG5cXD9cXHMvZywgJ1xcbi0gJykpICsgJzwvZGl2PicpO1xuICAgICAgICAgICAgICB2YXIgaW5zZXJ0ID0gZG9taWZ5KCc8YSBocmVmPVwiI1wiPkluc2VydCBhIGxpbmsgdG8gdGhpcyByZWNvbW1lbmRhdGlvbjwvYT4nKTtcblxuICAgICAgICAgICAgICBpbnNlcnQub25jbGljayA9IGZ1bmN0aW9uIChlKXtcblxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlZGl0b3IuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICBlZGl0b3IuaW5zZXJ0KHRyaXBsZS5zdWJqZWN0KTtcblxuICAgICAgICAgICAgICAgIC8vIFxuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwocmVzdWx0cy5xdWVyeVNlbGVjdG9yQWxsKCdhJyksIGZ1bmN0aW9uIChhKXtcbiAgICAgICAgICAgICAgICAgIGEub25jbGljayA9IFwiXCI7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBudWxsO1xuXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBsaS5hcHBlbmRDaGlsZChpZCk7XG4gICAgICAgICAgICAgIGxpLmFwcGVuZENoaWxkKHRleHQpO1xuICAgICAgICAgICAgICBsaS5hcHBlbmRDaGlsZChpbnNlcnQpO1xuXG4gICAgICAgICAgICAgIHVsLmFwcGVuZENoaWxkKGxpKTtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocmVzdWx0cyk7XG5cbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlucHV0Lm9ua2V5dXAgPSBmdW5jdGlvbiAoZSl7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWwgPSBpbnB1dC52YWx1ZS50cmltKCk7XG5cbiAgICAgICAgaWYgKGN1cnJlbnRWYWwgIT09IFwiXCIpe1xuXG4gICAgICAgICAgLy8gZ2V0IHRoZSBvcHRpb25zXG5cbiAgICAgICAgICBpZiAobGFzdFZhbCAhPT0gY3VycmVudFZhbCAmJiAhcmVxdWVzdEluUHJvZ3Jlc3Mpe1xuICAgICAgICAgICAgcmVxdWVzdEluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgbGFzdFZhbCA9IGN1cnJlbnRWYWw7XG4gICAgICAgICAgICBnZXRSZXN1bHRzKGxhc3RWYWwpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgLy8gY2xlYXIgdGhlIG9wdGlvbnMuLi5cblxuICAgICAgICB9XG5cbiAgICAgIH1cblxuICAgIFxuICAgICAgLy8gbG9va2luZyBmb3IgcmVjb21tZW5kYXRpb25zXG5cblxuICAgICAgLy8gY29tZWR5IHByb29mIG9mIGNvbmNlcHQuLi5cblxuICAgICAgLy9zZXRUaW1lb3V0KGZ1bmN0aW9uICgpe1xuXG4gICAgICAvLyAgZWRpdG9yLmZvY3VzKCk7XG4gICAgICAvLyAgZWRpdG9yLmluc2VydChpbnB1dC52YWx1ZSk7XG4gICAgICAgLy8gZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpbnB1dCk7XG5cbiAgICAgLy8gfSwgMTAwMDApXG5cblxuICAgIH1cblxuXG4gIH0pO1xuXG4gIHJldHVybiBlZGl0U2Vzc2lvbnNbcGF0aF07XG5cbn1cblxuZnVuY3Rpb24gc2F2ZUZpbGUocGF0aCwgYm9keSwgY2FsbGJhY2spe1xuICByZXF1ZXN0LnB1dCh7IHVyaSA6IHBhdGgsIGJvZHkgOiBib2R5fSwgZnVuY3Rpb24gKGVyciwgcmVzcG9uc2Upe1xuICAgIGNhbGxiYWNrKGVyciwgcmVzcG9uc2UpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbG9hZEZpbGUocGF0aCwgY2FsbGJhY2spe1xuICByZXF1ZXN0KHBhdGgsIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlLCBib2R5KXtcbiAgICBjYWxsYmFjayhlcnIsIGJvZHkpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbG9hZERpcmVjdG9yeShwYXRoLCBvYmosIGVsZW1lbnQsIGV2ZW50KXtcblxuICBpZiAoZXZlbnQgJiYgZXZlbnQud2hpY2ggPT09IDMpe1xuXG4gICAgdmFyIGNsaWNrU2hpZWxkID0gZG9taWZ5KCc8ZGl2PjwvZGl2PicpO1xuICAgIGNsaWNrU2hpZWxkLnN0eWxlLndpZHRoID0gd2luZG93LmlubmVyV2lkdGggKyBcInB4XCI7XG4gICAgY2xpY2tTaGllbGQuc3R5bGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0ICsgXCJweFwiO1xuICAgIGNsaWNrU2hpZWxkLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgIGNsaWNrU2hpZWxkLnN0eWxlLnRvcCA9IFwiMHB4XCI7XG4gICAgY2xpY2tTaGllbGQuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cbiAgICAkKCdib2R5JykuYXBwZW5kQ2hpbGQoY2xpY2tTaGllbGQpO1xuXG4gICAgdmFyIHJlc2V0ID0gZnVuY3Rpb24gcmVzZXQoKXtcbiAgICAgIGNsaWNrU2hpZWxkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVzZXQpO1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNoaWxkKGNsaWNrU2hpZWxkKTtcbiAgICAgICQoJ2JvZHknKS5yZW1vdmVDaGlsZChjb250ZXh0TWVudSlcbiAgICB9XG5cbiAgICBjbGlja1NoaWVsZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHJlc2V0KTtcblxuICAgIC8vIHJpZ2h0Li4uXG4gICAgdmFyIGNvbnRleHRNZW51ID0gZG9taWZ5KCc8dWwgY2xhc3M9XCJjb250ZXh0LW1lbnVcIj4nICtcbiAgICAgICc8bGk+PGEgaHJlZj1cIiNcIiByZWw9XCJyZWxzL3JlbmFtZS1mb2xkZXJcIj5SZW5hbWU8L2E+PC9saT4nICtcbiAgICAgICc8bGk+PGEgaHJlZj1cIiNcIiByZWw9XCJyZWxzL2RlbGV0ZS1maWxlXCI+RGVsZXRlPC9hPjwvbGk+JyArXG4gICAgICAnPC91bD4nKVxuXG4gICAgJCgnYm9keScpLmFwcGVuZENoaWxkKGNvbnRleHRNZW51KTtcblxuICAgIGNvbnRleHRNZW51LnN0eWxlLnRvcCA9IGV2ZW50LmNsaWVudFkgKyBcInB4XCI7XG4gICAgY29udGV4dE1lbnUuc3R5bGUubGVmdCA9IGV2ZW50LmNsaWVudFggKyBcInB4XCI7XG5cbiAgICB2YXIgZGVsID0gbmV3IERlbGVnYXRlKGNvbnRleHRNZW51KTtcbiAgICBkZWwub24oJ2NsaWNrJywgJ2EnLCBmdW5jdGlvbiAoZSl7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIHJlc2V0KCk7XG5cbiAgICAgIHZhciByZWwgPSBlLnRhcmdldC5nZXRBdHRyaWJ1dGUoJ3JlbCcpO1xuXG4gICAgICBzd2l0Y2ggKHJlbCl7XG4gICAgICAgIGNhc2UgXCJyZWxzL3JlbmFtZS1mb2xkZXJcIiA6XG4gICAgICAgICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgdmFyIGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKVxuICAgICAgICAgIGVsZW1lbnQucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgICAgICAgaW5wdXQudmFsdWUgPSBvYmoubmFtZTtcbiAgICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChlKXtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMyAmJiBpbnB1dC52YWx1ZSAhPT0gXCJcIil7XG4gICAgICAgICAgICAgIHJlbmFtZUZvbGRlciAocGF0aCwgb2JqLm5hbWUsIGlucHV0LnZhbHVlKTtcbiAgICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlucHV0KTtcbiAgICAgICAgICAgICAgaW5wdXQub25rZXlkb3duID0gbnVsbDtcbiAgICAgICAgICAgICAgaW5wdXQub25jbGljayA9IGZhbHNlO1xuICAgICAgICAgICAgICBpbnB1dCA9IG51bGw7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIH1cblxuICAgIH0pO1xuXG4gIH0gZWxzZSBpZiAoIWV2ZW50IHx8IChldmVudC53aGljaCA9PT0gMSAmJiBldmVudC50YXJnZXQudGFnTmFtZSAhPT0gXCJJTlBVVFwiKSkge1xuXG4gICAgYWN0aXZlRGlyZWN0b3J5ID0gcGF0aDtcblxuICAgIHJlcXVlc3QocGF0aCwgZnVuY3Rpb24gKGVyciwgcmVzcG9uc2UsIGJvZHkpe1xuXG4gICAgICBpZiAoIWVycil7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVRZcGUnKSA9PT0gXCJhcHBsaWNhdGlvbi9qc29uXCIpe1xuICAgICAgICAgIGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZGlyZWN0b3J5Q2FjaGVbYWN0aXZlRGlyZWN0b3J5XSA9IGJvZHk7XG5cbiAgICAgICAgdmFyIHJlZmVyZW5jZSA9IGdldERpcmVjdG9yeVJlZmVyZW5jZShwYXRoKTtcbiAgICAgICAgdXBkYXRlRmlsZVN5c3RlbShwYXRoLCBib2R5KTtcbiAgICAgICAgcmVuZGVyQ3VycmVudERpcmVjdG9yeShyZWZlcmVuY2UpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbGVydChlcnIpO1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREaXJlY3RvcnlSZWZlcmVuY2UocGF0aCl7XG4gICAgLy8gcG9wIG9mZiB0aGUgZmlyc3QgYW5kIGxhc3RcblxuICBwYXRoID0gcGF0aC5yZXBsYWNlKHZmc1Jvb3QsICcnKTtcblxuICB2YXIgcGF0aENodW5rcyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgdmFyIHBvaW50ZXIgPSBmaWxlU3lzdGVtO1xuXG4gIHBhdGhDaHVua3Muc2hpZnQoKTsgXG4gIHBhdGhDaHVua3MucG9wKCk7XG4gIHBhdGhDaHVua3MudW5zaGlmdCgncm9vdCcpO1xuXG4gIHBhdGhDaHVua3MuZm9yRWFjaChmdW5jdGlvbiAoY2h1bmspe1xuICAgIGlmIChwb2ludGVyLmNoaWxkcmVuW2NodW5rXSl7XG4gICAgICBwb2ludGVyLmNoaWxkcmVuW2NodW5rXS5wYXJlbnQgPSBwb2ludGVyO1xuICAgICAgcG9pbnRlciA9IHBvaW50ZXIuY2hpbGRyZW5bY2h1bmtdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29tZycpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHBvaW50ZXI7XG5cbn1cblxuZnVuY3Rpb24gdXBkYXRlRmlsZVN5c3RlbShwYXRoLCBlbnRpdGllcyl7XG5cbiAgdmFyIHBvaW50ZXIgPSBnZXREaXJlY3RvcnlSZWZlcmVuY2UocGF0aCk7XG5cbiAgcG9pbnRlci5lbnRpdGllcy5zcGxpY2UoMCwgcG9pbnRlci5lbnRpdGllcy5sZW5ndGgpO1xuXG4gIGVudGl0aWVzLmZvckVhY2goZnVuY3Rpb24gKGVudGl0eSl7XG4gICAgaWYgKGVudGl0eS5taW1lID09PSBcImlub2RlL2RpcmVjdG9yeVwiKXtcbiAgICAgIGlmICghcG9pbnRlci5jaGlsZHJlbltlbnRpdHkubmFtZV0pe1xuICAgICAgICBwb2ludGVyLmNoaWxkcmVuW2VudGl0eS5uYW1lXSA9IHtcbiAgICAgICAgICBuYW1lIDogZW50aXR5Lm5hbWUsXG4gICAgICAgICAgaHJlZiA6IGVudGl0eS5ocmVmLFxuICAgICAgICAgIGVudGl0aWVzIDogW10sXG4gICAgICAgICAgY2hpbGRyZW4gOiB7fVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGFkZCBpdCBhcyBhbiBlbnRpdHkuLi5cbiAgICAgIHBvaW50ZXIuZW50aXRpZXMucHVzaChlbnRpdHkpO1xuXG4gICAgfVxuICAgIFxuICB9KTtcblxuICBmb3IgKHZhciBjaGlsZCBpbiBwb2ludGVyLmNoaWxkcmVuKXtcbiAgICBpZiAocG9pbnRlci5jaGlsZHJlbi5oYXNPd25Qcm9wZXJ0eShjaGlsZCkpe1xuICAgICAgdmFyIGV4aXN0cyA9IGZhbHNlO1xuICAgICAgZW50aXRpZXMuZm9yRWFjaChmdW5jdGlvbiAoZW50aXR5KXtcbiAgICAgICAgaWYgKGVudGl0eS5uYW1lID09PSBjaGlsZCl7XG4gICAgICAgICAgZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoIWV4aXN0cyl7XG4gICAgICAgIGRlbGV0ZSBwb2ludGVyLmNoaWxkcmVuW2NoaWxkXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG5cbmxvYWREaXJlY3RvcnkoZmlsZVN5c3RlbS5jaGlsZHJlbi5yb290LmhyZWYpO1xuKi8iLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ2Jyb3dzZXItcmVxdWVzdCcpO1xudmFyIEdhdGhlciA9IHJlcXVpcmUoJ2dtLWdhdGhlcicpO1xudmFyIFNvY2tzSlMgPSByZXF1aXJlKCcuL3NvY2tzLmpzJyk7XG52YXIgY29uc29sZSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvY29uc29sZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cy5pbml0aWFsaXNlRmlsZVN5c3RlbSA9IGZ1bmN0aW9uIGluaXRpYWxpc2VGaWxlU3lzdGVtICh2ZnNSb290LCBzb2NrUm9vdCl7XG5cbiAgdmFyIHN5c3RlbSA9IG5ldyAocmVxdWlyZSgnZXZlbnRzJykpLkV2ZW50RW1pdHRlcjtcblxuICAvLyBvdXIgaW50ZXJuYWwgZGF0YSBzdHJ1Y3R1cmUuLi5cbiAgdmFyIGRhdGEgPSB7XG4gICAgZW50aXRpZXMgOiBbXSxcbiAgICBjaGlsZHJlbiA6IHtcbiAgICAgIHJvb3QgOiB7XG4gICAgICAgIGVudGl0aWVzIDogW10sXG4gICAgICAgIG5hbWUgOiBcIlByb2plY3Qgcm9vdFwiLFxuICAgICAgICByZWxQYXRoIDogXCIvXCIsXG4gICAgICAgIGhyZWYgOiB2ZnNSb290ICsgXCIvXCIsXG4gICAgICAgIGNoaWxkcmVuIDoge30sXG4gICAgICAgIHBhcmVudCA6IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHZhciBlbnRpdHlMb29rdXAgPSB7fTtcblxuICB2YXIgc29ja2V0ID0gbmV3IFNvY2tzSlMoc29ja1Jvb3QpO1xuXG4gIHNvY2tldC5vbm9wZW4gPSBmdW5jdGlvbiAoKXtcbiAgICBjb25zb2xlLmxvZygnUmVtb3RlIGZpbGUgc2VydmVyIGlzIG9ubGluZS4nKTtcbiAgfVxuICBzb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24gKGUpe1xuXG4gICAgdmFyIG1zZyA9IEpTT04ucGFyc2UoZS5kYXRhKTtcblxuICAgIGZvciAodmFyIGkgaW4gbXNnKXtcblxuICAgICAgaWYgKGkgPT09ICd1cGRhdGUnKXtcbiAgICAgICAgc3lzdGVtLmVtaXQoJ2VudGl0eS11cGRhdGVkJywgJ3VwZGF0ZScsIG1zZy51cGRhdGUucGF0aCk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgfVxuXG4gIHN5c3RlbS5yZWFkRmlsZSA9IGZ1bmN0aW9uIHJlYWRGaWxlIChwYXRoLCBmbil7XG5cbiAgICB2YXIgZW50aXR5ID0gZW50aXR5TG9va3VwW3BhdGhdXG5cbiAgICByZXF1ZXN0KGVudGl0eS5ocmVmLCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSl7XG5cbiAgICAgIGlmICghZXJyKXtcbiAgICAgICAgZm4gKGZhbHNlLCBlbnRpdHksIHJlc3BvbnNlLmJvZHkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4gKGVyciwgZW50aXR5KTtcbiAgICAgIH1cblxuICAgIH0pO1xuXG4gIH07XG5cbiAgc3lzdGVtLndyaXRlRmlsZSA9IGZ1bmN0aW9uIHdyaXRlRmlsZShwYXRoLCBib2R5LCBmbil7XG5cbiAgICB2YXIgZW50aXR5ID0gZW50aXR5TG9va3VwW3BhdGhdO1xuXG4gICAgcmVxdWVzdC5wdXQoeyB1cmkgOiBlbnRpdHkuaHJlZiwgYm9keSA6IGJvZHl9LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSl7XG4gICAgICBpZiAoIWVycil7XG4gICAgICAgIGZuIChmYWxzZSwgZW50aXR5KTtcbiAgICAgICAgc3lzdGVtLmVtaXQoJ2VudGl0eS11cGRhdGVkJywgJ3VwZGF0ZScsIHBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4gKGVycik7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgc3lzdGVtLnJlbmFtZUZpbGUgPSBmdW5jdGlvbiByZW5hbWVGaWxlIChuZXdQYXRoLCBvbGRQYXRoLCBmbil7XG5cbiAgfTtcblxuICBzeXN0ZW0uZGVsZXRlRmlsZSA9IGZ1bmN0aW9uIGRlbGV0ZUZpbGUgKHBhdGgsIGZuKXtcblxuICB9O1xuXG4gIHN5c3RlbS5yZWFkRm9sZGVyID0gZnVuY3Rpb24gcmVhZEZvbGRlciAocGF0aCwgZm4pe1xuXG4gIH07XG5cbiAgc3lzdGVtLndyaXRlRm9sZGVyID0gZnVuY3Rpb24gd3JpdGVGb2xkZXIgKHBhdGgsIGZuKXtcblxuICB9O1xuXG4gIHN5c3RlbS5yZW5hbWVGb2xkZXIgPSBmdW5jdGlvbiByZW5hbWVGb2xkZXIgKHBhdGgsIGZuKXtcblxuICB9O1xuXG4gIHN5c3RlbS5kZWxldGVGb2xkZXIgPSBmdW5jdGlvbiBkZWxldGVGb2xkZXIgKHBhdGgsIGZuKXtcblxuICB9O1xuXG4gIHN5c3RlbS5nZXRBbGwgPSBmdW5jdGlvbiBnZXRBbGwoZm4pe1xuXG4gICAgZnVuY3Rpb24gZ2V0Q29udGVudHMgKG5vZGUsIGNvbnRlbnRzKXtcblxuICAgICAgZm9yICh2YXIgZm9sZGVyIGluIG5vZGUuY2hpbGRyZW4pe1xuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbi5oYXNPd25Qcm9wZXJ0eShmb2xkZXIpKXtcbiAgICAgICAgICB2YXIgZm9sZGVyT2JqZWN0ID0ge1xuICAgICAgICAgICAgdHlwZSA6ICdmb2xkZXInLFxuICAgICAgICAgICAgbmFtZSA6IG5vZGUuY2hpbGRyZW5bZm9sZGVyXS5uYW1lLFxuICAgICAgICAgICAgcGF0aCA6IG5vZGUuY2hpbGRyZW5bZm9sZGVyXS5yZWxQYXRoLFxuICAgICAgICAgICAgY29udGVudHMgOiBbXVxuICAgICAgICAgIH0gXG4gICAgICAgICAgY29udGVudHMucHVzaChmb2xkZXJPYmplY3QpO1xuICAgICAgICAgIGdldENvbnRlbnRzKG5vZGUuY2hpbGRyZW5bZm9sZGVyXSwgZm9sZGVyT2JqZWN0LmNvbnRlbnRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGUuZW50aXRpZXMubGVuZ3RoOyBpKyspe1xuXG4gICAgICAgIGNvbnRlbnRzLnB1c2goe1xuICAgICAgICAgIHR5cGUgOiAnZmlsZScsXG4gICAgICAgICAgbmFtZSA6IG5vZGUuZW50aXRpZXNbaV0ubmFtZSxcbiAgICAgICAgICBwYXRoIDogbm9kZS5lbnRpdGllc1tpXS5ocmVmLnJlcGxhY2UodmZzUm9vdCwgJycpLFxuICAgICAgICAgIG1pbWUgOiBub2RlLmVudGl0aWVzW2ldLm1pbWVcbiAgICAgICAgfSk7XG5cbiAgICAgIH1cblxuICAgIH1cblxuICAgIHZhciB0cmVlID0gW107XG5cbiAgICBnZXRDb250ZW50cyhkYXRhLCB0cmVlKTtcblxuICAgIGZuKHRyZWUpO1xuXG4gIH07XG5cbiAgLy8gaG93ZXZlciB3ZSdyZSBkb2luZyB0byBsb2FkIHRoZSBlbnRpcmUgZmlsZSBzeXN0ZW0gaW4gbm93LlxuXG4gIGZ1bmN0aW9uIGxvYWRGaWxlU3lzdGVtIChwYXRoLCBmbil7XG5cbiAgICByZXF1ZXN0KHBhdGgsIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlLCBib2R5KXtcblxuICAgICAgaWYgKCFlcnIpe1xuXG4gICAgICAgIGlmIChyZXNwb25zZS5nZXRSZXNwb25zZUhlYWRlcignQ29udGVudC1UeXBlJykgPT09IFwiYXBwbGljYXRpb24vanNvblwiKXtcbiAgICAgICAgICBib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vZGlyZWN0b3J5Q2FjaGVbYWN0aXZlRGlyZWN0b3J5XSA9IGJvZHk7XG5cbiAgICAgICAgdXBkYXRlRmlsZVN5c3RlbShwYXRoLCBib2R5KTtcbiAgXG4gICAgICAgIHZhciBwb2ludGVyID0gZ2V0RGlyZWN0b3J5UmVmZXJlbmNlKHBhdGgpO1xuXG4gICAgICAgIHZhciBnYXRoZXJlciA9IG5ldyBHYXRoZXIoKTtcblxuICAgICAgICB2YXIgY2hpbGRDb3VudCA9IDA7XG5cbiAgICAgICAgZm9yICh2YXIgY2hpbGQgaW4gcG9pbnRlci5jaGlsZHJlbil7XG4gICAgICAgICAgaWYgKHBvaW50ZXIuY2hpbGRyZW4uaGFzT3duUHJvcGVydHkoY2hpbGQpKXtcbiAgICAgICAgICAgIGNoaWxkQ291bnQgKys7XG4gICAgICAgICAgICBnYXRoZXJlci50YXNrKChmdW5jdGlvbiAoaHJlZil7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkb25lLCBlcnJvcil7XG5cbiAgICAgICAgICAgICAgICBsb2FkRmlsZVN5c3RlbShocmVmLCBmdW5jdGlvbiAoZXJyKXtcblxuICAgICAgICAgICAgICAgICAgaWYgKCFlcnIpe1xuXG4gICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcblxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBlcnJvcihlcnIpO1xuXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KShwb2ludGVyLmNoaWxkcmVuW2NoaWxkXS5ocmVmKSk7XG5cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hpbGRDb3VudCA+IDApe1xuICAgICAgICAgIGdhdGhlcmVyLnJ1bihmdW5jdGlvbiAoZXJyKXtcbiAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICBmbihlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm4oZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4gKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vcmVuZGVyQ3VycmVudERpcmVjdG9yeShyZWZlcmVuY2UpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbiAoZXJyKTtcbiAgICAgIH1cblxuICAgIH0pO1xuICB9O1xuXG4gIGxvYWRGaWxlU3lzdGVtKGRhdGEuY2hpbGRyZW4ucm9vdC5ocmVmLCBmdW5jdGlvbiAoZXJyKXtcblxuICAgIGlmICghZXJyKXtcblxuICAgICAgY29uc29sZS5sb2coJ1JlbW90ZSBmaWxlIHN5c3RlbSBzeW5jaHJvbmlzZWQnKTtcblxuICAgICAgc3lzdGVtLmVtaXQoJ3N5bmMnLCBkYXRhLmNoaWxkcmVuLnJvb3QucmVsUGF0aCk7XG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICBzeXN0ZW0uZW1pdCgnc3luYy1lcnJvcicsICdVbmFibGUgdG8gc3luY2hyb25pc2Ugd2l0aCByZW1vdGUgZmlsZSBzeXN0ZW0nLCBlcnIpO1xuXG4gICAgfVxuXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldERpcmVjdG9yeVJlZmVyZW5jZSAocGF0aCl7XG4gICAgICAvLyBwb3Agb2ZmIHRoZSBmaXJzdCBhbmQgbGFzdFxuXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSh2ZnNSb290LCAnJyk7XG5cbiAgICB2YXIgcGF0aENodW5rcyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgcG9pbnRlciA9IGRhdGE7XG5cbiAgICBwYXRoQ2h1bmtzLnNoaWZ0KCk7IFxuICAgIHBhdGhDaHVua3MucG9wKCk7XG4gICAgcGF0aENodW5rcy51bnNoaWZ0KCdyb290Jyk7XG5cbiAgICBwYXRoQ2h1bmtzLmZvckVhY2goZnVuY3Rpb24gKGNodW5rKXtcbiAgICAgIGlmIChwb2ludGVyLmNoaWxkcmVuW2NodW5rXSl7XG4gICAgICAgIHBvaW50ZXIuY2hpbGRyZW5bY2h1bmtdLnBhcmVudCA9IHBvaW50ZXI7XG4gICAgICAgIHBvaW50ZXIgPSBwb2ludGVyLmNoaWxkcmVuW2NodW5rXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignb21nJyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcG9pbnRlcjtcblxuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlRmlsZVN5c3RlbShwYXRoLCBlbnRpdGllcyl7XG5cbiAgICAvLyBPa2F5IHRoZSBvYmplY3RpdmUgaGVyZSBpcyB0byBnZXQgYWxsIHRoZSBjaGFuZ2VzLi4uXG5cbiAgICB2YXIgcG9pbnRlciA9IGdldERpcmVjdG9yeVJlZmVyZW5jZShwYXRoKTtcblxuICAgIHZhciBjdXJyZW50RW50aXRpZXMgPSBwb2ludGVyLmVudGl0aWVzLnNwbGljZSgwLCBwb2ludGVyLmVudGl0aWVzLmxlbmd0aCk7XG5cbiAgICBjdXJyZW50RW50aXRpZXMuZm9yRWFjaChmdW5jdGlvbiAoZW50aXR5KXtcblxuICAgICAgZGVsZXRlIGVudGl0eUxvb2t1cFtlbnRpdHkucmVsUGF0aF07XG5cbiAgICB9KTtcblxuICAgIGVudGl0aWVzLmZvckVhY2goZnVuY3Rpb24gKGVudGl0eSl7XG4gICAgICBpZiAoZW50aXR5Lm1pbWUgPT09IFwiaW5vZGUvZGlyZWN0b3J5XCIpe1xuICAgICAgICBpZiAoIXBvaW50ZXIuY2hpbGRyZW5bZW50aXR5Lm5hbWVdICYmIGVudGl0eS5uYW1lLnN1YnN0cigwLCAxKSAhPT0gXCIuXCIpe1xuICAgICAgICAgIHBvaW50ZXIuY2hpbGRyZW5bZW50aXR5Lm5hbWVdID0ge1xuICAgICAgICAgICAgbmFtZSA6IGVudGl0eS5uYW1lLFxuICAgICAgICAgICAgaHJlZiA6IGVudGl0eS5ocmVmLFxuICAgICAgICAgICAgcmVsUGF0aCA6IGVudGl0eS5ocmVmLnJlcGxhY2UodmZzUm9vdCwgJycpLFxuICAgICAgICAgICAgZW50aXRpZXMgOiBbXSxcbiAgICAgICAgICAgIGNoaWxkcmVuIDoge31cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY3JlYXRlIGEgbG9va3VwIGJ5IHBhdGguLi5cbiAgICAgICAgICBlbnRpdHlMb29rdXBbcG9pbnRlci5jaGlsZHJlbltlbnRpdHkubmFtZV0ucmVsUGF0aF0gPSBwb2ludGVyLmNoaWxkcmVuW2VudGl0eS5uYW1lXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChlbnRpdHkubmFtZS5zdWJzdHIoMCwxKSAhPT0gXCIuXCIpIHtcblxuICAgICAgICAvLyBjcmVhdGUgYSByZWxwYXRoLi5cbiAgICAgICAgZW50aXR5LnJlbFBhdGggPSBlbnRpdHkuaHJlZi5yZXBsYWNlKHZmc1Jvb3QsICcnKTtcblxuICAgICAgICAvLyBjcmVhdGUgYSBsb29rdXAgYnkgcmVscGF0aC4uIFxuICAgICAgICBlbnRpdHlMb29rdXBbZW50aXR5LnJlbFBhdGhdID0gZW50aXR5O1xuXG4gICAgICAgIC8vIGFkZCBpdCBhcyBhbiBlbnRpdHlcbiAgICAgICAgcG9pbnRlci5lbnRpdGllcy5wdXNoKGVudGl0eSk7XG5cbiAgICAgIH1cbiAgICAgIFxuICAgIH0pO1xuXG5cbiAgICAvLyBjaGVjayBmb3IgYW55IGZvbGRlcnMgdGhhdCBoYXZlIGJlZW4gcmVtb3ZlZC4uXG4gICAgZm9yICh2YXIgY2hpbGQgaW4gcG9pbnRlci5jaGlsZHJlbil7XG4gICAgICBpZiAocG9pbnRlci5jaGlsZHJlbi5oYXNPd25Qcm9wZXJ0eShjaGlsZCkpe1xuICAgICAgICB2YXIgZXhpc3RzID0gZmFsc2U7XG4gICAgICAgIGVudGl0aWVzLmZvckVhY2goZnVuY3Rpb24gKGVudGl0eSl7XG4gICAgICAgICAgaWYgKGVudGl0eS5uYW1lID09PSBjaGlsZCl7XG4gICAgICAgICAgICBleGlzdHMgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZXhpc3RzKXtcbiAgICAgICAgICBkZWxldGUgcG9pbnRlci5jaGlsZHJlbltjaGlsZF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gc3lzdGVtO1xuXG59XG5cblxuXG4vKlxuXG4gIC0gU3RhdHVzIG9uZTogTm90aGluZyBpcyBsb2FkZWQuXG4gIC0gU3RhdHVzIHR3bzogXG5cbiovIiwiLyogU29ja0pTIGNsaWVudCwgdmVyc2lvbiAwLjMuNCwgaHR0cDovL3NvY2tqcy5vcmcsIE1JVCBMaWNlbnNlXG5cbkNvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuXG4vLyAgICAgWypdIEluY2x1ZGluZyBsaWIvaW5kZXguanNcbi8vIFB1YmxpYyBvYmplY3RcblNvY2tKUyA9IChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICB2YXIgX2RvY3VtZW50ID0gZG9jdW1lbnQ7XG4gICAgICAgICAgICAgIHZhciBfd2luZG93ID0gd2luZG93O1xuICAgICAgICAgICAgICB2YXIgdXRpbHMgPSB7fTtcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3JldmVudHRhcmdldC5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxuLyogU2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbiBvZiBET00yIEV2ZW50VGFyZ2V0LlxuICogICBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1FdmVudHMvZXZlbnRzLmh0bWwjRXZlbnRzLUV2ZW50VGFyZ2V0XG4gKi9cbnZhciBSRXZlbnRUYXJnZXQgPSBmdW5jdGlvbigpIHt9O1xuUkV2ZW50VGFyZ2V0LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50VHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZighdGhpcy5fbGlzdGVuZXJzKSB7XG4gICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSB7fTtcbiAgICB9XG4gICAgaWYoIShldmVudFR5cGUgaW4gdGhpcy5fbGlzdGVuZXJzKSkge1xuICAgICAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnRUeXBlXSA9IFtdO1xuICAgIH1cbiAgICB2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV07XG4gICAgaWYodXRpbHMuYXJySW5kZXhPZihhcnIsIGxpc3RlbmVyKSA9PT0gLTEpIHtcbiAgICAgICAgYXJyLnB1c2gobGlzdGVuZXIpO1xuICAgIH1cbiAgICByZXR1cm47XG59O1xuXG5SRXZlbnRUYXJnZXQucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnRUeXBlLCBsaXN0ZW5lcikge1xuICAgIGlmKCEodGhpcy5fbGlzdGVuZXJzICYmIChldmVudFR5cGUgaW4gdGhpcy5fbGlzdGVuZXJzKSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV07XG4gICAgdmFyIGlkeCA9IHV0aWxzLmFyckluZGV4T2YoYXJyLCBsaXN0ZW5lcik7XG4gICAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICAgICAgaWYoYXJyLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudFR5cGVdID0gYXJyLnNsaWNlKDAsIGlkeCkuY29uY2F0KCBhcnIuc2xpY2UoaWR4KzEpICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2V2ZW50VHlwZV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm47XG59O1xuXG5SRXZlbnRUYXJnZXQucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgdCA9IGV2ZW50LnR5cGU7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGlmICh0aGlzWydvbicrdF0pIHtcbiAgICAgICAgdGhpc1snb24nK3RdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fbGlzdGVuZXJzICYmIHQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG4gICAgICAgIGZvcih2YXIgaT0wOyBpIDwgdGhpcy5fbGlzdGVuZXJzW3RdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLl9saXN0ZW5lcnNbdF1baV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi9yZXZlbnR0YXJnZXQuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3NpbXBsZWV2ZW50LmpzXG4vKlxuICogKioqKiogQkVHSU4gTElDRU5TRSBCTE9DSyAqKioqKlxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTIgVk13YXJlLCBJbmMuXG4gKlxuICogRm9yIHRoZSBsaWNlbnNlIHNlZSBDT1BZSU5HLlxuICogKioqKiogRU5EIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqL1xuXG52YXIgU2ltcGxlRXZlbnQgPSBmdW5jdGlvbih0eXBlLCBvYmopIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBmb3IodmFyIGsgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShrKSkgY29udGludWU7XG4gICAgICAgICAgICB0aGlzW2tdID0gb2JqW2tdO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU2ltcGxlRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHIgPSBbXTtcbiAgICBmb3IodmFyIGsgaW4gdGhpcykge1xuICAgICAgICBpZiAoIXRoaXMuaGFzT3duUHJvcGVydHkoaykpIGNvbnRpbnVlO1xuICAgICAgICB2YXIgdiA9IHRoaXNba107XG4gICAgICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Z1bmN0aW9uJykgdiA9ICdbZnVuY3Rpb25dJztcbiAgICAgICAgci5wdXNoKGsgKyAnPScgKyB2KTtcbiAgICB9XG4gICAgcmV0dXJuICdTaW1wbGVFdmVudCgnICsgci5qb2luKCcsICcpICsgJyknO1xufTtcbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvc2ltcGxlZXZlbnQuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL2V2ZW50ZW1pdHRlci5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxudmFyIEV2ZW50RW1pdHRlciA9IGZ1bmN0aW9uKGV2ZW50cykge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGF0Ll9ldmVudHMgPSBldmVudHMgfHwgW107XG4gICAgdGhhdC5fbGlzdGVuZXJzID0ge307XG59O1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGF0Ll92ZXJpZnlUeXBlKHR5cGUpO1xuICAgIGlmICh0aGF0Ll9udWtlZCkgcmV0dXJuO1xuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmICh0aGF0WydvbicrdHlwZV0pIHtcbiAgICAgICAgdGhhdFsnb24nK3R5cGVdLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgIH1cbiAgICBpZiAodHlwZSBpbiB0aGF0Ll9saXN0ZW5lcnMpIHtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHRoYXQuX2xpc3RlbmVyc1t0eXBlXS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhhdC5fbGlzdGVuZXJzW3R5cGVdW2ldLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoYXQuX3ZlcmlmeVR5cGUodHlwZSk7XG4gICAgaWYgKHRoYXQuX251a2VkKSByZXR1cm47XG5cbiAgICBpZiAoISh0eXBlIGluIHRoYXQuX2xpc3RlbmVycykpIHtcbiAgICAgICAgdGhhdC5fbGlzdGVuZXJzW3R5cGVdID0gW107XG4gICAgfVxuICAgIHRoYXQuX2xpc3RlbmVyc1t0eXBlXS5wdXNoKGNhbGxiYWNrKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX3ZlcmlmeVR5cGUgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh1dGlscy5hcnJJbmRleE9mKHRoYXQuX2V2ZW50cywgdHlwZSkgPT09IC0xKSB7XG4gICAgICAgIHV0aWxzLmxvZygnRXZlbnQgJyArIEpTT04uc3RyaW5naWZ5KHR5cGUpICtcbiAgICAgICAgICAgICAgICAgICcgbm90IGxpc3RlZCAnICsgSlNPTi5zdHJpbmdpZnkodGhhdC5fZXZlbnRzKSArXG4gICAgICAgICAgICAgICAgICAnIGluICcgKyB0aGF0KTtcbiAgICB9XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm51a2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC5fbnVrZWQgPSB0cnVlO1xuICAgIGZvcih2YXIgaT0wOyBpPHRoYXQuX2V2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkZWxldGUgdGhhdFt0aGF0Ll9ldmVudHNbaV1dO1xuICAgIH1cbiAgICB0aGF0Ll9saXN0ZW5lcnMgPSB7fTtcbn07XG4vLyAgICAgICAgIFsqXSBFbmQgb2YgbGliL2V2ZW50ZW1pdHRlci5qc1xuXG5cbi8vICAgICAgICAgWypdIEluY2x1ZGluZyBsaWIvdXRpbHMuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbnZhciByYW5kb21fc3RyaW5nX2NoYXJzID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OV8nO1xudXRpbHMucmFuZG9tX3N0cmluZyA9IGZ1bmN0aW9uKGxlbmd0aCwgbWF4KSB7XG4gICAgbWF4ID0gbWF4IHx8IHJhbmRvbV9zdHJpbmdfY2hhcnMubGVuZ3RoO1xuICAgIHZhciBpLCByZXQgPSBbXTtcbiAgICBmb3IoaT0wOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmV0LnB1c2goIHJhbmRvbV9zdHJpbmdfY2hhcnMuc3Vic3RyKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG1heCksMSkgKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldC5qb2luKCcnKTtcbn07XG51dGlscy5yYW5kb21fbnVtYmVyID0gZnVuY3Rpb24obWF4KSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG1heCk7XG59O1xudXRpbHMucmFuZG9tX251bWJlcl9zdHJpbmcgPSBmdW5jdGlvbihtYXgpIHtcbiAgICB2YXIgdCA9ICgnJysobWF4IC0gMSkpLmxlbmd0aDtcbiAgICB2YXIgcCA9IEFycmF5KHQrMSkuam9pbignMCcpO1xuICAgIHJldHVybiAocCArIHV0aWxzLnJhbmRvbV9udW1iZXIobWF4KSkuc2xpY2UoLXQpO1xufTtcblxuLy8gQXNzdW1pbmcgdGhhdCB1cmwgbG9va3MgbGlrZTogaHR0cDovL2FzZGFzZDoxMTEvYXNkXG51dGlscy5nZXRPcmlnaW4gPSBmdW5jdGlvbih1cmwpIHtcbiAgICB1cmwgKz0gJy8nO1xuICAgIHZhciBwYXJ0cyA9IHVybC5zcGxpdCgnLycpLnNsaWNlKDAsIDMpO1xuICAgIHJldHVybiBwYXJ0cy5qb2luKCcvJyk7XG59O1xuXG51dGlscy5pc1NhbWVPcmlnaW5VcmwgPSBmdW5jdGlvbih1cmxfYSwgdXJsX2IpIHtcbiAgICAvLyBsb2NhdGlvbi5vcmlnaW4gd291bGQgZG8sIGJ1dCBpdCdzIG5vdCBhbHdheXMgYXZhaWxhYmxlLlxuICAgIGlmICghdXJsX2IpIHVybF9iID0gX3dpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXG4gICAgcmV0dXJuICh1cmxfYS5zcGxpdCgnLycpLnNsaWNlKDAsMykuam9pbignLycpXG4gICAgICAgICAgICAgICAgPT09XG4gICAgICAgICAgICB1cmxfYi5zcGxpdCgnLycpLnNsaWNlKDAsMykuam9pbignLycpKTtcbn07XG5cbnV0aWxzLmdldFBhcmVudERvbWFpbiA9IGZ1bmN0aW9uKHVybCkge1xuICAgIC8vIGlwdjQgaXAgYWRkcmVzc1xuICAgIGlmICgvXlswLTkuXSokLy50ZXN0KHVybCkpIHJldHVybiB1cmw7XG4gICAgLy8gaXB2NiBpcCBhZGRyZXNzXG4gICAgaWYgKC9eXFxbLy50ZXN0KHVybCkpIHJldHVybiB1cmw7XG4gICAgLy8gbm8gZG90c1xuICAgIGlmICghKC9bLl0vLnRlc3QodXJsKSkpIHJldHVybiB1cmw7XG5cbiAgICB2YXIgcGFydHMgPSB1cmwuc3BsaXQoJy4nKS5zbGljZSgxKTtcbiAgICByZXR1cm4gcGFydHMuam9pbignLicpO1xufTtcblxudXRpbHMub2JqZWN0RXh0ZW5kID0gZnVuY3Rpb24oZHN0LCBzcmMpIHtcbiAgICBmb3IodmFyIGsgaW4gc3JjKSB7XG4gICAgICAgIGlmIChzcmMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIGRzdFtrXSA9IHNyY1trXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZHN0O1xufTtcblxudmFyIFdQcmVmaXggPSAnX2pwJztcblxudXRpbHMucG9sbHV0ZUdsb2JhbE5hbWVzcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghKFdQcmVmaXggaW4gX3dpbmRvdykpIHtcbiAgICAgICAgX3dpbmRvd1tXUHJlZml4XSA9IHt9O1xuICAgIH1cbn07XG5cbnV0aWxzLmNsb3NlRnJhbWUgPSBmdW5jdGlvbiAoY29kZSwgcmVhc29uKSB7XG4gICAgcmV0dXJuICdjJytKU09OLnN0cmluZ2lmeShbY29kZSwgcmVhc29uXSk7XG59O1xuXG51dGlscy51c2VyU2V0Q29kZSA9IGZ1bmN0aW9uIChjb2RlKSB7XG4gICAgcmV0dXJuIGNvZGUgPT09IDEwMDAgfHwgKGNvZGUgPj0gMzAwMCAmJiBjb2RlIDw9IDQ5OTkpO1xufTtcblxuLy8gU2VlOiBodHRwOi8vd3d3LmVyZy5hYmRuLmFjLnVrL35nZXJyaXQvZGNjcC9ub3Rlcy9jY2lkMi9ydG9fZXN0aW1hdG9yL1xuLy8gYW5kIFJGQyAyOTg4LlxudXRpbHMuY291bnRSVE8gPSBmdW5jdGlvbiAocnR0KSB7XG4gICAgdmFyIHJ0bztcbiAgICBpZiAocnR0ID4gMTAwKSB7XG4gICAgICAgIHJ0byA9IDMgKiBydHQ7IC8vIHJ0byA+IDMwMG1zZWNcbiAgICB9IGVsc2Uge1xuICAgICAgICBydG8gPSBydHQgKyAyMDA7IC8vIDIwMG1zZWMgPCBydG8gPD0gMzAwbXNlY1xuICAgIH1cbiAgICByZXR1cm4gcnRvO1xufVxuXG51dGlscy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoX3dpbmRvdy5jb25zb2xlICYmIGNvbnNvbGUubG9nICYmIGNvbnNvbGUubG9nLmFwcGx5KSB7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgfVxufTtcblxudXRpbHMuYmluZCA9IGZ1bmN0aW9uKGZ1biwgdGhhdCkge1xuICAgIGlmIChmdW4uYmluZCkge1xuICAgICAgICByZXR1cm4gZnVuLmJpbmQodGhhdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bi5hcHBseSh0aGF0LCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgIH1cbn07XG5cbnV0aWxzLmZsYXRVcmwgPSBmdW5jdGlvbih1cmwpIHtcbiAgICByZXR1cm4gdXJsLmluZGV4T2YoJz8nKSA9PT0gLTEgJiYgdXJsLmluZGV4T2YoJyMnKSA9PT0gLTE7XG59O1xuXG51dGlscy5hbWVuZFVybCA9IGZ1bmN0aW9uKHVybCkge1xuICAgIHZhciBkbCA9IF9kb2N1bWVudC5sb2NhdGlvbjtcbiAgICBpZiAoIXVybCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1dyb25nIHVybCBmb3IgU29ja0pTJyk7XG4gICAgfVxuICAgIGlmICghdXRpbHMuZmxhdFVybCh1cmwpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBiYXNpYyB1cmxzIGFyZSBzdXBwb3J0ZWQgaW4gU29ja0pTJyk7XG4gICAgfVxuXG4gICAgLy8gICcvL2FiYycgLS0+ICdodHRwOi8vYWJjJ1xuICAgIGlmICh1cmwuaW5kZXhPZignLy8nKSA9PT0gMCkge1xuICAgICAgICB1cmwgPSBkbC5wcm90b2NvbCArIHVybDtcbiAgICB9XG4gICAgLy8gJy9hYmMnIC0tPiAnaHR0cDovL2xvY2FsaG9zdDo4MC9hYmMnXG4gICAgaWYgKHVybC5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgICAgdXJsID0gZGwucHJvdG9jb2wgKyAnLy8nICsgZGwuaG9zdCArIHVybDtcbiAgICB9XG4gICAgLy8gc3RyaXAgdHJhaWxpbmcgc2xhc2hlc1xuICAgIHVybCA9IHVybC5yZXBsYWNlKC9bL10rJC8sJycpO1xuICAgIHJldHVybiB1cmw7XG59O1xuXG4vLyBJRSBkb2Vzbid0IHN1cHBvcnQgW10uaW5kZXhPZi5cbnV0aWxzLmFyckluZGV4T2YgPSBmdW5jdGlvbihhcnIsIG9iail7XG4gICAgZm9yKHZhciBpPTA7IGkgPCBhcnIubGVuZ3RoOyBpKyspe1xuICAgICAgICBpZihhcnJbaV0gPT09IG9iail7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59O1xuXG51dGlscy5hcnJTa2lwID0gZnVuY3Rpb24oYXJyLCBvYmopIHtcbiAgICB2YXIgaWR4ID0gdXRpbHMuYXJySW5kZXhPZihhcnIsIG9iaik7XG4gICAgaWYgKGlkeCA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGFyci5zbGljZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkc3QgPSBhcnIuc2xpY2UoMCwgaWR4KTtcbiAgICAgICAgcmV0dXJuIGRzdC5jb25jYXQoYXJyLnNsaWNlKGlkeCsxKSk7XG4gICAgfVxufTtcblxuLy8gVmlhOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS8xMTMzMTIyLzIxMjFjNjAxYzU1NDkxNTU0ODNmNTBiZTNkYTUzMDVlODNiOGM1ZGZcbnV0aWxzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwodmFsdWUpLmluZGV4T2YoJ0FycmF5JykgPj0gMFxufTtcblxudXRpbHMuZGVsYXkgPSBmdW5jdGlvbih0LCBmdW4pIHtcbiAgICBpZih0eXBlb2YgdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmdW4gPSB0O1xuICAgICAgICB0ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCB0KTtcbn07XG5cblxuLy8gQ2hhcnMgd29ydGggZXNjYXBpbmcsIGFzIGRlZmluZWQgYnkgRG91Z2xhcyBDcm9ja2ZvcmQ6XG4vLyAgIGh0dHBzOi8vZ2l0aHViLmNvbS9kb3VnbGFzY3JvY2tmb3JkL0pTT04tanMvYmxvYi80N2E5ODgyY2RkZWIxZTg1MjllMDdhZjk3MzYyMTgwNzUzNzJiOGFjL2pzb24yLmpzI0wxOTZcbnZhciBqc29uX2VzY2FwYWJsZSA9IC9bXFxcXFxcXCJcXHgwMC1cXHgxZlxceDdmLVxceDlmXFx1MDBhZFxcdTA2MDAtXFx1MDYwNFxcdTA3MGZcXHUxN2I0XFx1MTdiNVxcdTIwMGMtXFx1MjAwZlxcdTIwMjgtXFx1MjAyZlxcdTIwNjAtXFx1MjA2ZlxcdWZlZmZcXHVmZmYwLVxcdWZmZmZdL2csXG4gICAganNvbl9sb29rdXAgPSB7XG5cIlxcdTAwMDBcIjpcIlxcXFx1MDAwMFwiLFwiXFx1MDAwMVwiOlwiXFxcXHUwMDAxXCIsXCJcXHUwMDAyXCI6XCJcXFxcdTAwMDJcIixcIlxcdTAwMDNcIjpcIlxcXFx1MDAwM1wiLFxuXCJcXHUwMDA0XCI6XCJcXFxcdTAwMDRcIixcIlxcdTAwMDVcIjpcIlxcXFx1MDAwNVwiLFwiXFx1MDAwNlwiOlwiXFxcXHUwMDA2XCIsXCJcXHUwMDA3XCI6XCJcXFxcdTAwMDdcIixcblwiXFxiXCI6XCJcXFxcYlwiLFwiXFx0XCI6XCJcXFxcdFwiLFwiXFxuXCI6XCJcXFxcblwiLFwiXFx1MDAwYlwiOlwiXFxcXHUwMDBiXCIsXCJcXGZcIjpcIlxcXFxmXCIsXCJcXHJcIjpcIlxcXFxyXCIsXG5cIlxcdTAwMGVcIjpcIlxcXFx1MDAwZVwiLFwiXFx1MDAwZlwiOlwiXFxcXHUwMDBmXCIsXCJcXHUwMDEwXCI6XCJcXFxcdTAwMTBcIixcIlxcdTAwMTFcIjpcIlxcXFx1MDAxMVwiLFxuXCJcXHUwMDEyXCI6XCJcXFxcdTAwMTJcIixcIlxcdTAwMTNcIjpcIlxcXFx1MDAxM1wiLFwiXFx1MDAxNFwiOlwiXFxcXHUwMDE0XCIsXCJcXHUwMDE1XCI6XCJcXFxcdTAwMTVcIixcblwiXFx1MDAxNlwiOlwiXFxcXHUwMDE2XCIsXCJcXHUwMDE3XCI6XCJcXFxcdTAwMTdcIixcIlxcdTAwMThcIjpcIlxcXFx1MDAxOFwiLFwiXFx1MDAxOVwiOlwiXFxcXHUwMDE5XCIsXG5cIlxcdTAwMWFcIjpcIlxcXFx1MDAxYVwiLFwiXFx1MDAxYlwiOlwiXFxcXHUwMDFiXCIsXCJcXHUwMDFjXCI6XCJcXFxcdTAwMWNcIixcIlxcdTAwMWRcIjpcIlxcXFx1MDAxZFwiLFxuXCJcXHUwMDFlXCI6XCJcXFxcdTAwMWVcIixcIlxcdTAwMWZcIjpcIlxcXFx1MDAxZlwiLFwiXFxcIlwiOlwiXFxcXFxcXCJcIixcIlxcXFxcIjpcIlxcXFxcXFxcXCIsXG5cIlxcdTAwN2ZcIjpcIlxcXFx1MDA3ZlwiLFwiXFx1MDA4MFwiOlwiXFxcXHUwMDgwXCIsXCJcXHUwMDgxXCI6XCJcXFxcdTAwODFcIixcIlxcdTAwODJcIjpcIlxcXFx1MDA4MlwiLFxuXCJcXHUwMDgzXCI6XCJcXFxcdTAwODNcIixcIlxcdTAwODRcIjpcIlxcXFx1MDA4NFwiLFwiXFx1MDA4NVwiOlwiXFxcXHUwMDg1XCIsXCJcXHUwMDg2XCI6XCJcXFxcdTAwODZcIixcblwiXFx1MDA4N1wiOlwiXFxcXHUwMDg3XCIsXCJcXHUwMDg4XCI6XCJcXFxcdTAwODhcIixcIlxcdTAwODlcIjpcIlxcXFx1MDA4OVwiLFwiXFx1MDA4YVwiOlwiXFxcXHUwMDhhXCIsXG5cIlxcdTAwOGJcIjpcIlxcXFx1MDA4YlwiLFwiXFx1MDA4Y1wiOlwiXFxcXHUwMDhjXCIsXCJcXHUwMDhkXCI6XCJcXFxcdTAwOGRcIixcIlxcdTAwOGVcIjpcIlxcXFx1MDA4ZVwiLFxuXCJcXHUwMDhmXCI6XCJcXFxcdTAwOGZcIixcIlxcdTAwOTBcIjpcIlxcXFx1MDA5MFwiLFwiXFx1MDA5MVwiOlwiXFxcXHUwMDkxXCIsXCJcXHUwMDkyXCI6XCJcXFxcdTAwOTJcIixcblwiXFx1MDA5M1wiOlwiXFxcXHUwMDkzXCIsXCJcXHUwMDk0XCI6XCJcXFxcdTAwOTRcIixcIlxcdTAwOTVcIjpcIlxcXFx1MDA5NVwiLFwiXFx1MDA5NlwiOlwiXFxcXHUwMDk2XCIsXG5cIlxcdTAwOTdcIjpcIlxcXFx1MDA5N1wiLFwiXFx1MDA5OFwiOlwiXFxcXHUwMDk4XCIsXCJcXHUwMDk5XCI6XCJcXFxcdTAwOTlcIixcIlxcdTAwOWFcIjpcIlxcXFx1MDA5YVwiLFxuXCJcXHUwMDliXCI6XCJcXFxcdTAwOWJcIixcIlxcdTAwOWNcIjpcIlxcXFx1MDA5Y1wiLFwiXFx1MDA5ZFwiOlwiXFxcXHUwMDlkXCIsXCJcXHUwMDllXCI6XCJcXFxcdTAwOWVcIixcblwiXFx1MDA5ZlwiOlwiXFxcXHUwMDlmXCIsXCJcXHUwMGFkXCI6XCJcXFxcdTAwYWRcIixcIlxcdTA2MDBcIjpcIlxcXFx1MDYwMFwiLFwiXFx1MDYwMVwiOlwiXFxcXHUwNjAxXCIsXG5cIlxcdTA2MDJcIjpcIlxcXFx1MDYwMlwiLFwiXFx1MDYwM1wiOlwiXFxcXHUwNjAzXCIsXCJcXHUwNjA0XCI6XCJcXFxcdTA2MDRcIixcIlxcdTA3MGZcIjpcIlxcXFx1MDcwZlwiLFxuXCJcXHUxN2I0XCI6XCJcXFxcdTE3YjRcIixcIlxcdTE3YjVcIjpcIlxcXFx1MTdiNVwiLFwiXFx1MjAwY1wiOlwiXFxcXHUyMDBjXCIsXCJcXHUyMDBkXCI6XCJcXFxcdTIwMGRcIixcblwiXFx1MjAwZVwiOlwiXFxcXHUyMDBlXCIsXCJcXHUyMDBmXCI6XCJcXFxcdTIwMGZcIixcIlxcdTIwMjhcIjpcIlxcXFx1MjAyOFwiLFwiXFx1MjAyOVwiOlwiXFxcXHUyMDI5XCIsXG5cIlxcdTIwMmFcIjpcIlxcXFx1MjAyYVwiLFwiXFx1MjAyYlwiOlwiXFxcXHUyMDJiXCIsXCJcXHUyMDJjXCI6XCJcXFxcdTIwMmNcIixcIlxcdTIwMmRcIjpcIlxcXFx1MjAyZFwiLFxuXCJcXHUyMDJlXCI6XCJcXFxcdTIwMmVcIixcIlxcdTIwMmZcIjpcIlxcXFx1MjAyZlwiLFwiXFx1MjA2MFwiOlwiXFxcXHUyMDYwXCIsXCJcXHUyMDYxXCI6XCJcXFxcdTIwNjFcIixcblwiXFx1MjA2MlwiOlwiXFxcXHUyMDYyXCIsXCJcXHUyMDYzXCI6XCJcXFxcdTIwNjNcIixcIlxcdTIwNjRcIjpcIlxcXFx1MjA2NFwiLFwiXFx1MjA2NVwiOlwiXFxcXHUyMDY1XCIsXG5cIlxcdTIwNjZcIjpcIlxcXFx1MjA2NlwiLFwiXFx1MjA2N1wiOlwiXFxcXHUyMDY3XCIsXCJcXHUyMDY4XCI6XCJcXFxcdTIwNjhcIixcIlxcdTIwNjlcIjpcIlxcXFx1MjA2OVwiLFxuXCJcXHUyMDZhXCI6XCJcXFxcdTIwNmFcIixcIlxcdTIwNmJcIjpcIlxcXFx1MjA2YlwiLFwiXFx1MjA2Y1wiOlwiXFxcXHUyMDZjXCIsXCJcXHUyMDZkXCI6XCJcXFxcdTIwNmRcIixcblwiXFx1MjA2ZVwiOlwiXFxcXHUyMDZlXCIsXCJcXHUyMDZmXCI6XCJcXFxcdTIwNmZcIixcIlxcdWZlZmZcIjpcIlxcXFx1ZmVmZlwiLFwiXFx1ZmZmMFwiOlwiXFxcXHVmZmYwXCIsXG5cIlxcdWZmZjFcIjpcIlxcXFx1ZmZmMVwiLFwiXFx1ZmZmMlwiOlwiXFxcXHVmZmYyXCIsXCJcXHVmZmYzXCI6XCJcXFxcdWZmZjNcIixcIlxcdWZmZjRcIjpcIlxcXFx1ZmZmNFwiLFxuXCJcXHVmZmY1XCI6XCJcXFxcdWZmZjVcIixcIlxcdWZmZjZcIjpcIlxcXFx1ZmZmNlwiLFwiXFx1ZmZmN1wiOlwiXFxcXHVmZmY3XCIsXCJcXHVmZmY4XCI6XCJcXFxcdWZmZjhcIixcblwiXFx1ZmZmOVwiOlwiXFxcXHVmZmY5XCIsXCJcXHVmZmZhXCI6XCJcXFxcdWZmZmFcIixcIlxcdWZmZmJcIjpcIlxcXFx1ZmZmYlwiLFwiXFx1ZmZmY1wiOlwiXFxcXHVmZmZjXCIsXG5cIlxcdWZmZmRcIjpcIlxcXFx1ZmZmZFwiLFwiXFx1ZmZmZVwiOlwiXFxcXHVmZmZlXCIsXCJcXHVmZmZmXCI6XCJcXFxcdWZmZmZcIn07XG5cbi8vIFNvbWUgZXh0cmEgY2hhcmFjdGVycyB0aGF0IENocm9tZSBnZXRzIHdyb25nLCBhbmQgc3Vic3RpdHV0ZXMgd2l0aFxuLy8gc29tZXRoaW5nIGVsc2Ugb24gdGhlIHdpcmUuXG52YXIgZXh0cmFfZXNjYXBhYmxlID0gL1tcXHgwMC1cXHgxZlxcdWQ4MDAtXFx1ZGZmZlxcdWZmZmVcXHVmZmZmXFx1MDMwMC1cXHUwMzMzXFx1MDMzZC1cXHUwMzQ2XFx1MDM0YS1cXHUwMzRjXFx1MDM1MC1cXHUwMzUyXFx1MDM1Ny1cXHUwMzU4XFx1MDM1Yy1cXHUwMzYyXFx1MDM3NFxcdTAzN2VcXHUwMzg3XFx1MDU5MS1cXHUwNWFmXFx1MDVjNFxcdTA2MTAtXFx1MDYxN1xcdTA2NTMtXFx1MDY1NFxcdTA2NTctXFx1MDY1YlxcdTA2NWQtXFx1MDY1ZVxcdTA2ZGYtXFx1MDZlMlxcdTA2ZWItXFx1MDZlY1xcdTA3MzBcXHUwNzMyLVxcdTA3MzNcXHUwNzM1LVxcdTA3MzZcXHUwNzNhXFx1MDczZFxcdTA3M2YtXFx1MDc0MVxcdTA3NDNcXHUwNzQ1XFx1MDc0N1xcdTA3ZWItXFx1MDdmMVxcdTA5NTFcXHUwOTU4LVxcdTA5NWZcXHUwOWRjLVxcdTA5ZGRcXHUwOWRmXFx1MGEzM1xcdTBhMzZcXHUwYTU5LVxcdTBhNWJcXHUwYTVlXFx1MGI1Yy1cXHUwYjVkXFx1MGUzOC1cXHUwZTM5XFx1MGY0M1xcdTBmNGRcXHUwZjUyXFx1MGY1N1xcdTBmNWNcXHUwZjY5XFx1MGY3Mi1cXHUwZjc2XFx1MGY3OFxcdTBmODAtXFx1MGY4M1xcdTBmOTNcXHUwZjlkXFx1MGZhMlxcdTBmYTdcXHUwZmFjXFx1MGZiOVxcdTE5MzktXFx1MTkzYVxcdTFhMTdcXHUxYjZiXFx1MWNkYS1cXHUxY2RiXFx1MWRjMC1cXHUxZGNmXFx1MWRmY1xcdTFkZmVcXHUxZjcxXFx1MWY3M1xcdTFmNzVcXHUxZjc3XFx1MWY3OVxcdTFmN2JcXHUxZjdkXFx1MWZiYlxcdTFmYmVcXHUxZmM5XFx1MWZjYlxcdTFmZDNcXHUxZmRiXFx1MWZlM1xcdTFmZWJcXHUxZmVlLVxcdTFmZWZcXHUxZmY5XFx1MWZmYlxcdTFmZmRcXHUyMDAwLVxcdTIwMDFcXHUyMGQwLVxcdTIwZDFcXHUyMGQ0LVxcdTIwZDdcXHUyMGU3LVxcdTIwZTlcXHUyMTI2XFx1MjEyYS1cXHUyMTJiXFx1MjMyOS1cXHUyMzJhXFx1MmFkY1xcdTMwMmItXFx1MzAyY1xcdWFhYjItXFx1YWFiM1xcdWY5MDAtXFx1ZmEwZFxcdWZhMTBcXHVmYTEyXFx1ZmExNS1cXHVmYTFlXFx1ZmEyMFxcdWZhMjJcXHVmYTI1LVxcdWZhMjZcXHVmYTJhLVxcdWZhMmRcXHVmYTMwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjFkXFx1ZmIxZlxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwLVxcdWZiNDFcXHVmYjQzLVxcdWZiNDRcXHVmYjQ2LVxcdWZiNGVcXHVmZmYwLVxcdWZmZmZdL2csXG4gICAgZXh0cmFfbG9va3VwO1xuXG4vLyBKU09OIFF1b3RlIHN0cmluZy4gVXNlIG5hdGl2ZSBpbXBsZW1lbnRhdGlvbiB3aGVuIHBvc3NpYmxlLlxudmFyIEpTT05RdW90ZSA9IChKU09OICYmIEpTT04uc3RyaW5naWZ5KSB8fCBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICBqc29uX2VzY2FwYWJsZS5sYXN0SW5kZXggPSAwO1xuICAgIGlmIChqc29uX2VzY2FwYWJsZS50ZXN0KHN0cmluZykpIHtcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UoanNvbl9lc2NhcGFibGUsIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICAgIHJldHVybiBqc29uX2xvb2t1cFthXTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiAnXCInICsgc3RyaW5nICsgJ1wiJztcbn07XG5cbi8vIFRoaXMgbWF5IGJlIHF1aXRlIHNsb3csIHNvIGxldCdzIGRlbGF5IHVudGlsIHVzZXIgYWN0dWFsbHkgdXNlcyBiYWRcbi8vIGNoYXJhY3RlcnMuXG52YXIgdW5yb2xsX2xvb2t1cCA9IGZ1bmN0aW9uKGVzY2FwYWJsZSkge1xuICAgIHZhciBpO1xuICAgIHZhciB1bnJvbGxlZCA9IHt9XG4gICAgdmFyIGMgPSBbXVxuICAgIGZvcihpPTA7IGk8NjU1MzY7IGkrKykge1xuICAgICAgICBjLnB1c2goIFN0cmluZy5mcm9tQ2hhckNvZGUoaSkgKTtcbiAgICB9XG4gICAgZXNjYXBhYmxlLmxhc3RJbmRleCA9IDA7XG4gICAgYy5qb2luKCcnKS5yZXBsYWNlKGVzY2FwYWJsZSwgZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgdW5yb2xsZWRbIGEgXSA9ICdcXFxcdScgKyAoJzAwMDAnICsgYS5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTQpO1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSk7XG4gICAgZXNjYXBhYmxlLmxhc3RJbmRleCA9IDA7XG4gICAgcmV0dXJuIHVucm9sbGVkO1xufTtcblxuLy8gUXVvdGUgc3RyaW5nLCBhbHNvIHRha2luZyBjYXJlIG9mIHVuaWNvZGUgY2hhcmFjdGVycyB0aGF0IGJyb3dzZXJzXG4vLyBvZnRlbiBicmVhay4gRXNwZWNpYWxseSwgdGFrZSBjYXJlIG9mIHVuaWNvZGUgc3Vycm9nYXRlczpcbi8vICAgIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTWFwcGluZ19vZl9Vbmljb2RlX2NoYXJhY3RlcnMjU3Vycm9nYXRlc1xudXRpbHMucXVvdGUgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICB2YXIgcXVvdGVkID0gSlNPTlF1b3RlKHN0cmluZyk7XG5cbiAgICAvLyBJbiBtb3N0IGNhc2VzIHRoaXMgc2hvdWxkIGJlIHZlcnkgZmFzdCBhbmQgZ29vZCBlbm91Z2guXG4gICAgZXh0cmFfZXNjYXBhYmxlLmxhc3RJbmRleCA9IDA7XG4gICAgaWYoIWV4dHJhX2VzY2FwYWJsZS50ZXN0KHF1b3RlZCkpIHtcbiAgICAgICAgcmV0dXJuIHF1b3RlZDtcbiAgICB9XG5cbiAgICBpZighZXh0cmFfbG9va3VwKSBleHRyYV9sb29rdXAgPSB1bnJvbGxfbG9va3VwKGV4dHJhX2VzY2FwYWJsZSk7XG5cbiAgICByZXR1cm4gcXVvdGVkLnJlcGxhY2UoZXh0cmFfZXNjYXBhYmxlLCBmdW5jdGlvbihhKSB7XG4gICAgICAgIHJldHVybiBleHRyYV9sb29rdXBbYV07XG4gICAgfSk7XG59XG5cbnZhciBfYWxsX3Byb3RvY29scyA9IFsnd2Vic29ja2V0JyxcbiAgICAgICAgICAgICAgICAgICAgICAneGRyLXN0cmVhbWluZycsXG4gICAgICAgICAgICAgICAgICAgICAgJ3hoci1zdHJlYW1pbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICdpZnJhbWUtZXZlbnRzb3VyY2UnLFxuICAgICAgICAgICAgICAgICAgICAgICdpZnJhbWUtaHRtbGZpbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICd4ZHItcG9sbGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgJ3hoci1wb2xsaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAnaWZyYW1lLXhoci1wb2xsaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAnanNvbnAtcG9sbGluZyddO1xuXG51dGlscy5wcm9iZVByb3RvY29scyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwcm9iZWQgPSB7fTtcbiAgICBmb3IodmFyIGk9MDsgaTxfYWxsX3Byb3RvY29scy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvdG9jb2wgPSBfYWxsX3Byb3RvY29sc1tpXTtcbiAgICAgICAgLy8gVXNlciBjYW4gaGF2ZSBhIHR5cG8gaW4gcHJvdG9jb2wgbmFtZS5cbiAgICAgICAgcHJvYmVkW3Byb3RvY29sXSA9IFNvY2tKU1twcm90b2NvbF0gJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFNvY2tKU1twcm90b2NvbF0uZW5hYmxlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gcHJvYmVkO1xufTtcblxudXRpbHMuZGV0ZWN0UHJvdG9jb2xzID0gZnVuY3Rpb24ocHJvYmVkLCBwcm90b2NvbHNfd2hpdGVsaXN0LCBpbmZvKSB7XG4gICAgdmFyIHBlID0ge30sXG4gICAgICAgIHByb3RvY29scyA9IFtdO1xuICAgIGlmICghcHJvdG9jb2xzX3doaXRlbGlzdCkgcHJvdG9jb2xzX3doaXRlbGlzdCA9IF9hbGxfcHJvdG9jb2xzO1xuICAgIGZvcih2YXIgaT0wOyBpPHByb3RvY29sc193aGl0ZWxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3RvY29sID0gcHJvdG9jb2xzX3doaXRlbGlzdFtpXTtcbiAgICAgICAgcGVbcHJvdG9jb2xdID0gcHJvYmVkW3Byb3RvY29sXTtcbiAgICB9XG4gICAgdmFyIG1heWJlX3B1c2ggPSBmdW5jdGlvbihwcm90b3MpIHtcbiAgICAgICAgdmFyIHByb3RvID0gcHJvdG9zLnNoaWZ0KCk7XG4gICAgICAgIGlmIChwZVtwcm90b10pIHtcbiAgICAgICAgICAgIHByb3RvY29scy5wdXNoKHByb3RvKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChwcm90b3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIG1heWJlX3B1c2gocHJvdG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIDEuIFdlYnNvY2tldFxuICAgIGlmIChpbmZvLndlYnNvY2tldCAhPT0gZmFsc2UpIHtcbiAgICAgICAgbWF5YmVfcHVzaChbJ3dlYnNvY2tldCddKTtcbiAgICB9XG5cbiAgICAvLyAyLiBTdHJlYW1pbmdcbiAgICBpZiAocGVbJ3hoci1zdHJlYW1pbmcnXSAmJiAhaW5mby5udWxsX29yaWdpbikge1xuICAgICAgICBwcm90b2NvbHMucHVzaCgneGhyLXN0cmVhbWluZycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChwZVsneGRyLXN0cmVhbWluZyddICYmICFpbmZvLmNvb2tpZV9uZWVkZWQgJiYgIWluZm8ubnVsbF9vcmlnaW4pIHtcbiAgICAgICAgICAgIHByb3RvY29scy5wdXNoKCd4ZHItc3RyZWFtaW5nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXliZV9wdXNoKFsnaWZyYW1lLWV2ZW50c291cmNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdpZnJhbWUtaHRtbGZpbGUnXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAzLiBQb2xsaW5nXG4gICAgaWYgKHBlWyd4aHItcG9sbGluZyddICYmICFpbmZvLm51bGxfb3JpZ2luKSB7XG4gICAgICAgIHByb3RvY29scy5wdXNoKCd4aHItcG9sbGluZycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChwZVsneGRyLXBvbGxpbmcnXSAmJiAhaW5mby5jb29raWVfbmVlZGVkICYmICFpbmZvLm51bGxfb3JpZ2luKSB7XG4gICAgICAgICAgICBwcm90b2NvbHMucHVzaCgneGRyLXBvbGxpbmcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1heWJlX3B1c2goWydpZnJhbWUteGhyLXBvbGxpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2pzb25wLXBvbGxpbmcnXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHByb3RvY29scztcbn1cbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvdXRpbHMuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL2RvbS5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxuLy8gTWF5IGJlIHVzZWQgYnkgaHRtbGZpbGUganNvbnAgYW5kIHRyYW5zcG9ydHMuXG52YXIgTVByZWZpeCA9ICdfc29ja2pzX2dsb2JhbCc7XG51dGlscy5jcmVhdGVIb29rID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdpbmRvd19pZCA9ICdhJyArIHV0aWxzLnJhbmRvbV9zdHJpbmcoOCk7XG4gICAgaWYgKCEoTVByZWZpeCBpbiBfd2luZG93KSkge1xuICAgICAgICB2YXIgbWFwID0ge307XG4gICAgICAgIF93aW5kb3dbTVByZWZpeF0gPSBmdW5jdGlvbih3aW5kb3dfaWQpIHtcbiAgICAgICAgICAgIGlmICghKHdpbmRvd19pZCBpbiBtYXApKSB7XG4gICAgICAgICAgICAgICAgbWFwW3dpbmRvd19pZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiB3aW5kb3dfaWQsXG4gICAgICAgICAgICAgICAgICAgIGRlbDogZnVuY3Rpb24oKSB7ZGVsZXRlIG1hcFt3aW5kb3dfaWRdO31cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1hcFt3aW5kb3dfaWRdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBfd2luZG93W01QcmVmaXhdKHdpbmRvd19pZCk7XG59O1xuXG5cblxudXRpbHMuYXR0YWNoTWVzc2FnZSA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgdXRpbHMuYXR0YWNoRXZlbnQoJ21lc3NhZ2UnLCBsaXN0ZW5lcik7XG59O1xudXRpbHMuYXR0YWNoRXZlbnQgPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIF93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lciwgZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElFIHF1aXJrcy5cbiAgICAgICAgLy8gQWNjb3JkaW5nIHRvOiBodHRwOi8vc3RldmVzb3VkZXJzLmNvbS9taXNjL3Rlc3QtcG9zdG1lc3NhZ2UucGhwXG4gICAgICAgIC8vIHRoZSBtZXNzYWdlIGdldHMgZGVsaXZlcmVkIG9ubHkgdG8gJ2RvY3VtZW50Jywgbm90ICd3aW5kb3cnLlxuICAgICAgICBfZG9jdW1lbnQuYXR0YWNoRXZlbnQoXCJvblwiICsgZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgICAgLy8gSSBnZXQgJ3dpbmRvdycgZm9yIGllOC5cbiAgICAgICAgX3dpbmRvdy5hdHRhY2hFdmVudChcIm9uXCIgKyBldmVudCwgbGlzdGVuZXIpO1xuICAgIH1cbn07XG5cbnV0aWxzLmRldGFjaE1lc3NhZ2UgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIHV0aWxzLmRldGFjaEV2ZW50KCdtZXNzYWdlJywgbGlzdGVuZXIpO1xufTtcbnV0aWxzLmRldGFjaEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBfd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIF93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBfZG9jdW1lbnQuZGV0YWNoRXZlbnQoXCJvblwiICsgZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgICAgX3dpbmRvdy5kZXRhY2hFdmVudChcIm9uXCIgKyBldmVudCwgbGlzdGVuZXIpO1xuICAgIH1cbn07XG5cblxudmFyIG9uX3VubG9hZCA9IHt9O1xuLy8gVGhpbmdzIHJlZ2lzdGVyZWQgYWZ0ZXIgYmVmb3JldW5sb2FkIGFyZSB0byBiZSBjYWxsZWQgaW1tZWRpYXRlbHkuXG52YXIgYWZ0ZXJfdW5sb2FkID0gZmFsc2U7XG5cbnZhciB0cmlnZ2VyX3VubG9hZF9jYWxsYmFja3MgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IodmFyIHJlZiBpbiBvbl91bmxvYWQpIHtcbiAgICAgICAgb25fdW5sb2FkW3JlZl0oKTtcbiAgICAgICAgZGVsZXRlIG9uX3VubG9hZFtyZWZdO1xuICAgIH07XG59O1xuXG52YXIgdW5sb2FkX3RyaWdnZXJlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKGFmdGVyX3VubG9hZCkgcmV0dXJuO1xuICAgIGFmdGVyX3VubG9hZCA9IHRydWU7XG4gICAgdHJpZ2dlcl91bmxvYWRfY2FsbGJhY2tzKCk7XG59O1xuXG4vLyAndW5sb2FkJyBhbG9uZSBpcyBub3QgcmVsaWFibGUgaW4gb3BlcmEgd2l0aGluIGFuIGlmcmFtZSwgYnV0IHdlXG4vLyBjYW4ndCB1c2UgYGJlZm9yZXVubG9hZGAgYXMgSUUgZmlyZXMgaXQgb24gamF2YXNjcmlwdDogbGlua3MuXG51dGlscy5hdHRhY2hFdmVudCgndW5sb2FkJywgdW5sb2FkX3RyaWdnZXJlZCk7XG5cbnV0aWxzLnVubG9hZF9hZGQgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIHZhciByZWYgPSB1dGlscy5yYW5kb21fc3RyaW5nKDgpO1xuICAgIG9uX3VubG9hZFtyZWZdID0gbGlzdGVuZXI7XG4gICAgaWYgKGFmdGVyX3VubG9hZCkge1xuICAgICAgICB1dGlscy5kZWxheSh0cmlnZ2VyX3VubG9hZF9jYWxsYmFja3MpO1xuICAgIH1cbiAgICByZXR1cm4gcmVmO1xufTtcbnV0aWxzLnVubG9hZF9kZWwgPSBmdW5jdGlvbihyZWYpIHtcbiAgICBpZiAocmVmIGluIG9uX3VubG9hZClcbiAgICAgICAgZGVsZXRlIG9uX3VubG9hZFtyZWZdO1xufTtcblxuXG51dGlscy5jcmVhdGVJZnJhbWUgPSBmdW5jdGlvbiAoaWZyYW1lX3VybCwgZXJyb3JfY2FsbGJhY2spIHtcbiAgICB2YXIgaWZyYW1lID0gX2RvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgIHZhciB0cmVmLCB1bmxvYWRfcmVmO1xuICAgIHZhciB1bmF0dGFjaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodHJlZik7XG4gICAgICAgIC8vIEV4cGxvcmVyIGhhZCBwcm9ibGVtcyB3aXRoIHRoYXQuXG4gICAgICAgIHRyeSB7aWZyYW1lLm9ubG9hZCA9IG51bGw7fSBjYXRjaCAoeCkge31cbiAgICAgICAgaWZyYW1lLm9uZXJyb3IgPSBudWxsO1xuICAgIH07XG4gICAgdmFyIGNsZWFudXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGlmcmFtZSkge1xuICAgICAgICAgICAgdW5hdHRhY2goKTtcbiAgICAgICAgICAgIC8vIFRoaXMgdGltZW91dCBtYWtlcyBjaHJvbWUgZmlyZSBvbmJlZm9yZXVubG9hZCBldmVudFxuICAgICAgICAgICAgLy8gd2l0aGluIGlmcmFtZS4gV2l0aG91dCB0aGUgdGltZW91dCBpdCBnb2VzIHN0cmFpZ2h0IHRvXG4gICAgICAgICAgICAvLyBvbnVubG9hZC5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYoaWZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlmcmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmcmFtZSA9IG51bGw7XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgIHV0aWxzLnVubG9hZF9kZWwodW5sb2FkX3JlZik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBvbmVycm9yID0gZnVuY3Rpb24ocikge1xuICAgICAgICBpZiAoaWZyYW1lKSB7XG4gICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICBlcnJvcl9jYWxsYmFjayhyKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHBvc3QgPSBmdW5jdGlvbihtc2csIG9yaWdpbikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB0aGUgaWZyYW1lIGlzIG5vdCBsb2FkZWQsIElFIHJhaXNlcyBhbiBleGNlcHRpb25cbiAgICAgICAgICAgIC8vIG9uICdjb250ZW50V2luZG93Jy5cbiAgICAgICAgICAgIGlmIChpZnJhbWUgJiYgaWZyYW1lLmNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICBpZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZShtc2csIG9yaWdpbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKHgpIHt9O1xuICAgIH07XG5cbiAgICBpZnJhbWUuc3JjID0gaWZyYW1lX3VybDtcbiAgICBpZnJhbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICBpZnJhbWUuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIGlmcmFtZS5vbmVycm9yID0gZnVuY3Rpb24oKXtvbmVycm9yKCdvbmVycm9yJyk7fTtcbiAgICBpZnJhbWUub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGBvbmxvYWRgIGlzIHRyaWdnZXJlZCBiZWZvcmUgc2NyaXB0cyBvbiB0aGUgaWZyYW1lIGFyZVxuICAgICAgICAvLyBleGVjdXRlZC4gR2l2ZSBpdCBmZXcgc2Vjb25kcyB0byBhY3R1YWxseSBsb2FkIHN0dWZmLlxuICAgICAgICBjbGVhclRpbWVvdXQodHJlZik7XG4gICAgICAgIHRyZWYgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7b25lcnJvcignb25sb2FkIHRpbWVvdXQnKTt9LCAyMDAwKTtcbiAgICB9O1xuICAgIF9kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlmcmFtZSk7XG4gICAgdHJlZiA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtvbmVycm9yKCd0aW1lb3V0Jyk7fSwgMTUwMDApO1xuICAgIHVubG9hZF9yZWYgPSB1dGlscy51bmxvYWRfYWRkKGNsZWFudXApO1xuICAgIHJldHVybiB7XG4gICAgICAgIHBvc3Q6IHBvc3QsXG4gICAgICAgIGNsZWFudXA6IGNsZWFudXAsXG4gICAgICAgIGxvYWRlZDogdW5hdHRhY2hcbiAgICB9O1xufTtcblxudXRpbHMuY3JlYXRlSHRtbGZpbGUgPSBmdW5jdGlvbiAoaWZyYW1lX3VybCwgZXJyb3JfY2FsbGJhY2spIHtcbiAgICB2YXIgZG9jID0gbmV3IEFjdGl2ZVhPYmplY3QoJ2h0bWxmaWxlJyk7XG4gICAgdmFyIHRyZWYsIHVubG9hZF9yZWY7XG4gICAgdmFyIGlmcmFtZTtcbiAgICB2YXIgdW5hdHRhY2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRyZWYpO1xuICAgIH07XG4gICAgdmFyIGNsZWFudXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgICAgdW5hdHRhY2goKTtcbiAgICAgICAgICAgIHV0aWxzLnVubG9hZF9kZWwodW5sb2FkX3JlZik7XG4gICAgICAgICAgICBpZnJhbWUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChpZnJhbWUpO1xuICAgICAgICAgICAgaWZyYW1lID0gZG9jID0gbnVsbDtcbiAgICAgICAgICAgIENvbGxlY3RHYXJiYWdlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBvbmVycm9yID0gZnVuY3Rpb24ocikgIHtcbiAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgZXJyb3JfY2FsbGJhY2socik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBwb3N0ID0gZnVuY3Rpb24obXNnLCBvcmlnaW4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gdGhlIGlmcmFtZSBpcyBub3QgbG9hZGVkLCBJRSByYWlzZXMgYW4gZXhjZXB0aW9uXG4gICAgICAgICAgICAvLyBvbiAnY29udGVudFdpbmRvdycuXG4gICAgICAgICAgICBpZiAoaWZyYW1lICYmIGlmcmFtZS5jb250ZW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2UobXNnLCBvcmlnaW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoICh4KSB7fTtcbiAgICB9O1xuXG4gICAgZG9jLm9wZW4oKTtcbiAgICBkb2Mud3JpdGUoJzxodG1sPjxzJyArICdjcmlwdD4nICtcbiAgICAgICAgICAgICAgJ2RvY3VtZW50LmRvbWFpbj1cIicgKyBkb2N1bWVudC5kb21haW4gKyAnXCI7JyArXG4gICAgICAgICAgICAgICc8L3MnICsgJ2NyaXB0PjwvaHRtbD4nKTtcbiAgICBkb2MuY2xvc2UoKTtcbiAgICBkb2MucGFyZW50V2luZG93W1dQcmVmaXhdID0gX3dpbmRvd1tXUHJlZml4XTtcbiAgICB2YXIgYyA9IGRvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkb2MuYm9keS5hcHBlbmRDaGlsZChjKTtcbiAgICBpZnJhbWUgPSBkb2MuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgYy5hcHBlbmRDaGlsZChpZnJhbWUpO1xuICAgIGlmcmFtZS5zcmMgPSBpZnJhbWVfdXJsO1xuICAgIHRyZWYgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7b25lcnJvcigndGltZW91dCcpO30sIDE1MDAwKTtcbiAgICB1bmxvYWRfcmVmID0gdXRpbHMudW5sb2FkX2FkZChjbGVhbnVwKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBwb3N0OiBwb3N0LFxuICAgICAgICBjbGVhbnVwOiBjbGVhbnVwLFxuICAgICAgICBsb2FkZWQ6IHVuYXR0YWNoXG4gICAgfTtcbn07XG4vLyAgICAgICAgIFsqXSBFbmQgb2YgbGliL2RvbS5qc1xuXG5cbi8vICAgICAgICAgWypdIEluY2x1ZGluZyBsaWIvZG9tMi5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxudmFyIEFic3RyYWN0WEhST2JqZWN0ID0gZnVuY3Rpb24oKXt9O1xuQWJzdHJhY3RYSFJPYmplY3QucHJvdG90eXBlID0gbmV3IEV2ZW50RW1pdHRlcihbJ2NodW5rJywgJ2ZpbmlzaCddKTtcblxuQWJzdHJhY3RYSFJPYmplY3QucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uKG1ldGhvZCwgdXJsLCBwYXlsb2FkLCBvcHRzKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgdGhhdC54aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB9IGNhdGNoKHgpIHt9O1xuXG4gICAgaWYgKCF0aGF0Lnhocikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhhdC54aHIgPSBuZXcgX3dpbmRvdy5BY3RpdmVYT2JqZWN0KCdNaWNyb3NvZnQuWE1MSFRUUCcpO1xuICAgICAgICB9IGNhdGNoKHgpIHt9O1xuICAgIH1cbiAgICBpZiAoX3dpbmRvdy5BY3RpdmVYT2JqZWN0IHx8IF93aW5kb3cuWERvbWFpblJlcXVlc3QpIHtcbiAgICAgICAgLy8gSUU4IGNhY2hlcyBldmVuIFBPU1RzXG4gICAgICAgIHVybCArPSAoKHVybC5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJykgKyAndD0nKygrbmV3IERhdGUpO1xuICAgIH1cblxuICAgIC8vIEV4cGxvcmVyIHRlbmRzIHRvIGtlZXAgY29ubmVjdGlvbiBvcGVuLCBldmVuIGFmdGVyIHRoZVxuICAgIC8vIHRhYiBnZXRzIGNsb3NlZDogaHR0cDovL2J1Z3MuanF1ZXJ5LmNvbS90aWNrZXQvNTI4MFxuICAgIHRoYXQudW5sb2FkX3JlZiA9IHV0aWxzLnVubG9hZF9hZGQoZnVuY3Rpb24oKXt0aGF0Ll9jbGVhbnVwKHRydWUpO30pO1xuICAgIHRyeSB7XG4gICAgICAgIHRoYXQueGhyLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAvLyBJRSByYWlzZXMgYW4gZXhjZXB0aW9uIG9uIHdyb25nIHBvcnQuXG4gICAgICAgIHRoYXQuZW1pdCgnZmluaXNoJywgMCwgJycpO1xuICAgICAgICB0aGF0Ll9jbGVhbnVwKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9O1xuXG4gICAgaWYgKCFvcHRzIHx8ICFvcHRzLm5vX2NyZWRlbnRpYWxzKSB7XG4gICAgICAgIC8vIE1vemlsbGEgZG9jcyBzYXlzIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL1hNTEh0dHBSZXF1ZXN0IDpcbiAgICAgICAgLy8gXCJUaGlzIG5ldmVyIGFmZmVjdHMgc2FtZS1zaXRlIHJlcXVlc3RzLlwiXG4gICAgICAgIHRoYXQueGhyLndpdGhDcmVkZW50aWFscyA9ICd0cnVlJztcbiAgICB9XG4gICAgaWYgKG9wdHMgJiYgb3B0cy5oZWFkZXJzKSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIG9wdHMuaGVhZGVycykge1xuICAgICAgICAgICAgdGhhdC54aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIG9wdHMuaGVhZGVyc1trZXldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoYXQueGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC54aHIpIHtcbiAgICAgICAgICAgIHZhciB4ID0gdGhhdC54aHI7XG4gICAgICAgICAgICBzd2l0Y2ggKHgucmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgIC8vIElFIGRvZXNuJ3QgbGlrZSBwZWVraW5nIGludG8gcmVzcG9uc2VUZXh0IG9yIHN0YXR1c1xuICAgICAgICAgICAgICAgIC8vIG9uIE1pY3Jvc29mdC5YTUxIVFRQIGFuZCByZWFkeXN0YXRlPTNcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3RhdHVzID0geC5zdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0geC5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge307XG4gICAgICAgICAgICAgICAgLy8gSUUgcmV0dXJucyAxMjIzIGZvciAyMDQ6IGh0dHA6Ly9idWdzLmpxdWVyeS5jb20vdGlja2V0LzE0NTBcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAxMjIzKSBzdGF0dXMgPSAyMDQ7XG5cbiAgICAgICAgICAgICAgICAvLyBJRSBkb2VzIHJldHVybiByZWFkeXN0YXRlID09IDMgZm9yIDQwNCBhbnN3ZXJzLlxuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICYmIHRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmVtaXQoJ2NodW5rJywgc3RhdHVzLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9IHguc3RhdHVzO1xuICAgICAgICAgICAgICAgIC8vIElFIHJldHVybnMgMTIyMyBmb3IgMjA0OiBodHRwOi8vYnVncy5qcXVlcnkuY29tL3RpY2tldC8xNDUwXG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gMTIyMykgc3RhdHVzID0gMjA0O1xuXG4gICAgICAgICAgICAgICAgdGhhdC5lbWl0KCdmaW5pc2gnLCBzdGF0dXMsIHgucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICB0aGF0Ll9jbGVhbnVwKGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhhdC54aHIuc2VuZChwYXlsb2FkKTtcbn07XG5cbkFic3RyYWN0WEhST2JqZWN0LnByb3RvdHlwZS5fY2xlYW51cCA9IGZ1bmN0aW9uKGFib3J0KSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICghdGhhdC54aHIpIHJldHVybjtcbiAgICB1dGlscy51bmxvYWRfZGVsKHRoYXQudW5sb2FkX3JlZik7XG5cbiAgICAvLyBJRSBuZWVkcyB0aGlzIGZpZWxkIHRvIGJlIGEgZnVuY3Rpb25cbiAgICB0aGF0Lnhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe307XG5cbiAgICBpZiAoYWJvcnQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoYXQueGhyLmFib3J0KCk7XG4gICAgICAgIH0gY2F0Y2goeCkge307XG4gICAgfVxuICAgIHRoYXQudW5sb2FkX3JlZiA9IHRoYXQueGhyID0gbnVsbDtcbn07XG5cbkFic3RyYWN0WEhST2JqZWN0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGF0Lm51a2UoKTtcbiAgICB0aGF0Ll9jbGVhbnVwKHRydWUpO1xufTtcblxudmFyIFhIUkNvcnNPYmplY3QgPSB1dGlscy5YSFJDb3JzT2JqZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuICAgIHV0aWxzLmRlbGF5KGZ1bmN0aW9uKCl7dGhhdC5fc3RhcnQuYXBwbHkodGhhdCwgYXJncyk7fSk7XG59O1xuWEhSQ29yc09iamVjdC5wcm90b3R5cGUgPSBuZXcgQWJzdHJhY3RYSFJPYmplY3QoKTtcblxudmFyIFhIUkxvY2FsT2JqZWN0ID0gdXRpbHMuWEhSTG9jYWxPYmplY3QgPSBmdW5jdGlvbihtZXRob2QsIHVybCwgcGF5bG9hZCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB1dGlscy5kZWxheShmdW5jdGlvbigpe1xuICAgICAgICB0aGF0Ll9zdGFydChtZXRob2QsIHVybCwgcGF5bG9hZCwge1xuICAgICAgICAgICAgbm9fY3JlZGVudGlhbHM6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuWEhSTG9jYWxPYmplY3QucHJvdG90eXBlID0gbmV3IEFic3RyYWN0WEhST2JqZWN0KCk7XG5cblxuXG4vLyBSZWZlcmVuY2VzOlxuLy8gICBodHRwOi8vYWpheGlhbi5jb20vYXJjaGl2ZXMvMTAwLWxpbmUtYWpheC13cmFwcGVyXG4vLyAgIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9jYzI4ODA2MCh2PVZTLjg1KS5hc3B4XG52YXIgWERST2JqZWN0ID0gdXRpbHMuWERST2JqZWN0ID0gZnVuY3Rpb24obWV0aG9kLCB1cmwsIHBheWxvYWQpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdXRpbHMuZGVsYXkoZnVuY3Rpb24oKXt0aGF0Ll9zdGFydChtZXRob2QsIHVybCwgcGF5bG9hZCk7fSk7XG59O1xuWERST2JqZWN0LnByb3RvdHlwZSA9IG5ldyBFdmVudEVtaXR0ZXIoWydjaHVuaycsICdmaW5pc2gnXSk7XG5YRFJPYmplY3QucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uKG1ldGhvZCwgdXJsLCBwYXlsb2FkKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciB4ZHIgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAvLyBJRSBjYWNoZXMgZXZlbiBQT1NUc1xuICAgIHVybCArPSAoKHVybC5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJykgKyAndD0nKygrbmV3IERhdGUpO1xuXG4gICAgdmFyIG9uZXJyb3IgPSB4ZHIub250aW1lb3V0ID0geGRyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5lbWl0KCdmaW5pc2gnLCAwLCAnJyk7XG4gICAgICAgIHRoYXQuX2NsZWFudXAoZmFsc2UpO1xuICAgIH07XG4gICAgeGRyLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5lbWl0KCdjaHVuaycsIDIwMCwgeGRyLnJlc3BvbnNlVGV4dCk7XG4gICAgfTtcbiAgICB4ZHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQuZW1pdCgnZmluaXNoJywgMjAwLCB4ZHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgdGhhdC5fY2xlYW51cChmYWxzZSk7XG4gICAgfTtcbiAgICB0aGF0LnhkciA9IHhkcjtcbiAgICB0aGF0LnVubG9hZF9yZWYgPSB1dGlscy51bmxvYWRfYWRkKGZ1bmN0aW9uKCl7dGhhdC5fY2xlYW51cCh0cnVlKTt9KTtcbiAgICB0cnkge1xuICAgICAgICAvLyBGYWlscyB3aXRoIEFjY2Vzc0RlbmllZCBpZiBwb3J0IG51bWJlciBpcyBib2d1c1xuICAgICAgICB0aGF0Lnhkci5vcGVuKG1ldGhvZCwgdXJsKTtcbiAgICAgICAgdGhhdC54ZHIuc2VuZChwYXlsb2FkKTtcbiAgICB9IGNhdGNoKHgpIHtcbiAgICAgICAgb25lcnJvcigpO1xuICAgIH1cbn07XG5cblhEUk9iamVjdC5wcm90b3R5cGUuX2NsZWFudXAgPSBmdW5jdGlvbihhYm9ydCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBpZiAoIXRoYXQueGRyKSByZXR1cm47XG4gICAgdXRpbHMudW5sb2FkX2RlbCh0aGF0LnVubG9hZF9yZWYpO1xuXG4gICAgdGhhdC54ZHIub250aW1lb3V0ID0gdGhhdC54ZHIub25lcnJvciA9IHRoYXQueGRyLm9ucHJvZ3Jlc3MgPVxuICAgICAgICB0aGF0Lnhkci5vbmxvYWQgPSBudWxsO1xuICAgIGlmIChhYm9ydCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhhdC54ZHIuYWJvcnQoKTtcbiAgICAgICAgfSBjYXRjaCh4KSB7fTtcbiAgICB9XG4gICAgdGhhdC51bmxvYWRfcmVmID0gdGhhdC54ZHIgPSBudWxsO1xufTtcblxuWERST2JqZWN0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGF0Lm51a2UoKTtcbiAgICB0aGF0Ll9jbGVhbnVwKHRydWUpO1xufTtcblxuLy8gMS4gSXMgbmF0aXZlbHkgdmlhIFhIUlxuLy8gMi4gSXMgbmF0aXZlbHkgdmlhIFhEUlxuLy8gMy4gTm9wZSwgYnV0IHBvc3RNZXNzYWdlIGlzIHRoZXJlIHNvIGl0IHNob3VsZCB3b3JrIHZpYSB0aGUgSWZyYW1lLlxuLy8gNC4gTm9wZSwgc29ycnkuXG51dGlscy5pc1hIUkNvcnNDYXBhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKF93aW5kb3cuWE1MSHR0cFJlcXVlc3QgJiYgJ3dpdGhDcmVkZW50aWFscycgaW4gbmV3IFhNTEh0dHBSZXF1ZXN0KCkpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIC8vIFhEb21haW5SZXF1ZXN0IGRvZXNuJ3Qgd29yayBpZiBwYWdlIGlzIHNlcnZlZCBmcm9tIGZpbGU6Ly9cbiAgICBpZiAoX3dpbmRvdy5YRG9tYWluUmVxdWVzdCAmJiBfZG9jdW1lbnQuZG9tYWluKSB7XG4gICAgICAgIHJldHVybiAyO1xuICAgIH1cbiAgICBpZiAoSWZyYW1lVHJhbnNwb3J0LmVuYWJsZWQoKSkge1xuICAgICAgICByZXR1cm4gMztcbiAgICB9XG4gICAgcmV0dXJuIDQ7XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi9kb20yLmpzXG5cblxuLy8gICAgICAgICBbKl0gSW5jbHVkaW5nIGxpYi9zb2NranMuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbnZhciBTb2NrSlMgPSBmdW5jdGlvbih1cmwsIGRlcF9wcm90b2NvbHNfd2hpdGVsaXN0LCBvcHRpb25zKSB7XG4gICAgaWYgKHRoaXMgPT09IF93aW5kb3cpIHtcbiAgICAgICAgLy8gbWFrZXMgYG5ld2Agb3B0aW9uYWxcbiAgICAgICAgcmV0dXJuIG5ldyBTb2NrSlModXJsLCBkZXBfcHJvdG9jb2xzX3doaXRlbGlzdCwgb3B0aW9ucyk7XG4gICAgfVxuICAgIFxuICAgIHZhciB0aGF0ID0gdGhpcywgcHJvdG9jb2xzX3doaXRlbGlzdDtcbiAgICB0aGF0Ll9vcHRpb25zID0ge2RldmVsOiBmYWxzZSwgZGVidWc6IGZhbHNlLCBwcm90b2NvbHNfd2hpdGVsaXN0OiBbXSxcbiAgICAgICAgICAgICAgICAgICAgIGluZm86IHVuZGVmaW5lZCwgcnR0OiB1bmRlZmluZWR9O1xuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICAgIHV0aWxzLm9iamVjdEV4dGVuZCh0aGF0Ll9vcHRpb25zLCBvcHRpb25zKTtcbiAgICB9XG4gICAgdGhhdC5fYmFzZV91cmwgPSB1dGlscy5hbWVuZFVybCh1cmwpO1xuICAgIHRoYXQuX3NlcnZlciA9IHRoYXQuX29wdGlvbnMuc2VydmVyIHx8IHV0aWxzLnJhbmRvbV9udW1iZXJfc3RyaW5nKDEwMDApO1xuICAgIGlmICh0aGF0Ll9vcHRpb25zLnByb3RvY29sc193aGl0ZWxpc3QgJiZcbiAgICAgICAgdGhhdC5fb3B0aW9ucy5wcm90b2NvbHNfd2hpdGVsaXN0Lmxlbmd0aCkge1xuICAgICAgICBwcm90b2NvbHNfd2hpdGVsaXN0ID0gdGhhdC5fb3B0aW9ucy5wcm90b2NvbHNfd2hpdGVsaXN0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERlcHJlY2F0ZWQgQVBJXG4gICAgICAgIGlmICh0eXBlb2YgZGVwX3Byb3RvY29sc193aGl0ZWxpc3QgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICBkZXBfcHJvdG9jb2xzX3doaXRlbGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBwcm90b2NvbHNfd2hpdGVsaXN0ID0gW2RlcF9wcm90b2NvbHNfd2hpdGVsaXN0XTtcbiAgICAgICAgfSBlbHNlIGlmICh1dGlscy5pc0FycmF5KGRlcF9wcm90b2NvbHNfd2hpdGVsaXN0KSkge1xuICAgICAgICAgICAgcHJvdG9jb2xzX3doaXRlbGlzdCA9IGRlcF9wcm90b2NvbHNfd2hpdGVsaXN0XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm90b2NvbHNfd2hpdGVsaXN0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvdG9jb2xzX3doaXRlbGlzdCkge1xuICAgICAgICAgICAgdGhhdC5fZGVidWcoJ0RlcHJlY2F0ZWQgQVBJOiBVc2UgXCJwcm90b2NvbHNfd2hpdGVsaXN0XCIgb3B0aW9uICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2luc3RlYWQgb2Ygc3VwcGx5aW5nIHByb3RvY29sIGxpc3QgYXMgYSBzZWNvbmQgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAncGFyYW1ldGVyIHRvIFNvY2tKUyBjb25zdHJ1Y3Rvci4nKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGF0Ll9wcm90b2NvbHMgPSBbXTtcbiAgICB0aGF0LnByb3RvY29sID0gbnVsbDtcbiAgICB0aGF0LnJlYWR5U3RhdGUgPSBTb2NrSlMuQ09OTkVDVElORztcbiAgICB0aGF0Ll9pciA9IGNyZWF0ZUluZm9SZWNlaXZlcih0aGF0Ll9iYXNlX3VybCk7XG4gICAgdGhhdC5faXIub25maW5pc2ggPSBmdW5jdGlvbihpbmZvLCBydHQpIHtcbiAgICAgICAgdGhhdC5faXIgPSBudWxsO1xuICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgaWYgKHRoYXQuX29wdGlvbnMuaW5mbykge1xuICAgICAgICAgICAgICAgIC8vIE92ZXJyaWRlIGlmIHVzZXIgc3VwcGxpZXMgdGhlIG9wdGlvblxuICAgICAgICAgICAgICAgIGluZm8gPSB1dGlscy5vYmplY3RFeHRlbmQoaW5mbywgdGhhdC5fb3B0aW9ucy5pbmZvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGF0Ll9vcHRpb25zLnJ0dCkge1xuICAgICAgICAgICAgICAgIHJ0dCA9IHRoYXQuX29wdGlvbnMucnR0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhhdC5fYXBwbHlJbmZvKGluZm8sIHJ0dCwgcHJvdG9jb2xzX3doaXRlbGlzdCk7XG4gICAgICAgICAgICB0aGF0Ll9kaWRDbG9zZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fZGlkQ2xvc2UoMTAwMiwgJ0NhblxcJ3QgY29ubmVjdCB0byBzZXJ2ZXInLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLy8gSW5oZXJpdGFuY2VcblNvY2tKUy5wcm90b3R5cGUgPSBuZXcgUkV2ZW50VGFyZ2V0KCk7XG5cblNvY2tKUy52ZXJzaW9uID0gXCIwLjMuNFwiO1xuXG5Tb2NrSlMuQ09OTkVDVElORyA9IDA7XG5Tb2NrSlMuT1BFTiA9IDE7XG5Tb2NrSlMuQ0xPU0lORyA9IDI7XG5Tb2NrSlMuQ0xPU0VEID0gMztcblxuU29ja0pTLnByb3RvdHlwZS5fZGVidWcgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fb3B0aW9ucy5kZWJ1ZylcbiAgICAgICAgdXRpbHMubG9nLmFwcGx5KHV0aWxzLCBhcmd1bWVudHMpO1xufTtcblxuU29ja0pTLnByb3RvdHlwZS5fZGlzcGF0Y2hPcGVuID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh0aGF0LnJlYWR5U3RhdGUgPT09IFNvY2tKUy5DT05ORUNUSU5HKSB7XG4gICAgICAgIGlmICh0aGF0Ll90cmFuc3BvcnRfdHJlZikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoYXQuX3RyYW5zcG9ydF90cmVmKTtcbiAgICAgICAgICAgIHRoYXQuX3RyYW5zcG9ydF90cmVmID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGF0LnJlYWR5U3RhdGUgPSBTb2NrSlMuT1BFTjtcbiAgICAgICAgdGhhdC5kaXNwYXRjaEV2ZW50KG5ldyBTaW1wbGVFdmVudChcIm9wZW5cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBzZXJ2ZXIgbWlnaHQgaGF2ZSBiZWVuIHJlc3RhcnRlZCwgYW5kIGxvc3QgdHJhY2sgb2Ygb3VyXG4gICAgICAgIC8vIGNvbm5lY3Rpb24uXG4gICAgICAgIHRoYXQuX2RpZENsb3NlKDEwMDYsIFwiU2VydmVyIGxvc3Qgc2Vzc2lvblwiKTtcbiAgICB9XG59O1xuXG5Tb2NrSlMucHJvdG90eXBlLl9kaXNwYXRjaE1lc3NhZ2UgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh0aGF0LnJlYWR5U3RhdGUgIT09IFNvY2tKUy5PUEVOKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgIHRoYXQuZGlzcGF0Y2hFdmVudChuZXcgU2ltcGxlRXZlbnQoXCJtZXNzYWdlXCIsIHtkYXRhOiBkYXRhfSkpO1xufTtcblxuU29ja0pTLnByb3RvdHlwZS5fZGlzcGF0Y2hIZWFydGJlYXQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh0aGF0LnJlYWR5U3RhdGUgIT09IFNvY2tKUy5PUEVOKVxuICAgICAgICByZXR1cm47XG4gICAgdGhhdC5kaXNwYXRjaEV2ZW50KG5ldyBTaW1wbGVFdmVudCgnaGVhcnRiZWF0Jywge30pKTtcbn07XG5cblNvY2tKUy5wcm90b3R5cGUuX2RpZENsb3NlID0gZnVuY3Rpb24oY29kZSwgcmVhc29uLCBmb3JjZSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBpZiAodGhhdC5yZWFkeVN0YXRlICE9PSBTb2NrSlMuQ09OTkVDVElORyAmJlxuICAgICAgICB0aGF0LnJlYWR5U3RhdGUgIT09IFNvY2tKUy5PUEVOICYmXG4gICAgICAgIHRoYXQucmVhZHlTdGF0ZSAhPT0gU29ja0pTLkNMT1NJTkcpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfU1RBVEVfRVJSJyk7XG4gICAgaWYgKHRoYXQuX2lyKSB7XG4gICAgICAgIHRoYXQuX2lyLm51a2UoKTtcbiAgICAgICAgdGhhdC5faXIgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICh0aGF0Ll90cmFuc3BvcnQpIHtcbiAgICAgICAgdGhhdC5fdHJhbnNwb3J0LmRvQ2xlYW51cCgpO1xuICAgICAgICB0aGF0Ll90cmFuc3BvcnQgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBjbG9zZV9ldmVudCA9IG5ldyBTaW1wbGVFdmVudChcImNsb3NlXCIsIHtcbiAgICAgICAgY29kZTogY29kZSxcbiAgICAgICAgcmVhc29uOiByZWFzb24sXG4gICAgICAgIHdhc0NsZWFuOiB1dGlscy51c2VyU2V0Q29kZShjb2RlKX0pO1xuXG4gICAgaWYgKCF1dGlscy51c2VyU2V0Q29kZShjb2RlKSAmJlxuICAgICAgICB0aGF0LnJlYWR5U3RhdGUgPT09IFNvY2tKUy5DT05ORUNUSU5HICYmICFmb3JjZSkge1xuICAgICAgICBpZiAodGhhdC5fdHJ5X25leHRfcHJvdG9jb2woY2xvc2VfZXZlbnQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY2xvc2VfZXZlbnQgPSBuZXcgU2ltcGxlRXZlbnQoXCJjbG9zZVwiLCB7Y29kZTogMjAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbjogXCJBbGwgdHJhbnNwb3J0cyBmYWlsZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhc0NsZWFuOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfZXZlbnQ6IGNsb3NlX2V2ZW50fSk7XG4gICAgfVxuICAgIHRoYXQucmVhZHlTdGF0ZSA9IFNvY2tKUy5DTE9TRUQ7XG5cbiAgICB1dGlscy5kZWxheShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICB0aGF0LmRpc3BhdGNoRXZlbnQoY2xvc2VfZXZlbnQpO1xuICAgICAgICAgICAgICAgIH0pO1xufTtcblxuU29ja0pTLnByb3RvdHlwZS5fZGlkTWVzc2FnZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHR5cGUgPSBkYXRhLnNsaWNlKDAsIDEpO1xuICAgIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSAnbyc6XG4gICAgICAgIHRoYXQuX2Rpc3BhdGNoT3BlbigpO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlICdhJzpcbiAgICAgICAgdmFyIHBheWxvYWQgPSBKU09OLnBhcnNlKGRhdGEuc2xpY2UoMSkgfHwgJ1tdJyk7XG4gICAgICAgIGZvcih2YXIgaT0wOyBpIDwgcGF5bG9hZC5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICB0aGF0Ll9kaXNwYXRjaE1lc3NhZ2UocGF5bG9hZFtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbSc6XG4gICAgICAgIHZhciBwYXlsb2FkID0gSlNPTi5wYXJzZShkYXRhLnNsaWNlKDEpIHx8ICdudWxsJyk7XG4gICAgICAgIHRoYXQuX2Rpc3BhdGNoTWVzc2FnZShwYXlsb2FkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYyc6XG4gICAgICAgIHZhciBwYXlsb2FkID0gSlNPTi5wYXJzZShkYXRhLnNsaWNlKDEpIHx8ICdbXScpO1xuICAgICAgICB0aGF0Ll9kaWRDbG9zZShwYXlsb2FkWzBdLCBwYXlsb2FkWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSAnaCc6XG4gICAgICAgIHRoYXQuX2Rpc3BhdGNoSGVhcnRiZWF0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5cblNvY2tKUy5wcm90b3R5cGUuX3RyeV9uZXh0X3Byb3RvY29sID0gZnVuY3Rpb24oY2xvc2VfZXZlbnQpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKHRoYXQucHJvdG9jb2wpIHtcbiAgICAgICAgdGhhdC5fZGVidWcoJ0Nsb3NlZCB0cmFuc3BvcnQ6JywgdGhhdC5wcm90b2NvbCwgJycrY2xvc2VfZXZlbnQpO1xuICAgICAgICB0aGF0LnByb3RvY29sID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoYXQuX3RyYW5zcG9ydF90cmVmKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGF0Ll90cmFuc3BvcnRfdHJlZik7XG4gICAgICAgIHRoYXQuX3RyYW5zcG9ydF90cmVmID0gbnVsbDtcbiAgICB9XG5cbiAgICB3aGlsZSgxKSB7XG4gICAgICAgIHZhciBwcm90b2NvbCA9IHRoYXQucHJvdG9jb2wgPSB0aGF0Ll9wcm90b2NvbHMuc2hpZnQoKTtcbiAgICAgICAgaWYgKCFwcm90b2NvbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNvbWUgcHJvdG9jb2xzIHJlcXVpcmUgYWNjZXNzIHRvIGBib2R5YCwgd2hhdCBpZiB3ZXJlIGluXG4gICAgICAgIC8vIHRoZSBgaGVhZGA/XG4gICAgICAgIGlmIChTb2NrSlNbcHJvdG9jb2xdICYmXG4gICAgICAgICAgICBTb2NrSlNbcHJvdG9jb2xdLm5lZWRfYm9keSA9PT0gdHJ1ZSAmJlxuICAgICAgICAgICAgKCFfZG9jdW1lbnQuYm9keSB8fFxuICAgICAgICAgICAgICh0eXBlb2YgX2RvY3VtZW50LnJlYWR5U3RhdGUgIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICAgICYmIF9kb2N1bWVudC5yZWFkeVN0YXRlICE9PSAnY29tcGxldGUnKSkpIHtcbiAgICAgICAgICAgIHRoYXQuX3Byb3RvY29scy51bnNoaWZ0KHByb3RvY29sKTtcbiAgICAgICAgICAgIHRoYXQucHJvdG9jb2wgPSAnd2FpdGluZy1mb3ItbG9hZCc7XG4gICAgICAgICAgICB1dGlscy5hdHRhY2hFdmVudCgnbG9hZCcsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhhdC5fdHJ5X25leHRfcHJvdG9jb2woKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIVNvY2tKU1twcm90b2NvbF0gfHxcbiAgICAgICAgICAgICAgIVNvY2tKU1twcm90b2NvbF0uZW5hYmxlZCh0aGF0Ll9vcHRpb25zKSkge1xuICAgICAgICAgICAgdGhhdC5fZGVidWcoJ1NraXBwaW5nIHRyYW5zcG9ydDonLCBwcm90b2NvbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcm91bmRUcmlwcyA9IFNvY2tKU1twcm90b2NvbF0ucm91bmRUcmlwcyB8fCAxO1xuICAgICAgICAgICAgdmFyIHRvID0gKCh0aGF0Ll9vcHRpb25zLnJ0byB8fCAwKSAqIHJvdW5kVHJpcHMpIHx8IDUwMDA7XG4gICAgICAgICAgICB0aGF0Ll90cmFuc3BvcnRfdHJlZiA9IHV0aWxzLmRlbGF5KHRvLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5yZWFkeVN0YXRlID09PSBTb2NrSlMuQ09OTkVDVElORykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJIGNhbid0IHVuZGVyc3RhbmQgaG93IGl0IGlzIHBvc3NpYmxlIHRvIHJ1blxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHRpbWVyLCB3aGVuIHRoZSBzdGF0ZSBpcyBDTE9TRUQsIGJ1dFxuICAgICAgICAgICAgICAgICAgICAvLyBhcHBhcmVudGx5IGluIElFIGV2ZXJ5dGhpbiBpcyBwb3NzaWJsZS5cbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fZGlkQ2xvc2UoMjAwNywgXCJUcmFuc3BvcnQgdGltZW91dGVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgY29ubmlkID0gdXRpbHMucmFuZG9tX3N0cmluZyg4KTtcbiAgICAgICAgICAgIHZhciB0cmFuc191cmwgPSB0aGF0Ll9iYXNlX3VybCArICcvJyArIHRoYXQuX3NlcnZlciArICcvJyArIGNvbm5pZDtcbiAgICAgICAgICAgIHRoYXQuX2RlYnVnKCdPcGVuaW5nIHRyYW5zcG9ydDonLCBwcm90b2NvbCwgJyB1cmw6Jyt0cmFuc191cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAnIFJUTzonK3RoYXQuX29wdGlvbnMucnRvKTtcbiAgICAgICAgICAgIHRoYXQuX3RyYW5zcG9ydCA9IG5ldyBTb2NrSlNbcHJvdG9jb2xdKHRoYXQsIHRyYW5zX3VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX2Jhc2VfdXJsKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU29ja0pTLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKGNvZGUsIHJlYXNvbikge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBpZiAoY29kZSAmJiAhdXRpbHMudXNlclNldENvZGUoY29kZSkpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIklOVkFMSURfQUNDRVNTX0VSUlwiKTtcbiAgICBpZih0aGF0LnJlYWR5U3RhdGUgIT09IFNvY2tKUy5DT05ORUNUSU5HICYmXG4gICAgICAgdGhhdC5yZWFkeVN0YXRlICE9PSBTb2NrSlMuT1BFTikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoYXQucmVhZHlTdGF0ZSA9IFNvY2tKUy5DTE9TSU5HO1xuICAgIHRoYXQuX2RpZENsb3NlKGNvZGUgfHwgMTAwMCwgcmVhc29uIHx8IFwiTm9ybWFsIGNsb3N1cmVcIik7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5Tb2NrSlMucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh0aGF0LnJlYWR5U3RhdGUgPT09IFNvY2tKUy5DT05ORUNUSU5HKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lOVkFMSURfU1RBVEVfRVJSJyk7XG4gICAgaWYgKHRoYXQucmVhZHlTdGF0ZSA9PT0gU29ja0pTLk9QRU4pIHtcbiAgICAgICAgdGhhdC5fdHJhbnNwb3J0LmRvU2VuZCh1dGlscy5xdW90ZSgnJyArIGRhdGEpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5Tb2NrSlMucHJvdG90eXBlLl9hcHBseUluZm8gPSBmdW5jdGlvbihpbmZvLCBydHQsIHByb3RvY29sc193aGl0ZWxpc3QpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC5fb3B0aW9ucy5pbmZvID0gaW5mbztcbiAgICB0aGF0Ll9vcHRpb25zLnJ0dCA9IHJ0dDtcbiAgICB0aGF0Ll9vcHRpb25zLnJ0byA9IHV0aWxzLmNvdW50UlRPKHJ0dCk7XG4gICAgdGhhdC5fb3B0aW9ucy5pbmZvLm51bGxfb3JpZ2luID0gIV9kb2N1bWVudC5kb21haW47XG4gICAgdmFyIHByb2JlZCA9IHV0aWxzLnByb2JlUHJvdG9jb2xzKCk7XG4gICAgdGhhdC5fcHJvdG9jb2xzID0gdXRpbHMuZGV0ZWN0UHJvdG9jb2xzKHByb2JlZCwgcHJvdG9jb2xzX3doaXRlbGlzdCwgaW5mbyk7XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi9zb2NranMuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3RyYW5zLXdlYnNvY2tldC5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxudmFyIFdlYlNvY2tldFRyYW5zcG9ydCA9IFNvY2tKUy53ZWJzb2NrZXQgPSBmdW5jdGlvbihyaSwgdHJhbnNfdXJsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciB1cmwgPSB0cmFuc191cmwgKyAnL3dlYnNvY2tldCc7XG4gICAgaWYgKHVybC5zbGljZSgwLCA1KSA9PT0gJ2h0dHBzJykge1xuICAgICAgICB1cmwgPSAnd3NzJyArIHVybC5zbGljZSg1KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB1cmwgPSAnd3MnICsgdXJsLnNsaWNlKDQpO1xuICAgIH1cbiAgICB0aGF0LnJpID0gcmk7XG4gICAgdGhhdC51cmwgPSB1cmw7XG4gICAgdmFyIENvbnN0cnVjdG9yID0gX3dpbmRvdy5XZWJTb2NrZXQgfHwgX3dpbmRvdy5Nb3pXZWJTb2NrZXQ7XG5cbiAgICB0aGF0LndzID0gbmV3IENvbnN0cnVjdG9yKHRoYXQudXJsKTtcbiAgICB0aGF0LndzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC5yaS5fZGlkTWVzc2FnZShlLmRhdGEpO1xuICAgIH07XG4gICAgLy8gRmlyZWZveCBoYXMgYW4gaW50ZXJlc3RpbmcgYnVnLiBJZiBhIHdlYnNvY2tldCBjb25uZWN0aW9uIGlzXG4gICAgLy8gY3JlYXRlZCBhZnRlciBvbnVubG9hZCwgaXQgc3RheXMgYWxpdmUgZXZlbiB3aGVuIHVzZXJcbiAgICAvLyBuYXZpZ2F0ZXMgYXdheSBmcm9tIHRoZSBwYWdlLiBJbiBzdWNoIHNpdHVhdGlvbiBsZXQncyBsaWUgLVxuICAgIC8vIGxldCdzIG5vdCBvcGVuIHRoZSB3cyBjb25uZWN0aW9uIGF0IGFsbC4gU2VlOlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2NranMvc29ja2pzLWNsaWVudC9pc3N1ZXMvMjhcbiAgICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTYwODVcbiAgICB0aGF0LnVubG9hZF9yZWYgPSB1dGlscy51bmxvYWRfYWRkKGZ1bmN0aW9uKCl7dGhhdC53cy5jbG9zZSgpfSk7XG4gICAgdGhhdC53cy5vbmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQucmkuX2RpZE1lc3NhZ2UodXRpbHMuY2xvc2VGcmFtZSgxMDA2LCBcIldlYlNvY2tldCBjb25uZWN0aW9uIGJyb2tlblwiKSk7XG4gICAgfTtcbn07XG5cbldlYlNvY2tldFRyYW5zcG9ydC5wcm90b3R5cGUuZG9TZW5kID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMud3Muc2VuZCgnWycgKyBkYXRhICsgJ10nKTtcbn07XG5cbldlYlNvY2tldFRyYW5zcG9ydC5wcm90b3R5cGUuZG9DbGVhbnVwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciB3cyA9IHRoYXQud3M7XG4gICAgaWYgKHdzKSB7XG4gICAgICAgIHdzLm9ubWVzc2FnZSA9IHdzLm9uY2xvc2UgPSBudWxsO1xuICAgICAgICB3cy5jbG9zZSgpO1xuICAgICAgICB1dGlscy51bmxvYWRfZGVsKHRoYXQudW5sb2FkX3JlZik7XG4gICAgICAgIHRoYXQudW5sb2FkX3JlZiA9IHRoYXQucmkgPSB0aGF0LndzID0gbnVsbDtcbiAgICB9XG59O1xuXG5XZWJTb2NrZXRUcmFuc3BvcnQuZW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAhIShfd2luZG93LldlYlNvY2tldCB8fCBfd2luZG93Lk1veldlYlNvY2tldCk7XG59O1xuXG4vLyBJbiB0aGVvcnksIHdzIHNob3VsZCByZXF1aXJlIDEgcm91bmQgdHJpcC4gQnV0IGluIGNocm9tZSwgdGhpcyBpc1xuLy8gbm90IHZlcnkgc3RhYmxlIG92ZXIgU1NMLiBNb3N0IGxpa2VseSBhIHdzIGNvbm5lY3Rpb24gcmVxdWlyZXMgYVxuLy8gc2VwYXJhdGUgU1NMIGNvbm5lY3Rpb24sIGluIHdoaWNoIGNhc2UgMiByb3VuZCB0cmlwcyBhcmUgYW5cbi8vIGFic29sdXRlIG1pbnVtdW0uXG5XZWJTb2NrZXRUcmFuc3BvcnQucm91bmRUcmlwcyA9IDI7XG4vLyAgICAgICAgIFsqXSBFbmQgb2YgbGliL3RyYW5zLXdlYnNvY2tldC5qc1xuXG5cbi8vICAgICAgICAgWypdIEluY2x1ZGluZyBsaWIvdHJhbnMtc2VuZGVyLmpzXG4vKlxuICogKioqKiogQkVHSU4gTElDRU5TRSBCTE9DSyAqKioqKlxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTIgVk13YXJlLCBJbmMuXG4gKlxuICogRm9yIHRoZSBsaWNlbnNlIHNlZSBDT1BZSU5HLlxuICogKioqKiogRU5EIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqL1xuXG52YXIgQnVmZmVyZWRTZW5kZXIgPSBmdW5jdGlvbigpIHt9O1xuQnVmZmVyZWRTZW5kZXIucHJvdG90eXBlLnNlbmRfY29uc3RydWN0b3IgPSBmdW5jdGlvbihzZW5kZXIpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC5zZW5kX2J1ZmZlciA9IFtdO1xuICAgIHRoYXQuc2VuZGVyID0gc2VuZGVyO1xufTtcbkJ1ZmZlcmVkU2VuZGVyLnByb3RvdHlwZS5kb1NlbmQgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoYXQuc2VuZF9idWZmZXIucHVzaChtZXNzYWdlKTtcbiAgICBpZiAoIXRoYXQuc2VuZF9zdG9wKSB7XG4gICAgICAgIHRoYXQuc2VuZF9zY2hlZHVsZSgpO1xuICAgIH1cbn07XG5cbi8vIEZvciBwb2xsaW5nIHRyYW5zcG9ydHMgaW4gYSBzaXR1YXRpb24gd2hlbiBpbiB0aGUgbWVzc2FnZSBjYWxsYmFjayxcbi8vIG5ldyBtZXNzYWdlIGlzIGJlaW5nIHNlbmQuIElmIHRoZSBzZW5kaW5nIGNvbm5lY3Rpb24gd2FzIHN0YXJ0ZWRcbi8vIGJlZm9yZSByZWNlaXZpbmcgb25lLCBpdCBpcyBwb3NzaWJsZSB0byBzYXR1cmF0ZSB0aGUgbmV0d29yayBhbmRcbi8vIHRpbWVvdXQgZHVlIHRvIHRoZSBsYWNrIG9mIHJlY2VpdmluZyBzb2NrZXQuIFRvIGF2b2lkIHRoYXQgd2UgZGVsYXlcbi8vIHNlbmRpbmcgbWVzc2FnZXMgYnkgc29tZSBzbWFsbCB0aW1lLCBpbiBvcmRlciB0byBsZXQgcmVjZWl2aW5nXG4vLyBjb25uZWN0aW9uIGJlIHN0YXJ0ZWQgYmVmb3JlaGFuZC4gVGhpcyBpcyBvbmx5IGEgaGFsZm1lYXN1cmUgYW5kXG4vLyBkb2VzIG5vdCBmaXggdGhlIGJpZyBwcm9ibGVtLCBidXQgaXQgZG9lcyBtYWtlIHRoZSB0ZXN0cyBnbyBtb3JlXG4vLyBzdGFibGUgb24gc2xvdyBuZXR3b3Jrcy5cbkJ1ZmZlcmVkU2VuZGVyLnByb3RvdHlwZS5zZW5kX3NjaGVkdWxlX3dhaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHRyZWY7XG4gICAgdGhhdC5zZW5kX3N0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5zZW5kX3N0b3AgPSBudWxsO1xuICAgICAgICBjbGVhclRpbWVvdXQodHJlZik7XG4gICAgfTtcbiAgICB0cmVmID0gdXRpbHMuZGVsYXkoMjUsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnNlbmRfc3RvcCA9IG51bGw7XG4gICAgICAgIHRoYXQuc2VuZF9zY2hlZHVsZSgpO1xuICAgIH0pO1xufTtcblxuQnVmZmVyZWRTZW5kZXIucHJvdG90eXBlLnNlbmRfc2NoZWR1bGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKHRoYXQuc2VuZF9idWZmZXIubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgcGF5bG9hZCA9ICdbJyArIHRoYXQuc2VuZF9idWZmZXIuam9pbignLCcpICsgJ10nO1xuICAgICAgICB0aGF0LnNlbmRfc3RvcCA9IHRoYXQuc2VuZGVyKHRoYXQudHJhbnNfdXJsLCBwYXlsb2FkLCBmdW5jdGlvbihzdWNjZXNzLCBhYm9ydF9yZWFzb24pIHtcbiAgICAgICAgICAgIHRoYXQuc2VuZF9zdG9wID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChzdWNjZXNzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRoYXQucmkuX2RpZENsb3NlKDEwMDYsICdTZW5kaW5nIGVycm9yICcgKyBhYm9ydF9yZWFzb24pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGF0LnNlbmRfc2NoZWR1bGVfd2FpdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhhdC5zZW5kX2J1ZmZlciA9IFtdO1xuICAgIH1cbn07XG5cbkJ1ZmZlcmVkU2VuZGVyLnByb3RvdHlwZS5zZW5kX2Rlc3RydWN0b3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKHRoYXQuX3NlbmRfc3RvcCkge1xuICAgICAgICB0aGF0Ll9zZW5kX3N0b3AoKTtcbiAgICB9XG4gICAgdGhhdC5fc2VuZF9zdG9wID0gbnVsbDtcbn07XG5cbnZhciBqc29uUEdlbmVyaWNTZW5kZXIgPSBmdW5jdGlvbih1cmwsIHBheWxvYWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgaWYgKCEoJ19zZW5kX2Zvcm0nIGluIHRoYXQpKSB7XG4gICAgICAgIHZhciBmb3JtID0gdGhhdC5fc2VuZF9mb3JtID0gX2RvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvcm0nKTtcbiAgICAgICAgdmFyIGFyZWEgPSB0aGF0Ll9zZW5kX2FyZWEgPSBfZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcbiAgICAgICAgYXJlYS5uYW1lID0gJ2QnO1xuICAgICAgICBmb3JtLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIGZvcm0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICBmb3JtLm1ldGhvZCA9ICdQT1NUJztcbiAgICAgICAgZm9ybS5lbmN0eXBlID0gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc7XG4gICAgICAgIGZvcm0uYWNjZXB0Q2hhcnNldCA9IFwiVVRGLThcIjtcbiAgICAgICAgZm9ybS5hcHBlbmRDaGlsZChhcmVhKTtcbiAgICAgICAgX2RvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZm9ybSk7XG4gICAgfVxuICAgIHZhciBmb3JtID0gdGhhdC5fc2VuZF9mb3JtO1xuICAgIHZhciBhcmVhID0gdGhhdC5fc2VuZF9hcmVhO1xuICAgIHZhciBpZCA9ICdhJyArIHV0aWxzLnJhbmRvbV9zdHJpbmcoOCk7XG4gICAgZm9ybS50YXJnZXQgPSBpZDtcbiAgICBmb3JtLmFjdGlvbiA9IHVybCArICcvanNvbnBfc2VuZD9pPScgKyBpZDtcblxuICAgIHZhciBpZnJhbWU7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gaWU2IGR5bmFtaWMgaWZyYW1lcyB3aXRoIHRhcmdldD1cIlwiIHN1cHBvcnQgKHRoYW5rcyBDaHJpcyBMYW1iYWNoZXIpXG4gICAgICAgIGlmcmFtZSA9IF9kb2N1bWVudC5jcmVhdGVFbGVtZW50KCc8aWZyYW1lIG5hbWU9XCInKyBpZCArJ1wiPicpO1xuICAgIH0gY2F0Y2goeCkge1xuICAgICAgICBpZnJhbWUgPSBfZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgIGlmcmFtZS5uYW1lID0gaWQ7XG4gICAgfVxuICAgIGlmcmFtZS5pZCA9IGlkO1xuICAgIGZvcm0uYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbiAgICBpZnJhbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblxuICAgIHRyeSB7XG4gICAgICAgIGFyZWEudmFsdWUgPSBwYXlsb2FkO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgICB1dGlscy5sb2coJ1lvdXIgYnJvd3NlciBpcyBzZXJpb3VzbHkgYnJva2VuLiBHbyBob21lISAnICsgZS5tZXNzYWdlKTtcbiAgICB9XG4gICAgZm9ybS5zdWJtaXQoKTtcblxuICAgIHZhciBjb21wbGV0ZWQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmICghaWZyYW1lLm9uZXJyb3IpIHJldHVybjtcbiAgICAgICAgaWZyYW1lLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGlmcmFtZS5vbmVycm9yID0gaWZyYW1lLm9ubG9hZCA9IG51bGw7XG4gICAgICAgIC8vIE9wZXJhIG1pbmkgZG9lc24ndCBsaWtlIGlmIHdlIEdDIGlmcmFtZVxuICAgICAgICAvLyBpbW1lZGlhdGVseSwgdGh1cyB0aGlzIHRpbWVvdXQuXG4gICAgICAgIHV0aWxzLmRlbGF5KDUwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlmcmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmcmFtZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIGFyZWEudmFsdWUgPSAnJztcbiAgICAgICAgLy8gSXQgaXMgbm90IHBvc3NpYmxlIHRvIGRldGVjdCBpZiB0aGUgaWZyYW1lIHN1Y2NlZWRlZCBvclxuICAgICAgICAvLyBmYWlsZWQgdG8gc3VibWl0IG91ciBmb3JtLlxuICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICB9O1xuICAgIGlmcmFtZS5vbmVycm9yID0gaWZyYW1lLm9ubG9hZCA9IGNvbXBsZXRlZDtcbiAgICBpZnJhbWUub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoaWZyYW1lLnJlYWR5U3RhdGUgPT0gJ2NvbXBsZXRlJykgY29tcGxldGVkKCk7XG4gICAgfTtcbiAgICByZXR1cm4gY29tcGxldGVkO1xufTtcblxudmFyIGNyZWF0ZUFqYXhTZW5kZXIgPSBmdW5jdGlvbihBamF4T2JqZWN0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHVybCwgcGF5bG9hZCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHhvID0gbmV3IEFqYXhPYmplY3QoJ1BPU1QnLCB1cmwgKyAnL3hocl9zZW5kJywgcGF5bG9hZCk7XG4gICAgICAgIHhvLm9uZmluaXNoID0gZnVuY3Rpb24oc3RhdHVzLCB0ZXh0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzdGF0dXMgPT09IDIwMCB8fCBzdGF0dXMgPT09IDIwNCxcbiAgICAgICAgICAgICAgICAgICAgICdodHRwIHN0YXR1cyAnICsgc3RhdHVzKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFib3J0X3JlYXNvbikge1xuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIGFib3J0X3JlYXNvbik7XG4gICAgICAgIH07XG4gICAgfTtcbn07XG4vLyAgICAgICAgIFsqXSBFbmQgb2YgbGliL3RyYW5zLXNlbmRlci5qc1xuXG5cbi8vICAgICAgICAgWypdIEluY2x1ZGluZyBsaWIvdHJhbnMtanNvbnAtcmVjZWl2ZXIuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbi8vIFBhcnRzIGRlcml2ZWQgZnJvbSBTb2NrZXQuaW86XG4vLyAgICBodHRwczovL2dpdGh1Yi5jb20vTGVhcm5Cb29zdC9zb2NrZXQuaW8vYmxvYi8wLjYuMTcvbGliL3NvY2tldC5pby90cmFuc3BvcnRzL2pzb25wLXBvbGxpbmcuanNcbi8vIGFuZCBqUXVlcnktSlNPTlA6XG4vLyAgICBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2pxdWVyeS1qc29ucC9zb3VyY2UvYnJvd3NlL3RydW5rL2NvcmUvanF1ZXJ5Lmpzb25wLmpzXG52YXIganNvblBHZW5lcmljUmVjZWl2ZXIgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHRyZWY7XG4gICAgdmFyIHNjcmlwdCA9IF9kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICB2YXIgc2NyaXB0MjsgIC8vIE9wZXJhIHN5bmNocm9ub3VzIGxvYWQgdHJpY2suXG4gICAgdmFyIGNsb3NlX3NjcmlwdCA9IGZ1bmN0aW9uKGZyYW1lKSB7XG4gICAgICAgIGlmIChzY3JpcHQyKSB7XG4gICAgICAgICAgICBzY3JpcHQyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2NyaXB0Mik7XG4gICAgICAgICAgICBzY3JpcHQyID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2NyaXB0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodHJlZik7XG4gICAgICAgICAgICAvLyBVbmZvcnR1bmF0ZWx5LCB5b3UgY2FuJ3QgcmVhbGx5IGFib3J0IHNjcmlwdCBsb2FkaW5nIG9mXG4gICAgICAgICAgICAvLyB0aGUgc2NyaXB0LlxuICAgICAgICAgICAgc2NyaXB0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgICAgIHNjcmlwdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBzY3JpcHQub25lcnJvciA9XG4gICAgICAgICAgICAgICAgc2NyaXB0Lm9ubG9hZCA9IHNjcmlwdC5vbmNsaWNrID0gbnVsbDtcbiAgICAgICAgICAgIHNjcmlwdCA9IG51bGw7XG4gICAgICAgICAgICBjYWxsYmFjayhmcmFtZSk7XG4gICAgICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gSUU5IGZpcmVzICdlcnJvcicgZXZlbnQgYWZ0ZXIgb3JzYyBvciBiZWZvcmUsIGluIHJhbmRvbSBvcmRlci5cbiAgICB2YXIgbG9hZGVkX29rYXkgPSBmYWxzZTtcbiAgICB2YXIgZXJyb3JfdGltZXIgPSBudWxsO1xuXG4gICAgc2NyaXB0LmlkID0gJ2EnICsgdXRpbHMucmFuZG9tX3N0cmluZyg4KTtcbiAgICBzY3JpcHQuc3JjID0gdXJsO1xuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gICAgc2NyaXB0LmNoYXJzZXQgPSAnVVRGLTgnO1xuICAgIHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoIWVycm9yX3RpbWVyKSB7XG4gICAgICAgICAgICAvLyBEZWxheSBmaXJpbmcgY2xvc2Vfc2NyaXB0LlxuICAgICAgICAgICAgZXJyb3JfdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghbG9hZGVkX29rYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xvc2Vfc2NyaXB0KHV0aWxzLmNsb3NlRnJhbWUoXG4gICAgICAgICAgICAgICAgICAgICAgICAxMDA2LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJKU09OUCBzY3JpcHQgbG9hZGVkIGFibm9ybWFsbHkgKG9uZXJyb3IpXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgc2NyaXB0Lm9ubG9hZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY2xvc2Vfc2NyaXB0KHV0aWxzLmNsb3NlRnJhbWUoMTAwNiwgXCJKU09OUCBzY3JpcHQgbG9hZGVkIGFibm9ybWFsbHkgKG9ubG9hZClcIikpO1xuICAgIH07XG5cbiAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoL2xvYWRlZHxjbG9zZWQvLnRlc3Qoc2NyaXB0LnJlYWR5U3RhdGUpKSB7XG4gICAgICAgICAgICBpZiAoc2NyaXB0ICYmIHNjcmlwdC5odG1sRm9yICYmIHNjcmlwdC5vbmNsaWNrKSB7XG4gICAgICAgICAgICAgICAgbG9hZGVkX29rYXkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluIElFLCBhY3R1YWxseSBleGVjdXRlIHRoZSBzY3JpcHQuXG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5vbmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoeCkge31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzY3JpcHQpIHtcbiAgICAgICAgICAgICAgICBjbG9zZV9zY3JpcHQodXRpbHMuY2xvc2VGcmFtZSgxMDA2LCBcIkpTT05QIHNjcmlwdCBsb2FkZWQgYWJub3JtYWxseSAob25yZWFkeXN0YXRlY2hhbmdlKVwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8vIElFOiBldmVudC9odG1sRm9yL29uY2xpY2sgdHJpY2suXG4gICAgLy8gT25lIGNhbid0IHJlbHkgb24gcHJvcGVyIG9yZGVyIGZvciBvbnJlYWR5c3RhdGVjaGFuZ2UuIEluIG9yZGVyIHRvXG4gICAgLy8gbWFrZSBzdXJlLCBzZXQgYSAnaHRtbEZvcicgYW5kICdldmVudCcgcHJvcGVydGllcywgc28gdGhhdFxuICAgIC8vIHNjcmlwdCBjb2RlIHdpbGwgYmUgaW5zdGFsbGVkIGFzICdvbmNsaWNrJyBoYW5kbGVyIGZvciB0aGVcbiAgICAvLyBzY3JpcHQgb2JqZWN0LiBMYXRlciwgb25yZWFkeXN0YXRlY2hhbmdlLCBtYW51YWxseSBleGVjdXRlIHRoaXNcbiAgICAvLyBjb2RlLiBGRiBhbmQgQ2hyb21lIGRvZXNuJ3Qgd29yayB3aXRoICdldmVudCcgYW5kICdodG1sRm9yJ1xuICAgIC8vIHNldC4gRm9yIHJlZmVyZW5jZSBzZWU6XG4gICAgLy8gICBodHRwOi8vamF1Ym91cmcubmV0LzIwMTAvMDcvbG9hZGluZy1zY3JpcHQtYXMtb25jbGljay1oYW5kbGVyLW9mLmh0bWxcbiAgICAvLyBBbHNvLCByZWFkIG9uIHRoYXQgYWJvdXQgc2NyaXB0IG9yZGVyaW5nOlxuICAgIC8vICAgaHR0cDovL3dpa2kud2hhdHdnLm9yZy93aWtpL0R5bmFtaWNfU2NyaXB0X0V4ZWN1dGlvbl9PcmRlclxuICAgIGlmICh0eXBlb2Ygc2NyaXB0LmFzeW5jID09PSAndW5kZWZpbmVkJyAmJiBfZG9jdW1lbnQuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgLy8gQWNjb3JkaW5nIHRvIG1vemlsbGEgZG9jcywgaW4gcmVjZW50IGJyb3dzZXJzIHNjcmlwdC5hc3luYyBkZWZhdWx0c1xuICAgICAgICAvLyB0byAndHJ1ZScsIHNvIHdlIG1heSB1c2UgaXQgdG8gZGV0ZWN0IGEgZ29vZCBicm93c2VyOlxuICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9IVE1ML0VsZW1lbnQvc2NyaXB0XG4gICAgICAgIGlmICghL29wZXJhL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuICAgICAgICAgICAgLy8gTmFpdmVseSBhc3N1bWUgd2UncmUgaW4gSUVcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0Lmh0bWxGb3IgPSBzY3JpcHQuaWQ7XG4gICAgICAgICAgICAgICAgc2NyaXB0LmV2ZW50ID0gXCJvbmNsaWNrXCI7XG4gICAgICAgICAgICB9IGNhdGNoICh4KSB7fVxuICAgICAgICAgICAgc2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE9wZXJhLCBzZWNvbmQgc3luYyBzY3JpcHQgaGFja1xuICAgICAgICAgICAgc2NyaXB0MiA9IF9kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgICAgICAgIHNjcmlwdDIudGV4dCA9IFwidHJ5e3ZhciBhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ1wiK3NjcmlwdC5pZCtcIicpOyBpZihhKWEub25lcnJvcigpO31jYXRjaCh4KXt9O1wiO1xuICAgICAgICAgICAgc2NyaXB0LmFzeW5jID0gc2NyaXB0Mi5hc3luYyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc2NyaXB0LmFzeW5jICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIEZhbGxiYWNrIG1vc3RseSBmb3IgS29ucXVlcm9yIC0gc3R1cGlkIHRpbWVyLCAzNSBzZWNvbmRzIHNoYWxsIGJlIHBsZW50eS5cbiAgICB0cmVmID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2Vfc2NyaXB0KHV0aWxzLmNsb3NlRnJhbWUoMTAwNiwgXCJKU09OUCBzY3JpcHQgbG9hZGVkIGFibm9ybWFsbHkgKHRpbWVvdXQpXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICB9LCAzNTAwMCk7XG5cbiAgICB2YXIgaGVhZCA9IF9kb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuICAgIGhlYWQuaW5zZXJ0QmVmb3JlKHNjcmlwdCwgaGVhZC5maXJzdENoaWxkKTtcbiAgICBpZiAoc2NyaXB0Mikge1xuICAgICAgICBoZWFkLmluc2VydEJlZm9yZShzY3JpcHQyLCBoZWFkLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgICByZXR1cm4gY2xvc2Vfc2NyaXB0O1xufTtcbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvdHJhbnMtanNvbnAtcmVjZWl2ZXIuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3RyYW5zLWpzb25wLXBvbGxpbmcuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbi8vIFRoZSBzaW1wbGVzdCBhbmQgbW9zdCByb2J1c3QgdHJhbnNwb3J0LCB1c2luZyB0aGUgd2VsbC1rbm93IGNyb3NzXG4vLyBkb21haW4gaGFjayAtIEpTT05QLiBUaGlzIHRyYW5zcG9ydCBpcyBxdWl0ZSBpbmVmZmljaWVudCAtIG9uZVxuLy8gbXNzYWdlIGNvdWxkIHVzZSB1cCB0byBvbmUgaHR0cCByZXF1ZXN0LiBCdXQgYXQgbGVhc3QgaXQgd29ya3MgYWxtb3N0XG4vLyBldmVyeXdoZXJlLlxuLy8gS25vd24gbGltaXRhdGlvbnM6XG4vLyAgIG8geW91IHdpbGwgZ2V0IGEgc3Bpbm5pbmcgY3Vyc29yXG4vLyAgIG8gZm9yIEtvbnF1ZXJvciBhIGR1bWIgdGltZXIgaXMgbmVlZGVkIHRvIGRldGVjdCBlcnJvcnNcblxuXG52YXIgSnNvblBUcmFuc3BvcnQgPSBTb2NrSlNbJ2pzb25wLXBvbGxpbmcnXSA9IGZ1bmN0aW9uKHJpLCB0cmFuc191cmwpIHtcbiAgICB1dGlscy5wb2xsdXRlR2xvYmFsTmFtZXNwYWNlKCk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoYXQucmkgPSByaTtcbiAgICB0aGF0LnRyYW5zX3VybCA9IHRyYW5zX3VybDtcbiAgICB0aGF0LnNlbmRfY29uc3RydWN0b3IoanNvblBHZW5lcmljU2VuZGVyKTtcbiAgICB0aGF0Ll9zY2hlZHVsZV9yZWN2KCk7XG59O1xuXG4vLyBJbmhlcml0bmFjZVxuSnNvblBUcmFuc3BvcnQucHJvdG90eXBlID0gbmV3IEJ1ZmZlcmVkU2VuZGVyKCk7XG5cbkpzb25QVHJhbnNwb3J0LnByb3RvdHlwZS5fc2NoZWR1bGVfcmVjdiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHRoYXQuX3JlY3Zfc3RvcCA9IG51bGw7XG4gICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAvLyBubyBkYXRhIC0gaGVhcnRiZWF0O1xuICAgICAgICAgICAgaWYgKCF0aGF0Ll9pc19jbG9zaW5nKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5yaS5fZGlkTWVzc2FnZShkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgbWVzc2FnZSBjYW4gYmUgYSBjbG9zZSBtZXNzYWdlLCBhbmQgY2hhbmdlIGlzX2Nsb3Npbmcgc3RhdGUuXG4gICAgICAgIGlmICghdGhhdC5faXNfY2xvc2luZykge1xuICAgICAgICAgICAgdGhhdC5fc2NoZWR1bGVfcmVjdigpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGF0Ll9yZWN2X3N0b3AgPSBqc29uUFJlY2VpdmVyV3JhcHBlcih0aGF0LnRyYW5zX3VybCArICcvanNvbnAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25QR2VuZXJpY1JlY2VpdmVyLCBjYWxsYmFjayk7XG59O1xuXG5Kc29uUFRyYW5zcG9ydC5lbmFibGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5Kc29uUFRyYW5zcG9ydC5uZWVkX2JvZHkgPSB0cnVlO1xuXG5cbkpzb25QVHJhbnNwb3J0LnByb3RvdHlwZS5kb0NsZWFudXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC5faXNfY2xvc2luZyA9IHRydWU7XG4gICAgaWYgKHRoYXQuX3JlY3Zfc3RvcCkge1xuICAgICAgICB0aGF0Ll9yZWN2X3N0b3AoKTtcbiAgICB9XG4gICAgdGhhdC5yaSA9IHRoYXQuX3JlY3Zfc3RvcCA9IG51bGw7XG4gICAgdGhhdC5zZW5kX2Rlc3RydWN0b3IoKTtcbn07XG5cblxuLy8gQWJzdHJhY3QgYXdheSBjb2RlIHRoYXQgaGFuZGxlcyBnbG9iYWwgbmFtZXNwYWNlIHBvbGx1dGlvbi5cbnZhciBqc29uUFJlY2VpdmVyV3JhcHBlciA9IGZ1bmN0aW9uKHVybCwgY29uc3RydWN0UmVjZWl2ZXIsIHVzZXJfY2FsbGJhY2spIHtcbiAgICB2YXIgaWQgPSAnYScgKyB1dGlscy5yYW5kb21fc3RyaW5nKDYpO1xuICAgIHZhciB1cmxfaWQgPSB1cmwgKyAnP2M9JyArIGVzY2FwZShXUHJlZml4ICsgJy4nICsgaWQpO1xuXG4gICAgLy8gVW5mb3J0dW5hdGVseSBpdCBpcyBub3QgcG9zc2libGUgdG8gYWJvcnQgbG9hZGluZyBvZiB0aGVcbiAgICAvLyBzY3JpcHQuIFdlIG5lZWQgdG8ga2VlcCB0cmFjayBvZiBmcmFrZSBjbG9zZSBmcmFtZXMuXG4gICAgdmFyIGFib3J0aW5nID0gMDtcblxuICAgIC8vIENhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIGV4YWN0bHkgb25jZS5cbiAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbihmcmFtZSkge1xuICAgICAgICBzd2l0Y2goYWJvcnRpbmcpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgLy8gTm9ybWFsIGJlaGF2aW91ciAtIGRlbGV0ZSBob29rIF9hbmRfIGVtaXQgbWVzc2FnZS5cbiAgICAgICAgICAgIGRlbGV0ZSBfd2luZG93W1dQcmVmaXhdW2lkXTtcbiAgICAgICAgICAgIHVzZXJfY2FsbGJhY2soZnJhbWUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIC8vIEZha2UgY2xvc2UgZnJhbWUgLSBlbWl0IGJ1dCBkb24ndCBkZWxldGUgaG9vay5cbiAgICAgICAgICAgIHVzZXJfY2FsbGJhY2soZnJhbWUpO1xuICAgICAgICAgICAgYWJvcnRpbmcgPSAyO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIC8vIEdvdCBmcmFtZSBhZnRlciBjb25uZWN0aW9uIHdhcyBjbG9zZWQsIGRlbGV0ZSBob29rLCBkb24ndCBlbWl0LlxuICAgICAgICAgICAgZGVsZXRlIF93aW5kb3dbV1ByZWZpeF1baWRdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsb3NlX3NjcmlwdCA9IGNvbnN0cnVjdFJlY2VpdmVyKHVybF9pZCwgY2FsbGJhY2spO1xuICAgIF93aW5kb3dbV1ByZWZpeF1baWRdID0gY2xvc2Vfc2NyaXB0O1xuICAgIHZhciBzdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChfd2luZG93W1dQcmVmaXhdW2lkXSkge1xuICAgICAgICAgICAgYWJvcnRpbmcgPSAxO1xuICAgICAgICAgICAgX3dpbmRvd1tXUHJlZml4XVtpZF0odXRpbHMuY2xvc2VGcmFtZSgxMDAwLCBcIkpTT05QIHVzZXIgYWJvcnRlZCByZWFkXCIpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHN0b3A7XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi90cmFucy1qc29ucC1wb2xsaW5nLmpzXG5cblxuLy8gICAgICAgICBbKl0gSW5jbHVkaW5nIGxpYi90cmFucy14aHIuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbnZhciBBamF4QmFzZWRUcmFuc3BvcnQgPSBmdW5jdGlvbigpIHt9O1xuQWpheEJhc2VkVHJhbnNwb3J0LnByb3RvdHlwZSA9IG5ldyBCdWZmZXJlZFNlbmRlcigpO1xuXG5BamF4QmFzZWRUcmFuc3BvcnQucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKHJpLCB0cmFuc191cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybF9zdWZmaXgsIFJlY2VpdmVyLCBBamF4T2JqZWN0KSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoYXQucmkgPSByaTtcbiAgICB0aGF0LnRyYW5zX3VybCA9IHRyYW5zX3VybDtcbiAgICB0aGF0LnNlbmRfY29uc3RydWN0b3IoY3JlYXRlQWpheFNlbmRlcihBamF4T2JqZWN0KSk7XG4gICAgdGhhdC5wb2xsID0gbmV3IFBvbGxpbmcocmksIFJlY2VpdmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zX3VybCArIHVybF9zdWZmaXgsIEFqYXhPYmplY3QpO1xufTtcblxuQWpheEJhc2VkVHJhbnNwb3J0LnByb3RvdHlwZS5kb0NsZWFudXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKHRoYXQucG9sbCkge1xuICAgICAgICB0aGF0LnBvbGwuYWJvcnQoKTtcbiAgICAgICAgdGhhdC5wb2xsID0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyB4aHItc3RyZWFtaW5nXG52YXIgWGhyU3RyZWFtaW5nVHJhbnNwb3J0ID0gU29ja0pTWyd4aHItc3RyZWFtaW5nJ10gPSBmdW5jdGlvbihyaSwgdHJhbnNfdXJsKSB7XG4gICAgdGhpcy5ydW4ocmksIHRyYW5zX3VybCwgJy94aHJfc3RyZWFtaW5nJywgWGhyUmVjZWl2ZXIsIHV0aWxzLlhIUkNvcnNPYmplY3QpO1xufTtcblxuWGhyU3RyZWFtaW5nVHJhbnNwb3J0LnByb3RvdHlwZSA9IG5ldyBBamF4QmFzZWRUcmFuc3BvcnQoKTtcblxuWGhyU3RyZWFtaW5nVHJhbnNwb3J0LmVuYWJsZWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTdXBwb3J0IGZvciBDT1JTIEFqYXggYWthIEFqYXgyPyBPcGVyYSAxMiBjbGFpbXMgQ09SUyBidXRcbiAgICAvLyBkb2Vzbid0IGRvIHN0cmVhbWluZy5cbiAgICByZXR1cm4gKF93aW5kb3cuWE1MSHR0cFJlcXVlc3QgJiZcbiAgICAgICAgICAgICd3aXRoQ3JlZGVudGlhbHMnIGluIG5ldyBYTUxIdHRwUmVxdWVzdCgpICYmXG4gICAgICAgICAgICAoIS9vcGVyYS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpKTtcbn07XG5YaHJTdHJlYW1pbmdUcmFuc3BvcnQucm91bmRUcmlwcyA9IDI7IC8vIHByZWZsaWdodCwgYWpheFxuXG4vLyBTYWZhcmkgZ2V0cyBjb25mdXNlZCB3aGVuIGEgc3RyZWFtaW5nIGFqYXggcmVxdWVzdCBpcyBzdGFydGVkXG4vLyBiZWZvcmUgb25sb2FkLiBUaGlzIGNhdXNlcyB0aGUgbG9hZCBpbmRpY2F0b3IgdG8gc3BpbiBpbmRlZmluZXRlbHkuXG5YaHJTdHJlYW1pbmdUcmFuc3BvcnQubmVlZF9ib2R5ID0gdHJ1ZTtcblxuXG4vLyBBY2NvcmRpbmcgdG86XG4vLyAgIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTY0MTUwNy9kZXRlY3QtYnJvd3Nlci1zdXBwb3J0LWZvci1jcm9zcy1kb21haW4teG1saHR0cHJlcXVlc3RzXG4vLyAgIGh0dHA6Ly9oYWNrcy5tb3ppbGxhLm9yZy8yMDA5LzA3L2Nyb3NzLXNpdGUteG1saHR0cHJlcXVlc3Qtd2l0aC1jb3JzL1xuXG5cbi8vIHhkci1zdHJlYW1pbmdcbnZhciBYZHJTdHJlYW1pbmdUcmFuc3BvcnQgPSBTb2NrSlNbJ3hkci1zdHJlYW1pbmcnXSA9IGZ1bmN0aW9uKHJpLCB0cmFuc191cmwpIHtcbiAgICB0aGlzLnJ1bihyaSwgdHJhbnNfdXJsLCAnL3hocl9zdHJlYW1pbmcnLCBYaHJSZWNlaXZlciwgdXRpbHMuWERST2JqZWN0KTtcbn07XG5cblhkclN0cmVhbWluZ1RyYW5zcG9ydC5wcm90b3R5cGUgPSBuZXcgQWpheEJhc2VkVHJhbnNwb3J0KCk7XG5cblhkclN0cmVhbWluZ1RyYW5zcG9ydC5lbmFibGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICEhX3dpbmRvdy5YRG9tYWluUmVxdWVzdDtcbn07XG5YZHJTdHJlYW1pbmdUcmFuc3BvcnQucm91bmRUcmlwcyA9IDI7IC8vIHByZWZsaWdodCwgYWpheFxuXG5cblxuLy8geGhyLXBvbGxpbmdcbnZhciBYaHJQb2xsaW5nVHJhbnNwb3J0ID0gU29ja0pTWyd4aHItcG9sbGluZyddID0gZnVuY3Rpb24ocmksIHRyYW5zX3VybCkge1xuICAgIHRoaXMucnVuKHJpLCB0cmFuc191cmwsICcveGhyJywgWGhyUmVjZWl2ZXIsIHV0aWxzLlhIUkNvcnNPYmplY3QpO1xufTtcblxuWGhyUG9sbGluZ1RyYW5zcG9ydC5wcm90b3R5cGUgPSBuZXcgQWpheEJhc2VkVHJhbnNwb3J0KCk7XG5cblhoclBvbGxpbmdUcmFuc3BvcnQuZW5hYmxlZCA9IFhoclN0cmVhbWluZ1RyYW5zcG9ydC5lbmFibGVkO1xuWGhyUG9sbGluZ1RyYW5zcG9ydC5yb3VuZFRyaXBzID0gMjsgLy8gcHJlZmxpZ2h0LCBhamF4XG5cblxuLy8geGRyLXBvbGxpbmdcbnZhciBYZHJQb2xsaW5nVHJhbnNwb3J0ID0gU29ja0pTWyd4ZHItcG9sbGluZyddID0gZnVuY3Rpb24ocmksIHRyYW5zX3VybCkge1xuICAgIHRoaXMucnVuKHJpLCB0cmFuc191cmwsICcveGhyJywgWGhyUmVjZWl2ZXIsIHV0aWxzLlhEUk9iamVjdCk7XG59O1xuXG5YZHJQb2xsaW5nVHJhbnNwb3J0LnByb3RvdHlwZSA9IG5ldyBBamF4QmFzZWRUcmFuc3BvcnQoKTtcblxuWGRyUG9sbGluZ1RyYW5zcG9ydC5lbmFibGVkID0gWGRyU3RyZWFtaW5nVHJhbnNwb3J0LmVuYWJsZWQ7XG5YZHJQb2xsaW5nVHJhbnNwb3J0LnJvdW5kVHJpcHMgPSAyOyAvLyBwcmVmbGlnaHQsIGFqYXhcbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvdHJhbnMteGhyLmpzXG5cblxuLy8gICAgICAgICBbKl0gSW5jbHVkaW5nIGxpYi90cmFucy1pZnJhbWUuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbi8vIEZldyBjb29sIHRyYW5zcG9ydHMgZG8gd29yayBvbmx5IGZvciBzYW1lLW9yaWdpbi4gSW4gb3JkZXIgdG8gbWFrZVxuLy8gdGhlbSB3b3JraW5nIGNyb3NzLWRvbWFpbiB3ZSBzaGFsbCB1c2UgaWZyYW1lLCBzZXJ2ZWQgZm9ybSB0aGVcbi8vIHJlbW90ZSBkb21haW4uIE5ldyBicm93c2VycywgaGF2ZSBjYXBhYmlsaXRpZXMgdG8gY29tbXVuaWNhdGUgd2l0aFxuLy8gY3Jvc3MgZG9tYWluIGlmcmFtZSwgdXNpbmcgcG9zdE1lc3NhZ2UoKS4gSW4gSUUgaXQgd2FzIGltcGxlbWVudGVkXG4vLyBmcm9tIElFIDgrLCBidXQgb2YgY291cnNlLCBJRSBnb3Qgc29tZSBkZXRhaWxzIHdyb25nOlxuLy8gICAgaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2NjMTk3MDE1KHY9VlMuODUpLmFzcHhcbi8vICAgIGh0dHA6Ly9zdGV2ZXNvdWRlcnMuY29tL21pc2MvdGVzdC1wb3N0bWVzc2FnZS5waHBcblxudmFyIElmcmFtZVRyYW5zcG9ydCA9IGZ1bmN0aW9uKCkge307XG5cbklmcmFtZVRyYW5zcG9ydC5wcm90b3R5cGUuaV9jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uKHJpLCB0cmFuc191cmwsIGJhc2VfdXJsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoYXQucmkgPSByaTtcbiAgICB0aGF0Lm9yaWdpbiA9IHV0aWxzLmdldE9yaWdpbihiYXNlX3VybCk7XG4gICAgdGhhdC5iYXNlX3VybCA9IGJhc2VfdXJsO1xuICAgIHRoYXQudHJhbnNfdXJsID0gdHJhbnNfdXJsO1xuXG4gICAgdmFyIGlmcmFtZV91cmwgPSBiYXNlX3VybCArICcvaWZyYW1lLmh0bWwnO1xuICAgIGlmICh0aGF0LnJpLl9vcHRpb25zLmRldmVsKSB7XG4gICAgICAgIGlmcmFtZV91cmwgKz0gJz90PScgKyAoK25ldyBEYXRlKTtcbiAgICB9XG4gICAgdGhhdC53aW5kb3dfaWQgPSB1dGlscy5yYW5kb21fc3RyaW5nKDgpO1xuICAgIGlmcmFtZV91cmwgKz0gJyMnICsgdGhhdC53aW5kb3dfaWQ7XG5cbiAgICB0aGF0LmlmcmFtZU9iaiA9IHV0aWxzLmNyZWF0ZUlmcmFtZShpZnJhbWVfdXJsLCBmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucmkuX2RpZENsb3NlKDEwMDYsIFwiVW5hYmxlIHRvIGxvYWQgYW4gaWZyYW1lIChcIiArIHIgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICB0aGF0Lm9ubWVzc2FnZV9jYiA9IHV0aWxzLmJpbmQodGhhdC5vbm1lc3NhZ2UsIHRoYXQpO1xuICAgIHV0aWxzLmF0dGFjaE1lc3NhZ2UodGhhdC5vbm1lc3NhZ2VfY2IpO1xufTtcblxuSWZyYW1lVHJhbnNwb3J0LnByb3RvdHlwZS5kb0NsZWFudXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKHRoYXQuaWZyYW1lT2JqKSB7XG4gICAgICAgIHV0aWxzLmRldGFjaE1lc3NhZ2UodGhhdC5vbm1lc3NhZ2VfY2IpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB0aGUgaWZyYW1lIGlzIG5vdCBsb2FkZWQsIElFIHJhaXNlcyBhbiBleGNlcHRpb25cbiAgICAgICAgICAgIC8vIG9uICdjb250ZW50V2luZG93Jy5cbiAgICAgICAgICAgIGlmICh0aGF0LmlmcmFtZU9iai5pZnJhbWUuY29udGVudFdpbmRvdykge1xuICAgICAgICAgICAgICAgIHRoYXQucG9zdE1lc3NhZ2UoJ2MnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoeCkge31cbiAgICAgICAgdGhhdC5pZnJhbWVPYmouY2xlYW51cCgpO1xuICAgICAgICB0aGF0LmlmcmFtZU9iaiA9IG51bGw7XG4gICAgICAgIHRoYXQub25tZXNzYWdlX2NiID0gdGhhdC5pZnJhbWVPYmogPSBudWxsO1xuICAgIH1cbn07XG5cbklmcmFtZVRyYW5zcG9ydC5wcm90b3R5cGUub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBpZiAoZS5vcmlnaW4gIT09IHRoYXQub3JpZ2luKSByZXR1cm47XG4gICAgdmFyIHdpbmRvd19pZCA9IGUuZGF0YS5zbGljZSgwLCA4KTtcbiAgICB2YXIgdHlwZSA9IGUuZGF0YS5zbGljZSg4LCA5KTtcbiAgICB2YXIgZGF0YSA9IGUuZGF0YS5zbGljZSg5KTtcblxuICAgIGlmICh3aW5kb3dfaWQgIT09IHRoYXQud2luZG93X2lkKSByZXR1cm47XG5cbiAgICBzd2l0Y2godHlwZSkge1xuICAgIGNhc2UgJ3MnOlxuICAgICAgICB0aGF0LmlmcmFtZU9iai5sb2FkZWQoKTtcbiAgICAgICAgdGhhdC5wb3N0TWVzc2FnZSgncycsIEpTT04uc3RyaW5naWZ5KFtTb2NrSlMudmVyc2lvbiwgdGhhdC5wcm90b2NvbCwgdGhhdC50cmFuc191cmwsIHRoYXQuYmFzZV91cmxdKSk7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3QnOlxuICAgICAgICB0aGF0LnJpLl9kaWRNZXNzYWdlKGRhdGEpO1xuICAgICAgICBicmVhaztcbiAgICB9XG59O1xuXG5JZnJhbWVUcmFuc3BvcnQucHJvdG90eXBlLnBvc3RNZXNzYWdlID0gZnVuY3Rpb24odHlwZSwgZGF0YSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGF0LmlmcmFtZU9iai5wb3N0KHRoYXQud2luZG93X2lkICsgdHlwZSArIChkYXRhIHx8ICcnKSwgdGhhdC5vcmlnaW4pO1xufTtcblxuSWZyYW1lVHJhbnNwb3J0LnByb3RvdHlwZS5kb1NlbmQgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHRoaXMucG9zdE1lc3NhZ2UoJ20nLCBtZXNzYWdlKTtcbn07XG5cbklmcmFtZVRyYW5zcG9ydC5lbmFibGVkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gcG9zdE1lc3NhZ2UgbWlzYmVoYXZlcyBpbiBrb25xdWVyb3IgNC42LjUgLSB0aGUgbWVzc2FnZXMgYXJlIGRlbGl2ZXJlZCB3aXRoXG4gICAgLy8gaHVnZSBkZWxheSwgb3Igbm90IGF0IGFsbC5cbiAgICB2YXIga29ucXVlcm9yID0gbmF2aWdhdG9yICYmIG5hdmlnYXRvci51c2VyQWdlbnQgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdLb25xdWVyb3InKSAhPT0gLTE7XG4gICAgcmV0dXJuICgodHlwZW9mIF93aW5kb3cucG9zdE1lc3NhZ2UgPT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgICAgIHR5cGVvZiBfd2luZG93LnBvc3RNZXNzYWdlID09PSAnb2JqZWN0JykgJiYgKCFrb25xdWVyb3IpKTtcbn07XG4vLyAgICAgICAgIFsqXSBFbmQgb2YgbGliL3RyYW5zLWlmcmFtZS5qc1xuXG5cbi8vICAgICAgICAgWypdIEluY2x1ZGluZyBsaWIvdHJhbnMtaWZyYW1lLXdpdGhpbi5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxudmFyIGN1cnJfd2luZG93X2lkO1xuXG52YXIgcG9zdE1lc3NhZ2UgPSBmdW5jdGlvbiAodHlwZSwgZGF0YSkge1xuICAgIGlmKHBhcmVudCAhPT0gX3dpbmRvdykge1xuICAgICAgICBwYXJlbnQucG9zdE1lc3NhZ2UoY3Vycl93aW5kb3dfaWQgKyB0eXBlICsgKGRhdGEgfHwgJycpLCAnKicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHV0aWxzLmxvZyhcIkNhbid0IHBvc3RNZXNzYWdlLCBubyBwYXJlbnQgd2luZG93LlwiLCB0eXBlLCBkYXRhKTtcbiAgICB9XG59O1xuXG52YXIgRmFjYWRlSlMgPSBmdW5jdGlvbigpIHt9O1xuRmFjYWRlSlMucHJvdG90eXBlLl9kaWRDbG9zZSA9IGZ1bmN0aW9uIChjb2RlLCByZWFzb24pIHtcbiAgICBwb3N0TWVzc2FnZSgndCcsIHV0aWxzLmNsb3NlRnJhbWUoY29kZSwgcmVhc29uKSk7XG59O1xuRmFjYWRlSlMucHJvdG90eXBlLl9kaWRNZXNzYWdlID0gZnVuY3Rpb24gKGZyYW1lKSB7XG4gICAgcG9zdE1lc3NhZ2UoJ3QnLCBmcmFtZSk7XG59O1xuRmFjYWRlSlMucHJvdG90eXBlLl9kb1NlbmQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHRoaXMuX3RyYW5zcG9ydC5kb1NlbmQoZGF0YSk7XG59O1xuRmFjYWRlSlMucHJvdG90eXBlLl9kb0NsZWFudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fdHJhbnNwb3J0LmRvQ2xlYW51cCgpO1xufTtcblxudXRpbHMucGFyZW50X29yaWdpbiA9IHVuZGVmaW5lZDtcblxuU29ja0pTLmJvb3RzdHJhcF9pZnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmFjYWRlO1xuICAgIGN1cnJfd2luZG93X2lkID0gX2RvY3VtZW50LmxvY2F0aW9uLmhhc2guc2xpY2UoMSk7XG4gICAgdmFyIG9uTWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoZS5zb3VyY2UgIT09IHBhcmVudCkgcmV0dXJuO1xuICAgICAgICBpZih0eXBlb2YgdXRpbHMucGFyZW50X29yaWdpbiA9PT0gJ3VuZGVmaW5lZCcpXG4gICAgICAgICAgICB1dGlscy5wYXJlbnRfb3JpZ2luID0gZS5vcmlnaW47XG4gICAgICAgIGlmIChlLm9yaWdpbiAhPT0gdXRpbHMucGFyZW50X29yaWdpbikgcmV0dXJuO1xuXG4gICAgICAgIHZhciB3aW5kb3dfaWQgPSBlLmRhdGEuc2xpY2UoMCwgOCk7XG4gICAgICAgIHZhciB0eXBlID0gZS5kYXRhLnNsaWNlKDgsIDkpO1xuICAgICAgICB2YXIgZGF0YSA9IGUuZGF0YS5zbGljZSg5KTtcbiAgICAgICAgaWYgKHdpbmRvd19pZCAhPT0gY3Vycl93aW5kb3dfaWQpIHJldHVybjtcbiAgICAgICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICB2YXIgcCA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgICAgICB2YXIgdmVyc2lvbiA9IHBbMF07XG4gICAgICAgICAgICB2YXIgcHJvdG9jb2wgPSBwWzFdO1xuICAgICAgICAgICAgdmFyIHRyYW5zX3VybCA9IHBbMl07XG4gICAgICAgICAgICB2YXIgYmFzZV91cmwgPSBwWzNdO1xuICAgICAgICAgICAgaWYgKHZlcnNpb24gIT09IFNvY2tKUy52ZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgdXRpbHMubG9nKFwiSW5jb21wYXRpYmlsZSBTb2NrSlMhIE1haW4gc2l0ZSB1c2VzOlwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCIgXFxcIlwiICsgdmVyc2lvbiArIFwiXFxcIiwgdGhlIGlmcmFtZTpcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiIFxcXCJcIiArIFNvY2tKUy52ZXJzaW9uICsgXCJcXFwiLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdXRpbHMuZmxhdFVybCh0cmFuc191cmwpIHx8ICF1dGlscy5mbGF0VXJsKGJhc2VfdXJsKSkge1xuICAgICAgICAgICAgICAgIHV0aWxzLmxvZyhcIk9ubHkgYmFzaWMgdXJscyBhcmUgc3VwcG9ydGVkIGluIFNvY2tKU1wiKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdXRpbHMuaXNTYW1lT3JpZ2luVXJsKHRyYW5zX3VybCkgfHxcbiAgICAgICAgICAgICAgICAhdXRpbHMuaXNTYW1lT3JpZ2luVXJsKGJhc2VfdXJsKSkge1xuICAgICAgICAgICAgICAgIHV0aWxzLmxvZyhcIkNhbid0IGNvbm5lY3QgdG8gZGlmZmVyZW50IGRvbWFpbiBmcm9tIHdpdGhpbiBhbiBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiaWZyYW1lLiAoXCIgKyBKU09OLnN0cmluZ2lmeShbX3dpbmRvdy5sb2NhdGlvbi5ocmVmLCB0cmFuc191cmwsIGJhc2VfdXJsXSkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcIilcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmFjYWRlID0gbmV3IEZhY2FkZUpTKCk7XG4gICAgICAgICAgICBmYWNhZGUuX3RyYW5zcG9ydCA9IG5ldyBGYWNhZGVKU1twcm90b2NvbF0oZmFjYWRlLCB0cmFuc191cmwsIGJhc2VfdXJsKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgIGZhY2FkZS5fZG9TZW5kKGRhdGEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2MnOlxuICAgICAgICAgICAgaWYgKGZhY2FkZSlcbiAgICAgICAgICAgICAgICBmYWNhZGUuX2RvQ2xlYW51cCgpO1xuICAgICAgICAgICAgZmFjYWRlID0gbnVsbDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIGFsZXJ0KCd0ZXN0IHRpY2tlcicpO1xuICAgIC8vIGZhY2FkZSA9IG5ldyBGYWNhZGVKUygpO1xuICAgIC8vIGZhY2FkZS5fdHJhbnNwb3J0ID0gbmV3IEZhY2FkZUpTWyd3LWlmcmFtZS14aHItcG9sbGluZyddKGZhY2FkZSwgJ2h0dHA6Ly9ob3N0LmNvbTo5OTk5L3RpY2tlci8xMi9iYXNkJyk7XG5cbiAgICB1dGlscy5hdHRhY2hNZXNzYWdlKG9uTWVzc2FnZSk7XG5cbiAgICAvLyBTdGFydFxuICAgIHBvc3RNZXNzYWdlKCdzJyk7XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi90cmFucy1pZnJhbWUtd2l0aGluLmpzXG5cblxuLy8gICAgICAgICBbKl0gSW5jbHVkaW5nIGxpYi9pbmZvLmpzXG4vKlxuICogKioqKiogQkVHSU4gTElDRU5TRSBCTE9DSyAqKioqKlxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTIgVk13YXJlLCBJbmMuXG4gKlxuICogRm9yIHRoZSBsaWNlbnNlIHNlZSBDT1BZSU5HLlxuICogKioqKiogRU5EIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqL1xuXG52YXIgSW5mb1JlY2VpdmVyID0gZnVuY3Rpb24oYmFzZV91cmwsIEFqYXhPYmplY3QpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdXRpbHMuZGVsYXkoZnVuY3Rpb24oKXt0aGF0LmRvWGhyKGJhc2VfdXJsLCBBamF4T2JqZWN0KTt9KTtcbn07XG5cbkluZm9SZWNlaXZlci5wcm90b3R5cGUgPSBuZXcgRXZlbnRFbWl0dGVyKFsnZmluaXNoJ10pO1xuXG5JbmZvUmVjZWl2ZXIucHJvdG90eXBlLmRvWGhyID0gZnVuY3Rpb24oYmFzZV91cmwsIEFqYXhPYmplY3QpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHQwID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICB2YXIgeG8gPSBuZXcgQWpheE9iamVjdCgnR0VUJywgYmFzZV91cmwgKyAnL2luZm8nKTtcblxuICAgIHZhciB0cmVmID0gdXRpbHMuZGVsYXkoODAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7eG8ub250aW1lb3V0KCk7fSk7XG5cbiAgICB4by5vbmZpbmlzaCA9IGZ1bmN0aW9uKHN0YXR1cywgdGV4dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodHJlZik7XG4gICAgICAgIHRyZWYgPSBudWxsO1xuICAgICAgICBpZiAoc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHZhciBydHQgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpIC0gdDA7XG4gICAgICAgICAgICB2YXIgaW5mbyA9IEpTT04ucGFyc2UodGV4dCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGluZm8gIT09ICdvYmplY3QnKSBpbmZvID0ge307XG4gICAgICAgICAgICB0aGF0LmVtaXQoJ2ZpbmlzaCcsIGluZm8sIHJ0dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0LmVtaXQoJ2ZpbmlzaCcpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB4by5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgeG8uY2xvc2UoKTtcbiAgICAgICAgdGhhdC5lbWl0KCdmaW5pc2gnKTtcbiAgICB9O1xufTtcblxudmFyIEluZm9SZWNlaXZlcklmcmFtZSA9IGZ1bmN0aW9uKGJhc2VfdXJsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBnbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaWZyID0gbmV3IElmcmFtZVRyYW5zcG9ydCgpO1xuICAgICAgICBpZnIucHJvdG9jb2wgPSAndy1pZnJhbWUtaW5mby1yZWNlaXZlcic7XG4gICAgICAgIHZhciBmdW4gPSBmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHIgPT09ICdzdHJpbmcnICYmIHIuc3Vic3RyKDAsMSkgPT09ICdtJykge1xuICAgICAgICAgICAgICAgIHZhciBkID0gSlNPTi5wYXJzZShyLnN1YnN0cigxKSk7XG4gICAgICAgICAgICAgICAgdmFyIGluZm8gPSBkWzBdLCBydHQgPSBkWzFdO1xuICAgICAgICAgICAgICAgIHRoYXQuZW1pdCgnZmluaXNoJywgaW5mbywgcnR0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhhdC5lbWl0KCdmaW5pc2gnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmci5kb0NsZWFudXAoKTtcbiAgICAgICAgICAgIGlmciA9IG51bGw7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBtb2NrX3JpID0ge1xuICAgICAgICAgICAgX29wdGlvbnM6IHt9LFxuICAgICAgICAgICAgX2RpZENsb3NlOiBmdW4sXG4gICAgICAgICAgICBfZGlkTWVzc2FnZTogZnVuXG4gICAgICAgIH07XG4gICAgICAgIGlmci5pX2NvbnN0cnVjdG9yKG1vY2tfcmksIGJhc2VfdXJsLCBiYXNlX3VybCk7XG4gICAgfVxuICAgIGlmKCFfZG9jdW1lbnQuYm9keSkge1xuICAgICAgICB1dGlscy5hdHRhY2hFdmVudCgnbG9hZCcsIGdvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBnbygpO1xuICAgIH1cbn07XG5JbmZvUmVjZWl2ZXJJZnJhbWUucHJvdG90eXBlID0gbmV3IEV2ZW50RW1pdHRlcihbJ2ZpbmlzaCddKTtcblxuXG52YXIgSW5mb1JlY2VpdmVyRmFrZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEl0IG1heSBub3QgYmUgcG9zc2libGUgdG8gZG8gY3Jvc3MgZG9tYWluIEFKQVggdG8gZ2V0IHRoZSBpbmZvXG4gICAgLy8gZGF0YSwgZm9yIGV4YW1wbGUgZm9yIElFNy4gQnV0IHdlIHdhbnQgdG8gcnVuIEpTT05QLCBzbyBsZXQnc1xuICAgIC8vIGZha2UgdGhlIHJlc3BvbnNlLCB3aXRoIHJ0dD0ycyAocnRvPTZzKS5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdXRpbHMuZGVsYXkoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQuZW1pdCgnZmluaXNoJywge30sIDIwMDApO1xuICAgIH0pO1xufTtcbkluZm9SZWNlaXZlckZha2UucHJvdG90eXBlID0gbmV3IEV2ZW50RW1pdHRlcihbJ2ZpbmlzaCddKTtcblxudmFyIGNyZWF0ZUluZm9SZWNlaXZlciA9IGZ1bmN0aW9uKGJhc2VfdXJsKSB7XG4gICAgaWYgKHV0aWxzLmlzU2FtZU9yaWdpblVybChiYXNlX3VybCkpIHtcbiAgICAgICAgLy8gSWYsIGZvciBzb21lIHJlYXNvbiwgd2UgaGF2ZSBTb2NrSlMgbG9jYWxseSAtIHRoZXJlJ3Mgbm9cbiAgICAgICAgLy8gbmVlZCB0byBzdGFydCB1cCB0aGUgY29tcGxleCBtYWNoaW5lcnkuIEp1c3QgdXNlIGFqYXguXG4gICAgICAgIHJldHVybiBuZXcgSW5mb1JlY2VpdmVyKGJhc2VfdXJsLCB1dGlscy5YSFJMb2NhbE9iamVjdCk7XG4gICAgfVxuICAgIHN3aXRjaCAodXRpbHMuaXNYSFJDb3JzQ2FwYWJsZSgpKSB7XG4gICAgY2FzZSAxOlxuICAgICAgICAvLyBYSFJMb2NhbE9iamVjdCAtPiBub19jcmVkZW50aWFscz10cnVlXG4gICAgICAgIHJldHVybiBuZXcgSW5mb1JlY2VpdmVyKGJhc2VfdXJsLCB1dGlscy5YSFJMb2NhbE9iamVjdCk7XG4gICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gbmV3IEluZm9SZWNlaXZlcihiYXNlX3VybCwgdXRpbHMuWERST2JqZWN0KTtcbiAgICBjYXNlIDM6XG4gICAgICAgIC8vIE9wZXJhXG4gICAgICAgIHJldHVybiBuZXcgSW5mb1JlY2VpdmVySWZyYW1lKGJhc2VfdXJsKTtcbiAgICBkZWZhdWx0OlxuICAgICAgICAvLyBJRSA3XG4gICAgICAgIHJldHVybiBuZXcgSW5mb1JlY2VpdmVyRmFrZSgpO1xuICAgIH07XG59O1xuXG5cbnZhciBXSW5mb1JlY2VpdmVySWZyYW1lID0gRmFjYWRlSlNbJ3ctaWZyYW1lLWluZm8tcmVjZWl2ZXInXSA9IGZ1bmN0aW9uKHJpLCBfdHJhbnNfdXJsLCBiYXNlX3VybCkge1xuICAgIHZhciBpciA9IG5ldyBJbmZvUmVjZWl2ZXIoYmFzZV91cmwsIHV0aWxzLlhIUkxvY2FsT2JqZWN0KTtcbiAgICBpci5vbmZpbmlzaCA9IGZ1bmN0aW9uKGluZm8sIHJ0dCkge1xuICAgICAgICByaS5fZGlkTWVzc2FnZSgnbScrSlNPTi5zdHJpbmdpZnkoW2luZm8sIHJ0dF0pKTtcbiAgICAgICAgcmkuX2RpZENsb3NlKCk7XG4gICAgfVxufTtcbldJbmZvUmVjZWl2ZXJJZnJhbWUucHJvdG90eXBlLmRvQ2xlYW51cCA9IGZ1bmN0aW9uKCkge307XG4vLyAgICAgICAgIFsqXSBFbmQgb2YgbGliL2luZm8uanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3RyYW5zLWlmcmFtZS1ldmVudHNvdXJjZS5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxudmFyIEV2ZW50U291cmNlSWZyYW1lVHJhbnNwb3J0ID0gU29ja0pTWydpZnJhbWUtZXZlbnRzb3VyY2UnXSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC5wcm90b2NvbCA9ICd3LWlmcmFtZS1ldmVudHNvdXJjZSc7XG4gICAgdGhhdC5pX2NvbnN0cnVjdG9yLmFwcGx5KHRoYXQsIGFyZ3VtZW50cyk7XG59O1xuXG5FdmVudFNvdXJjZUlmcmFtZVRyYW5zcG9ydC5wcm90b3R5cGUgPSBuZXcgSWZyYW1lVHJhbnNwb3J0KCk7XG5cbkV2ZW50U291cmNlSWZyYW1lVHJhbnNwb3J0LmVuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICgnRXZlbnRTb3VyY2UnIGluIF93aW5kb3cpICYmIElmcmFtZVRyYW5zcG9ydC5lbmFibGVkKCk7XG59O1xuXG5FdmVudFNvdXJjZUlmcmFtZVRyYW5zcG9ydC5uZWVkX2JvZHkgPSB0cnVlO1xuRXZlbnRTb3VyY2VJZnJhbWVUcmFuc3BvcnQucm91bmRUcmlwcyA9IDM7IC8vIGh0bWwsIGphdmFzY3JpcHQsIGV2ZW50c291cmNlXG5cblxuLy8gdy1pZnJhbWUtZXZlbnRzb3VyY2VcbnZhciBFdmVudFNvdXJjZVRyYW5zcG9ydCA9IEZhY2FkZUpTWyd3LWlmcmFtZS1ldmVudHNvdXJjZSddID0gZnVuY3Rpb24ocmksIHRyYW5zX3VybCkge1xuICAgIHRoaXMucnVuKHJpLCB0cmFuc191cmwsICcvZXZlbnRzb3VyY2UnLCBFdmVudFNvdXJjZVJlY2VpdmVyLCB1dGlscy5YSFJMb2NhbE9iamVjdCk7XG59XG5FdmVudFNvdXJjZVRyYW5zcG9ydC5wcm90b3R5cGUgPSBuZXcgQWpheEJhc2VkVHJhbnNwb3J0KCk7XG4vLyAgICAgICAgIFsqXSBFbmQgb2YgbGliL3RyYW5zLWlmcmFtZS1ldmVudHNvdXJjZS5qc1xuXG5cbi8vICAgICAgICAgWypdIEluY2x1ZGluZyBsaWIvdHJhbnMtaWZyYW1lLXhoci1wb2xsaW5nLmpzXG4vKlxuICogKioqKiogQkVHSU4gTElDRU5TRSBCTE9DSyAqKioqKlxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTIgVk13YXJlLCBJbmMuXG4gKlxuICogRm9yIHRoZSBsaWNlbnNlIHNlZSBDT1BZSU5HLlxuICogKioqKiogRU5EIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqL1xuXG52YXIgWGhyUG9sbGluZ0lmcmFtZVRyYW5zcG9ydCA9IFNvY2tKU1snaWZyYW1lLXhoci1wb2xsaW5nJ10gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoYXQucHJvdG9jb2wgPSAndy1pZnJhbWUteGhyLXBvbGxpbmcnO1xuICAgIHRoYXQuaV9jb25zdHJ1Y3Rvci5hcHBseSh0aGF0LCBhcmd1bWVudHMpO1xufTtcblxuWGhyUG9sbGluZ0lmcmFtZVRyYW5zcG9ydC5wcm90b3R5cGUgPSBuZXcgSWZyYW1lVHJhbnNwb3J0KCk7XG5cblhoclBvbGxpbmdJZnJhbWVUcmFuc3BvcnQuZW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX3dpbmRvdy5YTUxIdHRwUmVxdWVzdCAmJiBJZnJhbWVUcmFuc3BvcnQuZW5hYmxlZCgpO1xufTtcblxuWGhyUG9sbGluZ0lmcmFtZVRyYW5zcG9ydC5uZWVkX2JvZHkgPSB0cnVlO1xuWGhyUG9sbGluZ0lmcmFtZVRyYW5zcG9ydC5yb3VuZFRyaXBzID0gMzsgLy8gaHRtbCwgamF2YXNjcmlwdCwgeGhyXG5cblxuLy8gdy1pZnJhbWUteGhyLXBvbGxpbmdcbnZhciBYaHJQb2xsaW5nSVRyYW5zcG9ydCA9IEZhY2FkZUpTWyd3LWlmcmFtZS14aHItcG9sbGluZyddID0gZnVuY3Rpb24ocmksIHRyYW5zX3VybCkge1xuICAgIHRoaXMucnVuKHJpLCB0cmFuc191cmwsICcveGhyJywgWGhyUmVjZWl2ZXIsIHV0aWxzLlhIUkxvY2FsT2JqZWN0KTtcbn07XG5cblhoclBvbGxpbmdJVHJhbnNwb3J0LnByb3RvdHlwZSA9IG5ldyBBamF4QmFzZWRUcmFuc3BvcnQoKTtcbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvdHJhbnMtaWZyYW1lLXhoci1wb2xsaW5nLmpzXG5cblxuLy8gICAgICAgICBbKl0gSW5jbHVkaW5nIGxpYi90cmFucy1pZnJhbWUtaHRtbGZpbGUuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbi8vIFRoaXMgdHJhbnNwb3J0IGdlbmVyYWxseSB3b3JrcyBpbiBhbnkgYnJvd3NlciwgYnV0IHdpbGwgY2F1c2UgYVxuLy8gc3Bpbm5pbmcgY3Vyc29yIHRvIGFwcGVhciBpbiBhbnkgYnJvd3NlciBvdGhlciB0aGFuIElFLlxuLy8gV2UgbWF5IHRlc3QgdGhpcyB0cmFuc3BvcnQgaW4gYWxsIGJyb3dzZXJzIC0gd2h5IG5vdCwgYnV0IGluXG4vLyBwcm9kdWN0aW9uIGl0IHNob3VsZCBiZSBvbmx5IHJ1biBpbiBJRS5cblxudmFyIEh0bWxGaWxlSWZyYW1lVHJhbnNwb3J0ID0gU29ja0pTWydpZnJhbWUtaHRtbGZpbGUnXSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC5wcm90b2NvbCA9ICd3LWlmcmFtZS1odG1sZmlsZSc7XG4gICAgdGhhdC5pX2NvbnN0cnVjdG9yLmFwcGx5KHRoYXQsIGFyZ3VtZW50cyk7XG59O1xuXG4vLyBJbmhlcml0YW5jZS5cbkh0bWxGaWxlSWZyYW1lVHJhbnNwb3J0LnByb3RvdHlwZSA9IG5ldyBJZnJhbWVUcmFuc3BvcnQoKTtcblxuSHRtbEZpbGVJZnJhbWVUcmFuc3BvcnQuZW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBJZnJhbWVUcmFuc3BvcnQuZW5hYmxlZCgpO1xufTtcblxuSHRtbEZpbGVJZnJhbWVUcmFuc3BvcnQubmVlZF9ib2R5ID0gdHJ1ZTtcbkh0bWxGaWxlSWZyYW1lVHJhbnNwb3J0LnJvdW5kVHJpcHMgPSAzOyAvLyBodG1sLCBqYXZhc2NyaXB0LCBodG1sZmlsZVxuXG5cbi8vIHctaWZyYW1lLWh0bWxmaWxlXG52YXIgSHRtbEZpbGVUcmFuc3BvcnQgPSBGYWNhZGVKU1sndy1pZnJhbWUtaHRtbGZpbGUnXSA9IGZ1bmN0aW9uKHJpLCB0cmFuc191cmwpIHtcbiAgICB0aGlzLnJ1bihyaSwgdHJhbnNfdXJsLCAnL2h0bWxmaWxlJywgSHRtbGZpbGVSZWNlaXZlciwgdXRpbHMuWEhSTG9jYWxPYmplY3QpO1xufTtcbkh0bWxGaWxlVHJhbnNwb3J0LnByb3RvdHlwZSA9IG5ldyBBamF4QmFzZWRUcmFuc3BvcnQoKTtcbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvdHJhbnMtaWZyYW1lLWh0bWxmaWxlLmpzXG5cblxuLy8gICAgICAgICBbKl0gSW5jbHVkaW5nIGxpYi90cmFucy1wb2xsaW5nLmpzXG4vKlxuICogKioqKiogQkVHSU4gTElDRU5TRSBCTE9DSyAqKioqKlxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTIgVk13YXJlLCBJbmMuXG4gKlxuICogRm9yIHRoZSBsaWNlbnNlIHNlZSBDT1BZSU5HLlxuICogKioqKiogRU5EIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqL1xuXG52YXIgUG9sbGluZyA9IGZ1bmN0aW9uKHJpLCBSZWNlaXZlciwgcmVjdl91cmwsIEFqYXhPYmplY3QpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhhdC5yaSA9IHJpO1xuICAgIHRoYXQuUmVjZWl2ZXIgPSBSZWNlaXZlcjtcbiAgICB0aGF0LnJlY3ZfdXJsID0gcmVjdl91cmw7XG4gICAgdGhhdC5BamF4T2JqZWN0ID0gQWpheE9iamVjdDtcbiAgICB0aGF0Ll9zY2hlZHVsZVJlY3YoKTtcbn07XG5cblBvbGxpbmcucHJvdG90eXBlLl9zY2hlZHVsZVJlY3YgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBvbGwgPSB0aGF0LnBvbGwgPSBuZXcgdGhhdC5SZWNlaXZlcih0aGF0LnJlY3ZfdXJsLCB0aGF0LkFqYXhPYmplY3QpO1xuICAgIHZhciBtc2dfY291bnRlciA9IDA7XG4gICAgcG9sbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIG1zZ19jb3VudGVyICs9IDE7XG4gICAgICAgIHRoYXQucmkuX2RpZE1lc3NhZ2UoZS5kYXRhKTtcbiAgICB9O1xuICAgIHBvbGwub25jbG9zZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC5wb2xsID0gcG9sbCA9IHBvbGwub25tZXNzYWdlID0gcG9sbC5vbmNsb3NlID0gbnVsbDtcbiAgICAgICAgaWYgKCF0aGF0LnBvbGxfaXNfY2xvc2luZykge1xuICAgICAgICAgICAgaWYgKGUucmVhc29uID09PSAncGVybWFuZW50Jykge1xuICAgICAgICAgICAgICAgIHRoYXQucmkuX2RpZENsb3NlKDEwMDYsICdQb2xsaW5nIGVycm9yICgnICsgZS5yZWFzb24gKyAnKScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGF0Ll9zY2hlZHVsZVJlY3YoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5Qb2xsaW5nLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGF0LnBvbGxfaXNfY2xvc2luZyA9IHRydWU7XG4gICAgaWYgKHRoYXQucG9sbCkge1xuICAgICAgICB0aGF0LnBvbGwuYWJvcnQoKTtcbiAgICB9XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi90cmFucy1wb2xsaW5nLmpzXG5cblxuLy8gICAgICAgICBbKl0gSW5jbHVkaW5nIGxpYi90cmFucy1yZWNlaXZlci1ldmVudHNvdXJjZS5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxudmFyIEV2ZW50U291cmNlUmVjZWl2ZXIgPSBmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIGVzID0gbmV3IEV2ZW50U291cmNlKHVybCk7XG4gICAgZXMub25tZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuICAgICAgICB0aGF0LmRpc3BhdGNoRXZlbnQobmV3IFNpbXBsZUV2ZW50KCdtZXNzYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7J2RhdGEnOiB1bmVzY2FwZShlLmRhdGEpfSkpO1xuICAgIH07XG4gICAgdGhhdC5lc19jbG9zZSA9IGVzLm9uZXJyb3IgPSBmdW5jdGlvbihlLCBhYm9ydF9yZWFzb24pIHtcbiAgICAgICAgLy8gRVMgb24gcmVjb25uZWN0aW9uIGhhcyByZWFkeVN0YXRlID0gMCBvciAxLlxuICAgICAgICAvLyBvbiBuZXR3b3JrIGVycm9yIGl0J3MgQ0xPU0VEID0gMlxuICAgICAgICB2YXIgcmVhc29uID0gYWJvcnRfcmVhc29uID8gJ3VzZXInIDpcbiAgICAgICAgICAgIChlcy5yZWFkeVN0YXRlICE9PSAyID8gJ25ldHdvcmsnIDogJ3Blcm1hbmVudCcpO1xuICAgICAgICB0aGF0LmVzX2Nsb3NlID0gZXMub25tZXNzYWdlID0gZXMub25lcnJvciA9IG51bGw7XG4gICAgICAgIC8vIEV2ZW50U291cmNlIHJlY29ubmVjdHMgYXV0b21hdGljYWxseS5cbiAgICAgICAgZXMuY2xvc2UoKTtcbiAgICAgICAgZXMgPSBudWxsO1xuICAgICAgICAvLyBTYWZhcmkgYW5kIGNocm9tZSA8IDE1IGNyYXNoIGlmIHdlIGNsb3NlIHdpbmRvdyBiZWZvcmVcbiAgICAgICAgLy8gd2FpdGluZyBmb3IgRVMgY2xlYW51cC4gU2VlOlxuICAgICAgICAvLyAgIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD04OTE1NVxuICAgICAgICB1dGlscy5kZWxheSgyMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5kaXNwYXRjaEV2ZW50KG5ldyBTaW1wbGVFdmVudCgnY2xvc2UnLCB7cmVhc29uOiByZWFzb259KSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH07XG59O1xuXG5FdmVudFNvdXJjZVJlY2VpdmVyLnByb3RvdHlwZSA9IG5ldyBSRXZlbnRUYXJnZXQoKTtcblxuRXZlbnRTb3VyY2VSZWNlaXZlci5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKHRoYXQuZXNfY2xvc2UpIHtcbiAgICAgICAgdGhhdC5lc19jbG9zZSh7fSwgdHJ1ZSk7XG4gICAgfVxufTtcbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvdHJhbnMtcmVjZWl2ZXItZXZlbnRzb3VyY2UuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3RyYW5zLXJlY2VpdmVyLWh0bWxmaWxlLmpzXG4vKlxuICogKioqKiogQkVHSU4gTElDRU5TRSBCTE9DSyAqKioqKlxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTIgVk13YXJlLCBJbmMuXG4gKlxuICogRm9yIHRoZSBsaWNlbnNlIHNlZSBDT1BZSU5HLlxuICogKioqKiogRU5EIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqL1xuXG52YXIgX2lzX2llX2h0bWxmaWxlX2NhcGFibGU7XG52YXIgaXNJZUh0bWxmaWxlQ2FwYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChfaXNfaWVfaHRtbGZpbGVfY2FwYWJsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICgnQWN0aXZlWE9iamVjdCcgaW4gX3dpbmRvdykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBfaXNfaWVfaHRtbGZpbGVfY2FwYWJsZSA9ICEhbmV3IEFjdGl2ZVhPYmplY3QoJ2h0bWxmaWxlJyk7XG4gICAgICAgICAgICB9IGNhdGNoICh4KSB7fVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX2lzX2llX2h0bWxmaWxlX2NhcGFibGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gX2lzX2llX2h0bWxmaWxlX2NhcGFibGU7XG59O1xuXG5cbnZhciBIdG1sZmlsZVJlY2VpdmVyID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHV0aWxzLnBvbGx1dGVHbG9iYWxOYW1lc3BhY2UoKTtcblxuICAgIHRoYXQuaWQgPSAnYScgKyB1dGlscy5yYW5kb21fc3RyaW5nKDYsIDI2KTtcbiAgICB1cmwgKz0gKCh1cmwuaW5kZXhPZignPycpID09PSAtMSkgPyAnPycgOiAnJicpICtcbiAgICAgICAgJ2M9JyArIGVzY2FwZShXUHJlZml4ICsgJy4nICsgdGhhdC5pZCk7XG5cbiAgICB2YXIgY29uc3RydWN0b3IgPSBpc0llSHRtbGZpbGVDYXBhYmxlKCkgP1xuICAgICAgICB1dGlscy5jcmVhdGVIdG1sZmlsZSA6IHV0aWxzLmNyZWF0ZUlmcmFtZTtcblxuICAgIHZhciBpZnJhbWVPYmo7XG4gICAgX3dpbmRvd1tXUHJlZml4XVt0aGF0LmlkXSA9IHtcbiAgICAgICAgc3RhcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmcmFtZU9iai5sb2FkZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgbWVzc2FnZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIHRoYXQuZGlzcGF0Y2hFdmVudChuZXcgU2ltcGxlRXZlbnQoJ21lc3NhZ2UnLCB7J2RhdGEnOiBkYXRhfSkpO1xuICAgICAgICB9LFxuICAgICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGF0LmlmcmFtZV9jbG9zZSh7fSwgJ25ldHdvcmsnKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhhdC5pZnJhbWVfY2xvc2UgPSBmdW5jdGlvbihlLCBhYm9ydF9yZWFzb24pIHtcbiAgICAgICAgaWZyYW1lT2JqLmNsZWFudXAoKTtcbiAgICAgICAgdGhhdC5pZnJhbWVfY2xvc2UgPSBpZnJhbWVPYmogPSBudWxsO1xuICAgICAgICBkZWxldGUgX3dpbmRvd1tXUHJlZml4XVt0aGF0LmlkXTtcbiAgICAgICAgdGhhdC5kaXNwYXRjaEV2ZW50KG5ldyBTaW1wbGVFdmVudCgnY2xvc2UnLCB7cmVhc29uOiBhYm9ydF9yZWFzb259KSk7XG4gICAgfTtcbiAgICBpZnJhbWVPYmogPSBjb25zdHJ1Y3Rvcih1cmwsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5pZnJhbWVfY2xvc2Uoe30sICdwZXJtYW5lbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbn07XG5cbkh0bWxmaWxlUmVjZWl2ZXIucHJvdG90eXBlID0gbmV3IFJFdmVudFRhcmdldCgpO1xuXG5IdG1sZmlsZVJlY2VpdmVyLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBpZiAodGhhdC5pZnJhbWVfY2xvc2UpIHtcbiAgICAgICAgdGhhdC5pZnJhbWVfY2xvc2Uoe30sICd1c2VyJyk7XG4gICAgfVxufTtcbi8vICAgICAgICAgWypdIEVuZCBvZiBsaWIvdHJhbnMtcmVjZWl2ZXItaHRtbGZpbGUuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3RyYW5zLXJlY2VpdmVyLXhoci5qc1xuLypcbiAqICoqKioqIEJFR0lOIExJQ0VOU0UgQkxPQ0sgKioqKipcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDEyIFZNd2FyZSwgSW5jLlxuICpcbiAqIEZvciB0aGUgbGljZW5zZSBzZWUgQ09QWUlORy5cbiAqICoqKioqIEVORCBMSUNFTlNFIEJMT0NLICoqKioqXG4gKi9cblxudmFyIFhoclJlY2VpdmVyID0gZnVuY3Rpb24odXJsLCBBamF4T2JqZWN0KSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBidWZfcG9zID0gMDtcblxuICAgIHRoYXQueG8gPSBuZXcgQWpheE9iamVjdCgnUE9TVCcsIHVybCwgbnVsbCk7XG4gICAgdGhhdC54by5vbmNodW5rID0gZnVuY3Rpb24oc3RhdHVzLCB0ZXh0KSB7XG4gICAgICAgIGlmIChzdGF0dXMgIT09IDIwMCkgcmV0dXJuO1xuICAgICAgICB3aGlsZSAoMSkge1xuICAgICAgICAgICAgdmFyIGJ1ZiA9IHRleHQuc2xpY2UoYnVmX3Bvcyk7XG4gICAgICAgICAgICB2YXIgcCA9IGJ1Zi5pbmRleE9mKCdcXG4nKTtcbiAgICAgICAgICAgIGlmIChwID09PSAtMSkgYnJlYWs7XG4gICAgICAgICAgICBidWZfcG9zICs9IHArMTtcbiAgICAgICAgICAgIHZhciBtc2cgPSBidWYuc2xpY2UoMCwgcCk7XG4gICAgICAgICAgICB0aGF0LmRpc3BhdGNoRXZlbnQobmV3IFNpbXBsZUV2ZW50KCdtZXNzYWdlJywge2RhdGE6IG1zZ30pKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhhdC54by5vbmZpbmlzaCA9IGZ1bmN0aW9uKHN0YXR1cywgdGV4dCkge1xuICAgICAgICB0aGF0LnhvLm9uY2h1bmsoc3RhdHVzLCB0ZXh0KTtcbiAgICAgICAgdGhhdC54byA9IG51bGw7XG4gICAgICAgIHZhciByZWFzb24gPSBzdGF0dXMgPT09IDIwMCA/ICduZXR3b3JrJyA6ICdwZXJtYW5lbnQnO1xuICAgICAgICB0aGF0LmRpc3BhdGNoRXZlbnQobmV3IFNpbXBsZUV2ZW50KCdjbG9zZScsIHtyZWFzb246IHJlYXNvbn0pKTtcbiAgICB9XG59O1xuXG5YaHJSZWNlaXZlci5wcm90b3R5cGUgPSBuZXcgUkV2ZW50VGFyZ2V0KCk7XG5cblhoclJlY2VpdmVyLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBpZiAodGhhdC54bykge1xuICAgICAgICB0aGF0LnhvLmNsb3NlKCk7XG4gICAgICAgIHRoYXQuZGlzcGF0Y2hFdmVudChuZXcgU2ltcGxlRXZlbnQoJ2Nsb3NlJywge3JlYXNvbjogJ3VzZXInfSkpO1xuICAgICAgICB0aGF0LnhvID0gbnVsbDtcbiAgICB9XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi90cmFucy1yZWNlaXZlci14aHIuanNcblxuXG4vLyAgICAgICAgIFsqXSBJbmNsdWRpbmcgbGliL3Rlc3QtaG9va3MuanNcbi8qXG4gKiAqKioqKiBCRUdJTiBMSUNFTlNFIEJMT0NLICoqKioqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTEtMjAxMiBWTXdhcmUsIEluYy5cbiAqXG4gKiBGb3IgdGhlIGxpY2Vuc2Ugc2VlIENPUFlJTkcuXG4gKiAqKioqKiBFTkQgTElDRU5TRSBCTE9DSyAqKioqKlxuICovXG5cbi8vIEZvciB0ZXN0aW5nXG5Tb2NrSlMuZ2V0VXRpbHMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB1dGlscztcbn07XG5cblNvY2tKUy5nZXRJZnJhbWVUcmFuc3BvcnQgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBJZnJhbWVUcmFuc3BvcnQ7XG59O1xuLy8gICAgICAgICBbKl0gRW5kIG9mIGxpYi90ZXN0LWhvb2tzLmpzXG5cbiAgICAgICAgICAgICAgICAgIHJldHVybiBTb2NrSlM7XG4gICAgICAgICAgfSkoKTtcbmlmICgnX3NvY2tqc19vbmxvYWQnIGluIHdpbmRvdykgc2V0VGltZW91dChfc29ja2pzX29ubG9hZCwgMSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU29ja0pTO1xuLy8gICAgIFsqXSBFbmQgb2YgbGliL2luZGV4LmpzXG5cbi8vIFsqXSBFbmQgb2YgbGliL2FsbC5qc1xuIiwiLy8gQnJvd3NlciBSZXF1ZXN0XG4vL1xuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLyBVTUQgSEVBREVSIFNUQVJUIFxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgLy8gTm9kZS4gRG9lcyBub3Qgd29yayB3aXRoIHN0cmljdCBDb21tb25KUywgYnV0XG4gICAgICAgIC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsXG4gICAgICAgIC8vIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICAgICAgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbi8vIFVNRCBIRUFERVIgRU5EXG5cbnZhciBYSFIgPSBYTUxIdHRwUmVxdWVzdFxuaWYgKCFYSFIpIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBYTUxIdHRwUmVxdWVzdCcpXG5yZXF1ZXN0LmxvZyA9IHtcbiAgJ3RyYWNlJzogbm9vcCwgJ2RlYnVnJzogbm9vcCwgJ2luZm8nOiBub29wLCAnd2Fybic6IG5vb3AsICdlcnJvcic6IG5vb3Bcbn1cblxudmFyIERFRkFVTFRfVElNRU9VVCA9IDMgKiA2MCAqIDEwMDAgLy8gMyBtaW51dGVzXG5cbi8vXG4vLyByZXF1ZXN0XG4vL1xuXG5mdW5jdGlvbiByZXF1ZXN0KG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIC8vIFRoZSBlbnRyeS1wb2ludCB0byB0aGUgQVBJOiBwcmVwIHRoZSBvcHRpb25zIG9iamVjdCBhbmQgcGFzcyB0aGUgcmVhbCB3b3JrIHRvIHJ1bl94aHIuXG4gIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBjYWxsYmFjayBnaXZlbjogJyArIGNhbGxiYWNrKVxuXG4gIGlmKCFvcHRpb25zKVxuICAgIHRocm93IG5ldyBFcnJvcignTm8gb3B0aW9ucyBnaXZlbicpXG5cbiAgdmFyIG9wdGlvbnNfb25SZXNwb25zZSA9IG9wdGlvbnMub25SZXNwb25zZTsgLy8gU2F2ZSB0aGlzIGZvciBsYXRlci5cblxuICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpXG4gICAgb3B0aW9ucyA9IHsndXJpJzpvcHRpb25zfTtcbiAgZWxzZVxuICAgIG9wdGlvbnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTsgLy8gVXNlIGEgZHVwbGljYXRlIGZvciBtdXRhdGluZy5cblxuICBvcHRpb25zLm9uUmVzcG9uc2UgPSBvcHRpb25zX29uUmVzcG9uc2UgLy8gQW5kIHB1dCBpdCBiYWNrLlxuXG4gIGlmIChvcHRpb25zLnZlcmJvc2UpIHJlcXVlc3QubG9nID0gZ2V0TG9nZ2VyKCk7XG5cbiAgaWYob3B0aW9ucy51cmwpIHtcbiAgICBvcHRpb25zLnVyaSA9IG9wdGlvbnMudXJsO1xuICAgIGRlbGV0ZSBvcHRpb25zLnVybDtcbiAgfVxuXG4gIGlmKCFvcHRpb25zLnVyaSAmJiBvcHRpb25zLnVyaSAhPT0gXCJcIilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnVyaSBpcyBhIHJlcXVpcmVkIGFyZ3VtZW50XCIpO1xuXG4gIGlmKHR5cGVvZiBvcHRpb25zLnVyaSAhPSBcInN0cmluZ1wiKVxuICAgIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMudXJpIG11c3QgYmUgYSBzdHJpbmdcIik7XG5cbiAgdmFyIHVuc3VwcG9ydGVkX29wdGlvbnMgPSBbJ3Byb3h5JywgJ19yZWRpcmVjdHNGb2xsb3dlZCcsICdtYXhSZWRpcmVjdHMnLCAnZm9sbG93UmVkaXJlY3QnXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVuc3VwcG9ydGVkX29wdGlvbnMubGVuZ3RoOyBpKyspXG4gICAgaWYob3B0aW9uc1sgdW5zdXBwb3J0ZWRfb3B0aW9uc1tpXSBdKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5cIiArIHVuc3VwcG9ydGVkX29wdGlvbnNbaV0gKyBcIiBpcyBub3Qgc3VwcG9ydGVkXCIpXG5cbiAgb3B0aW9ucy5jYWxsYmFjayA9IGNhbGxiYWNrXG4gIG9wdGlvbnMubWV0aG9kID0gb3B0aW9ucy5tZXRob2QgfHwgJ0dFVCc7XG4gIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgb3B0aW9ucy5ib2R5ICAgID0gb3B0aW9ucy5ib2R5IHx8IG51bGxcbiAgb3B0aW9ucy50aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0IHx8IHJlcXVlc3QuREVGQVVMVF9USU1FT1VUXG5cbiAgaWYob3B0aW9ucy5oZWFkZXJzLmhvc3QpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3B0aW9ucy5oZWFkZXJzLmhvc3QgaXMgbm90IHN1cHBvcnRlZFwiKTtcblxuICBpZihvcHRpb25zLmpzb24pIHtcbiAgICBvcHRpb25zLmhlYWRlcnMuYWNjZXB0ID0gb3B0aW9ucy5oZWFkZXJzLmFjY2VwdCB8fCAnYXBwbGljYXRpb24vanNvbidcbiAgICBpZihvcHRpb25zLm1ldGhvZCAhPT0gJ0dFVCcpXG4gICAgICBvcHRpb25zLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gJ2FwcGxpY2F0aW9uL2pzb24nXG5cbiAgICBpZih0eXBlb2Ygb3B0aW9ucy5qc29uICE9PSAnYm9vbGVhbicpXG4gICAgICBvcHRpb25zLmJvZHkgPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmpzb24pXG4gICAgZWxzZSBpZih0eXBlb2Ygb3B0aW9ucy5ib2R5ICE9PSAnc3RyaW5nJylcbiAgICAgIG9wdGlvbnMuYm9keSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuYm9keSlcbiAgfVxuICBcbiAgLy9CRUdJTiBRUyBIYWNrXG4gIHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc3RyID0gW107XG4gICAgZm9yKHZhciBwIGluIG9iailcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgc3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KHApICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob2JqW3BdKSk7XG4gICAgICB9XG4gICAgcmV0dXJuIHN0ci5qb2luKFwiJlwiKTtcbiAgfVxuICBcbiAgaWYob3B0aW9ucy5xcyl7XG4gICAgdmFyIHFzID0gKHR5cGVvZiBvcHRpb25zLnFzID09ICdzdHJpbmcnKT8gb3B0aW9ucy5xcyA6IHNlcmlhbGl6ZShvcHRpb25zLnFzKTtcbiAgICBpZihvcHRpb25zLnVyaS5pbmRleE9mKCc/JykgIT09IC0xKXsgLy9ubyBnZXQgcGFyYW1zXG4gICAgICAgIG9wdGlvbnMudXJpID0gb3B0aW9ucy51cmkrJyYnK3FzO1xuICAgIH1lbHNleyAvL2V4aXN0aW5nIGdldCBwYXJhbXNcbiAgICAgICAgb3B0aW9ucy51cmkgPSBvcHRpb25zLnVyaSsnPycrcXM7XG4gICAgfVxuICB9XG4gIC8vRU5EIFFTIEhhY2tcbiAgXG4gIC8vQkVHSU4gRk9STSBIYWNrXG4gIHZhciBtdWx0aXBhcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICAvL3RvZG86IHN1cHBvcnQgZmlsZSB0eXBlICh1c2VmdWw/KVxuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICByZXN1bHQuYm91bmRyeSA9ICctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJytNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMTAwMDAwMDAwMCk7XG4gICAgdmFyIGxpbmVzID0gW107XG4gICAgZm9yKHZhciBwIGluIG9iail7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goXG4gICAgICAgICAgICAgICAgJy0tJytyZXN1bHQuYm91bmRyeStcIlxcblwiK1xuICAgICAgICAgICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uOiBmb3JtLWRhdGE7IG5hbWU9XCInK3ArJ1wiJytcIlxcblwiK1xuICAgICAgICAgICAgICAgIFwiXFxuXCIrXG4gICAgICAgICAgICAgICAgb2JqW3BdK1wiXFxuXCJcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGluZXMucHVzaCggJy0tJytyZXN1bHQuYm91bmRyeSsnLS0nICk7XG4gICAgcmVzdWx0LmJvZHkgPSBsaW5lcy5qb2luKCcnKTtcbiAgICByZXN1bHQubGVuZ3RoID0gcmVzdWx0LmJvZHkubGVuZ3RoO1xuICAgIHJlc3VsdC50eXBlID0gJ211bHRpcGFydC9mb3JtLWRhdGE7IGJvdW5kYXJ5PScrcmVzdWx0LmJvdW5kcnk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBcbiAgaWYob3B0aW9ucy5mb3JtKXtcbiAgICBpZih0eXBlb2Ygb3B0aW9ucy5mb3JtID09ICdzdHJpbmcnKSB0aHJvdygnZm9ybSBuYW1lIHVuc3VwcG9ydGVkJyk7XG4gICAgaWYob3B0aW9ucy5tZXRob2QgPT09ICdQT1NUJyl7XG4gICAgICAgIHZhciBlbmNvZGluZyA9IChvcHRpb25zLmVuY29kaW5nIHx8ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBvcHRpb25zLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gZW5jb2Rpbmc7XG4gICAgICAgIHN3aXRjaChlbmNvZGluZyl7XG4gICAgICAgICAgICBjYXNlICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOlxuICAgICAgICAgICAgICAgIG9wdGlvbnMuYm9keSA9IHNlcmlhbGl6ZShvcHRpb25zLmZvcm0pLnJlcGxhY2UoLyUyMC9nLCBcIitcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtdWx0aXBhcnQvZm9ybS1kYXRhJzpcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGkgPSBtdWx0aXBhcnQob3B0aW9ucy5mb3JtKTtcbiAgICAgICAgICAgICAgICAvL29wdGlvbnMuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSA9IG11bHRpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmJvZHkgPSBtdWx0aS5ib2R5O1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVyc1snY29udGVudC10eXBlJ10gPSBtdWx0aS50eXBlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdCA6IHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZW5jb2Rpbmc6JytlbmNvZGluZyk7XG4gICAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy9FTkQgRk9STSBIYWNrXG5cbiAgLy8gSWYgb25SZXNwb25zZSBpcyBib29sZWFuIHRydWUsIGNhbGwgYmFjayBpbW1lZGlhdGVseSB3aGVuIHRoZSByZXNwb25zZSBpcyBrbm93bixcbiAgLy8gbm90IHdoZW4gdGhlIGZ1bGwgcmVxdWVzdCBpcyBjb21wbGV0ZS5cbiAgb3B0aW9ucy5vblJlc3BvbnNlID0gb3B0aW9ucy5vblJlc3BvbnNlIHx8IG5vb3BcbiAgaWYob3B0aW9ucy5vblJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgb3B0aW9ucy5vblJlc3BvbnNlID0gY2FsbGJhY2tcbiAgICBvcHRpb25zLmNhbGxiYWNrID0gbm9vcFxuICB9XG5cbiAgLy8gWFhYIEJyb3dzZXJzIGRvIG5vdCBsaWtlIHRoaXMuXG4gIC8vaWYob3B0aW9ucy5ib2R5KVxuICAvLyAgb3B0aW9ucy5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddID0gb3B0aW9ucy5ib2R5Lmxlbmd0aDtcblxuICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXG4gIGlmKCFvcHRpb25zLmhlYWRlcnMuYXV0aG9yaXphdGlvbiAmJiBvcHRpb25zLmF1dGgpXG4gICAgb3B0aW9ucy5oZWFkZXJzLmF1dGhvcml6YXRpb24gPSAnQmFzaWMgJyArIGI2NF9lbmMob3B0aW9ucy5hdXRoLnVzZXJuYW1lICsgJzonICsgb3B0aW9ucy5hdXRoLnBhc3N3b3JkKTtcblxuICByZXR1cm4gcnVuX3hocihvcHRpb25zKVxufVxuXG52YXIgcmVxX3NlcSA9IDBcbmZ1bmN0aW9uIHJ1bl94aHIob3B0aW9ucykge1xuICB2YXIgeGhyID0gbmV3IFhIUlxuICAgICwgdGltZWRfb3V0ID0gZmFsc2VcbiAgICAsIGlzX2NvcnMgPSBpc19jcm9zc0RvbWFpbihvcHRpb25zLnVyaSlcbiAgICAsIHN1cHBvcnRzX2NvcnMgPSAoJ3dpdGhDcmVkZW50aWFscycgaW4geGhyKVxuXG4gIHJlcV9zZXEgKz0gMVxuICB4aHIuc2VxX2lkID0gcmVxX3NlcVxuICB4aHIuaWQgPSByZXFfc2VxICsgJzogJyArIG9wdGlvbnMubWV0aG9kICsgJyAnICsgb3B0aW9ucy51cmlcbiAgeGhyLl9pZCA9IHhoci5pZCAvLyBJIGtub3cgSSB3aWxsIHR5cGUgXCJfaWRcIiBmcm9tIGhhYml0IGFsbCB0aGUgdGltZS5cblxuICBpZihpc19jb3JzICYmICFzdXBwb3J0c19jb3JzKSB7XG4gICAgdmFyIGNvcnNfZXJyID0gbmV3IEVycm9yKCdCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgY3Jvc3Mtb3JpZ2luIHJlcXVlc3Q6ICcgKyBvcHRpb25zLnVyaSlcbiAgICBjb3JzX2Vyci5jb3JzID0gJ3Vuc3VwcG9ydGVkJ1xuICAgIHJldHVybiBvcHRpb25zLmNhbGxiYWNrKGNvcnNfZXJyLCB4aHIpXG4gIH1cblxuICB4aHIudGltZW91dFRpbWVyID0gc2V0VGltZW91dCh0b29fbGF0ZSwgb3B0aW9ucy50aW1lb3V0KVxuICBmdW5jdGlvbiB0b29fbGF0ZSgpIHtcbiAgICB0aW1lZF9vdXQgPSB0cnVlXG4gICAgdmFyIGVyID0gbmV3IEVycm9yKCdFVElNRURPVVQnKVxuICAgIGVyLmNvZGUgPSAnRVRJTUVET1VUJ1xuICAgIGVyLmR1cmF0aW9uID0gb3B0aW9ucy50aW1lb3V0XG5cbiAgICByZXF1ZXN0LmxvZy5lcnJvcignVGltZW91dCcsIHsgJ2lkJzp4aHIuX2lkLCAnbWlsbGlzZWNvbmRzJzpvcHRpb25zLnRpbWVvdXQgfSlcbiAgICByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhlciwgeGhyKVxuICB9XG5cbiAgLy8gU29tZSBzdGF0ZXMgY2FuIGJlIHNraXBwZWQgb3Zlciwgc28gcmVtZW1iZXIgd2hhdCBpcyBzdGlsbCBpbmNvbXBsZXRlLlxuICB2YXIgZGlkID0geydyZXNwb25zZSc6ZmFsc2UsICdsb2FkaW5nJzpmYWxzZSwgJ2VuZCc6ZmFsc2V9XG5cbiAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG9uX3N0YXRlX2NoYW5nZVxuICB4aHIub3BlbihvcHRpb25zLm1ldGhvZCwgb3B0aW9ucy51cmksIHRydWUpIC8vIGFzeW5jaHJvbm91c1xuICBpZihpc19jb3JzKVxuICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSAhISBvcHRpb25zLndpdGhDcmVkZW50aWFsc1xuICB4aHIuc2VuZChvcHRpb25zLmJvZHkpXG4gIHJldHVybiB4aHJcblxuICBmdW5jdGlvbiBvbl9zdGF0ZV9jaGFuZ2UoZXZlbnQpIHtcbiAgICBpZih0aW1lZF9vdXQpXG4gICAgICByZXR1cm4gcmVxdWVzdC5sb2cuZGVidWcoJ0lnbm9yaW5nIHRpbWVkIG91dCBzdGF0ZSBjaGFuZ2UnLCB7J3N0YXRlJzp4aHIucmVhZHlTdGF0ZSwgJ2lkJzp4aHIuaWR9KVxuXG4gICAgcmVxdWVzdC5sb2cuZGVidWcoJ1N0YXRlIGNoYW5nZScsIHsnc3RhdGUnOnhoci5yZWFkeVN0YXRlLCAnaWQnOnhoci5pZCwgJ3RpbWVkX291dCc6dGltZWRfb3V0fSlcblxuICAgIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuT1BFTkVEKSB7XG4gICAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnUmVxdWVzdCBzdGFydGVkJywgeydpZCc6eGhyLmlkfSlcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zLmhlYWRlcnMpXG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgb3B0aW9ucy5oZWFkZXJzW2tleV0pXG4gICAgfVxuXG4gICAgZWxzZSBpZih4aHIucmVhZHlTdGF0ZSA9PT0gWEhSLkhFQURFUlNfUkVDRUlWRUQpXG4gICAgICBvbl9yZXNwb25zZSgpXG5cbiAgICBlbHNlIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuTE9BRElORykge1xuICAgICAgb25fcmVzcG9uc2UoKVxuICAgICAgb25fbG9hZGluZygpXG4gICAgfVxuXG4gICAgZWxzZSBpZih4aHIucmVhZHlTdGF0ZSA9PT0gWEhSLkRPTkUpIHtcbiAgICAgIG9uX3Jlc3BvbnNlKClcbiAgICAgIG9uX2xvYWRpbmcoKVxuICAgICAgb25fZW5kKClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbl9yZXNwb25zZSgpIHtcbiAgICBpZihkaWQucmVzcG9uc2UpXG4gICAgICByZXR1cm5cblxuICAgIGRpZC5yZXNwb25zZSA9IHRydWVcbiAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnR290IHJlc3BvbnNlJywgeydpZCc6eGhyLmlkLCAnc3RhdHVzJzp4aHIuc3RhdHVzfSlcbiAgICBjbGVhclRpbWVvdXQoeGhyLnRpbWVvdXRUaW1lcilcbiAgICB4aHIuc3RhdHVzQ29kZSA9IHhoci5zdGF0dXMgLy8gTm9kZSByZXF1ZXN0IGNvbXBhdGliaWxpdHlcblxuICAgIC8vIERldGVjdCBmYWlsZWQgQ09SUyByZXF1ZXN0cy5cbiAgICBpZihpc19jb3JzICYmIHhoci5zdGF0dXNDb2RlID09IDApIHtcbiAgICAgIHZhciBjb3JzX2VyciA9IG5ldyBFcnJvcignQ09SUyByZXF1ZXN0IHJlamVjdGVkOiAnICsgb3B0aW9ucy51cmkpXG4gICAgICBjb3JzX2Vyci5jb3JzID0gJ3JlamVjdGVkJ1xuXG4gICAgICAvLyBEbyBub3QgcHJvY2VzcyB0aGlzIHJlcXVlc3QgZnVydGhlci5cbiAgICAgIGRpZC5sb2FkaW5nID0gdHJ1ZVxuICAgICAgZGlkLmVuZCA9IHRydWVcblxuICAgICAgcmV0dXJuIG9wdGlvbnMuY2FsbGJhY2soY29yc19lcnIsIHhocilcbiAgICB9XG5cbiAgICBvcHRpb25zLm9uUmVzcG9uc2UobnVsbCwgeGhyKVxuICB9XG5cbiAgZnVuY3Rpb24gb25fbG9hZGluZygpIHtcbiAgICBpZihkaWQubG9hZGluZylcbiAgICAgIHJldHVyblxuXG4gICAgZGlkLmxvYWRpbmcgPSB0cnVlXG4gICAgcmVxdWVzdC5sb2cuZGVidWcoJ1Jlc3BvbnNlIGJvZHkgbG9hZGluZycsIHsnaWQnOnhoci5pZH0pXG4gICAgLy8gVE9ETzogTWF5YmUgc2ltdWxhdGUgXCJkYXRhXCIgZXZlbnRzIGJ5IHdhdGNoaW5nIHhoci5yZXNwb25zZVRleHRcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uX2VuZCgpIHtcbiAgICBpZihkaWQuZW5kKVxuICAgICAgcmV0dXJuXG5cbiAgICBkaWQuZW5kID0gdHJ1ZVxuICAgIHJlcXVlc3QubG9nLmRlYnVnKCdSZXF1ZXN0IGRvbmUnLCB7J2lkJzp4aHIuaWR9KVxuXG4gICAgeGhyLmJvZHkgPSB4aHIucmVzcG9uc2VUZXh0XG4gICAgaWYob3B0aW9ucy5qc29uKSB7XG4gICAgICB0cnkgICAgICAgIHsgeGhyLmJvZHkgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpIH1cbiAgICAgIGNhdGNoIChlcikgeyByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhlciwgeGhyKSAgICAgICAgfVxuICAgIH1cblxuICAgIG9wdGlvbnMuY2FsbGJhY2sobnVsbCwgeGhyLCB4aHIuYm9keSlcbiAgfVxuXG59IC8vIHJlcXVlc3RcblxucmVxdWVzdC53aXRoQ3JlZGVudGlhbHMgPSBmYWxzZTtcbnJlcXVlc3QuREVGQVVMVF9USU1FT1VUID0gREVGQVVMVF9USU1FT1VUO1xuXG4vL1xuLy8gZGVmYXVsdHNcbi8vXG5cbnJlcXVlc3QuZGVmYXVsdHMgPSBmdW5jdGlvbihvcHRpb25zLCByZXF1ZXN0ZXIpIHtcbiAgdmFyIGRlZiA9IGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICB2YXIgZCA9IGZ1bmN0aW9uIChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICBpZih0eXBlb2YgcGFyYW1zID09PSAnc3RyaW5nJylcbiAgICAgICAgcGFyYW1zID0geyd1cmknOiBwYXJhbXN9O1xuICAgICAgZWxzZSB7XG4gICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGFyYW1zKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHBhcmFtc1tpXSA9PT0gdW5kZWZpbmVkKSBwYXJhbXNbaV0gPSBvcHRpb25zW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gbWV0aG9kKHBhcmFtcywgY2FsbGJhY2spXG4gICAgfVxuICAgIHJldHVybiBkXG4gIH1cbiAgdmFyIGRlID0gZGVmKHJlcXVlc3QpXG4gIGRlLmdldCA9IGRlZihyZXF1ZXN0LmdldClcbiAgZGUucG9zdCA9IGRlZihyZXF1ZXN0LnBvc3QpXG4gIGRlLnB1dCA9IGRlZihyZXF1ZXN0LnB1dClcbiAgZGUuaGVhZCA9IGRlZihyZXF1ZXN0LmhlYWQpXG4gIHJldHVybiBkZVxufVxuXG4vL1xuLy8gSFRUUCBtZXRob2Qgc2hvcnRjdXRzXG4vL1xuXG52YXIgc2hvcnRjdXRzID0gWyAnZ2V0JywgJ3B1dCcsICdwb3N0JywgJ2hlYWQnIF07XG5zaG9ydGN1dHMuZm9yRWFjaChmdW5jdGlvbihzaG9ydGN1dCkge1xuICB2YXIgbWV0aG9kID0gc2hvcnRjdXQudG9VcHBlckNhc2UoKTtcbiAgdmFyIGZ1bmMgICA9IHNob3J0Y3V0LnRvTG93ZXJDYXNlKCk7XG5cbiAgcmVxdWVzdFtmdW5jXSA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICBpZih0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpXG4gICAgICBvcHRzID0geydtZXRob2QnOm1ldGhvZCwgJ3VyaSc6b3B0c307XG4gICAgZWxzZSB7XG4gICAgICBvcHRzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvcHRzKSk7XG4gICAgICBvcHRzLm1ldGhvZCA9IG1ldGhvZDtcbiAgICB9XG5cbiAgICB2YXIgYXJncyA9IFtvcHRzXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGFyZ3VtZW50cywgWzFdKSk7XG4gICAgcmV0dXJuIHJlcXVlc3QuYXBwbHkodGhpcywgYXJncyk7XG4gIH1cbn0pXG5cbi8vXG4vLyBDb3VjaERCIHNob3J0Y3V0XG4vL1xuXG5yZXF1ZXN0LmNvdWNoID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKVxuICAgIG9wdGlvbnMgPSB7J3VyaSc6b3B0aW9uc31cblxuICAvLyBKdXN0IHVzZSB0aGUgcmVxdWVzdCBBUEkgdG8gZG8gSlNPTi5cbiAgb3B0aW9ucy5qc29uID0gdHJ1ZVxuICBpZihvcHRpb25zLmJvZHkpXG4gICAgb3B0aW9ucy5qc29uID0gb3B0aW9ucy5ib2R5XG4gIGRlbGV0ZSBvcHRpb25zLmJvZHlcblxuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3BcblxuICB2YXIgeGhyID0gcmVxdWVzdChvcHRpb25zLCBjb3VjaF9oYW5kbGVyKVxuICByZXR1cm4geGhyXG5cbiAgZnVuY3Rpb24gY291Y2hfaGFuZGxlcihlciwgcmVzcCwgYm9keSkge1xuICAgIGlmKGVyKVxuICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyLCByZXNwLCBib2R5KVxuXG4gICAgaWYoKHJlc3Auc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwLnN0YXR1c0NvZGUgPiAyOTkpICYmIGJvZHkuZXJyb3IpIHtcbiAgICAgIC8vIFRoZSBib2R5IGlzIGEgQ291Y2ggSlNPTiBvYmplY3QgaW5kaWNhdGluZyB0aGUgZXJyb3IuXG4gICAgICBlciA9IG5ldyBFcnJvcignQ291Y2hEQiBlcnJvcjogJyArIChib2R5LmVycm9yLnJlYXNvbiB8fCBib2R5LmVycm9yLmVycm9yKSlcbiAgICAgIGZvciAodmFyIGtleSBpbiBib2R5KVxuICAgICAgICBlcltrZXldID0gYm9keVtrZXldXG4gICAgICByZXR1cm4gY2FsbGJhY2soZXIsIHJlc3AsIGJvZHkpO1xuICAgIH1cblxuICAgIHJldHVybiBjYWxsYmFjayhlciwgcmVzcCwgYm9keSk7XG4gIH1cbn1cblxuLy9cbi8vIFV0aWxpdHlcbi8vXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5mdW5jdGlvbiBnZXRMb2dnZXIoKSB7XG4gIHZhciBsb2dnZXIgPSB7fVxuICAgICwgbGV2ZWxzID0gWyd0cmFjZScsICdkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXVxuICAgICwgbGV2ZWwsIGlcblxuICBmb3IoaSA9IDA7IGkgPCBsZXZlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXZlbCA9IGxldmVsc1tpXVxuXG4gICAgbG9nZ2VyW2xldmVsXSA9IG5vb3BcbiAgICBpZih0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZSAmJiBjb25zb2xlW2xldmVsXSlcbiAgICAgIGxvZ2dlcltsZXZlbF0gPSBmb3JtYXR0ZWQoY29uc29sZSwgbGV2ZWwpXG4gIH1cblxuICByZXR1cm4gbG9nZ2VyXG59XG5cbmZ1bmN0aW9uIGZvcm1hdHRlZChvYmosIG1ldGhvZCkge1xuICByZXR1cm4gZm9ybWF0dGVkX2xvZ2dlclxuXG4gIGZ1bmN0aW9uIGZvcm1hdHRlZF9sb2dnZXIoc3RyLCBjb250ZXh0KSB7XG4gICAgaWYodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKVxuICAgICAgc3RyICs9ICcgJyArIEpTT04uc3RyaW5naWZ5KGNvbnRleHQpXG5cbiAgICByZXR1cm4gb2JqW21ldGhvZF0uY2FsbChvYmosIHN0cilcbiAgfVxufVxuXG4vLyBSZXR1cm4gd2hldGhlciBhIFVSTCBpcyBhIGNyb3NzLWRvbWFpbiByZXF1ZXN0LlxuZnVuY3Rpb24gaXNfY3Jvc3NEb21haW4odXJsKSB7XG4gIHZhciBydXJsID0gL14oW1xcd1xcK1xcLlxcLV0rOikoPzpcXC9cXC8oW15cXC8/IzpdKikoPzo6KFxcZCspKT8pPy9cblxuICAvLyBqUXVlcnkgIzgxMzgsIElFIG1heSB0aHJvdyBhbiBleGNlcHRpb24gd2hlbiBhY2Nlc3NpbmdcbiAgLy8gYSBmaWVsZCBmcm9tIHdpbmRvdy5sb2NhdGlvbiBpZiBkb2N1bWVudC5kb21haW4gaGFzIGJlZW4gc2V0XG4gIHZhciBhamF4TG9jYXRpb25cbiAgdHJ5IHsgYWpheExvY2F0aW9uID0gbG9jYXRpb24uaHJlZiB9XG4gIGNhdGNoIChlKSB7XG4gICAgLy8gVXNlIHRoZSBocmVmIGF0dHJpYnV0ZSBvZiBhbiBBIGVsZW1lbnQgc2luY2UgSUUgd2lsbCBtb2RpZnkgaXQgZ2l2ZW4gZG9jdW1lbnQubG9jYXRpb25cbiAgICBhamF4TG9jYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImFcIiApO1xuICAgIGFqYXhMb2NhdGlvbi5ocmVmID0gXCJcIjtcbiAgICBhamF4TG9jYXRpb24gPSBhamF4TG9jYXRpb24uaHJlZjtcbiAgfVxuXG4gIHZhciBhamF4TG9jUGFydHMgPSBydXJsLmV4ZWMoYWpheExvY2F0aW9uLnRvTG93ZXJDYXNlKCkpIHx8IFtdXG4gICAgLCBwYXJ0cyA9IHJ1cmwuZXhlYyh1cmwudG9Mb3dlckNhc2UoKSApXG5cbiAgdmFyIHJlc3VsdCA9ICEhKFxuICAgIHBhcnRzICYmXG4gICAgKCAgcGFydHNbMV0gIT0gYWpheExvY1BhcnRzWzFdXG4gICAgfHwgcGFydHNbMl0gIT0gYWpheExvY1BhcnRzWzJdXG4gICAgfHwgKHBhcnRzWzNdIHx8IChwYXJ0c1sxXSA9PT0gXCJodHRwOlwiID8gODAgOiA0NDMpKSAhPSAoYWpheExvY1BhcnRzWzNdIHx8IChhamF4TG9jUGFydHNbMV0gPT09IFwiaHR0cDpcIiA/IDgwIDogNDQzKSlcbiAgICApXG4gIClcblxuICAvL2NvbnNvbGUuZGVidWcoJ2lzX2Nyb3NzRG9tYWluKCcrdXJsKycpIC0+ICcgKyByZXN1bHQpXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gTUlUIExpY2Vuc2UgZnJvbSBodHRwOi8vcGhwanMub3JnL2Z1bmN0aW9ucy9iYXNlNjRfZW5jb2RlOjM1OFxuZnVuY3Rpb24gYjY0X2VuYyAoZGF0YSkge1xuICAgIC8vIEVuY29kZXMgc3RyaW5nIHVzaW5nIE1JTUUgYmFzZTY0IGFsZ29yaXRobVxuICAgIHZhciBiNjQgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XCI7XG4gICAgdmFyIG8xLCBvMiwgbzMsIGgxLCBoMiwgaDMsIGg0LCBiaXRzLCBpID0gMCwgYWMgPSAwLCBlbmM9XCJcIiwgdG1wX2FyciA9IFtdO1xuXG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8vIGFzc3VtZSB1dGY4IGRhdGFcbiAgICAvLyBkYXRhID0gdGhpcy51dGY4X2VuY29kZShkYXRhKycnKTtcblxuICAgIGRvIHsgLy8gcGFjayB0aHJlZSBvY3RldHMgaW50byBmb3VyIGhleGV0c1xuICAgICAgICBvMSA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuICAgICAgICBvMiA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuICAgICAgICBvMyA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuXG4gICAgICAgIGJpdHMgPSBvMTw8MTYgfCBvMjw8OCB8IG8zO1xuXG4gICAgICAgIGgxID0gYml0cz4+MTggJiAweDNmO1xuICAgICAgICBoMiA9IGJpdHM+PjEyICYgMHgzZjtcbiAgICAgICAgaDMgPSBiaXRzPj42ICYgMHgzZjtcbiAgICAgICAgaDQgPSBiaXRzICYgMHgzZjtcblxuICAgICAgICAvLyB1c2UgaGV4ZXRzIHRvIGluZGV4IGludG8gYjY0LCBhbmQgYXBwZW5kIHJlc3VsdCB0byBlbmNvZGVkIHN0cmluZ1xuICAgICAgICB0bXBfYXJyW2FjKytdID0gYjY0LmNoYXJBdChoMSkgKyBiNjQuY2hhckF0KGgyKSArIGI2NC5jaGFyQXQoaDMpICsgYjY0LmNoYXJBdChoNCk7XG4gICAgfSB3aGlsZSAoaSA8IGRhdGEubGVuZ3RoKTtcblxuICAgIGVuYyA9IHRtcF9hcnIuam9pbignJyk7XG5cbiAgICBzd2l0Y2ggKGRhdGEubGVuZ3RoICUgMykge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBlbmMgPSBlbmMuc2xpY2UoMCwgLTIpICsgJz09JztcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGVuYyA9IGVuYy5zbGljZSgwLCAtMSkgKyAnPSc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBlbmM7XG59XG4gICAgcmV0dXJuIHJlcXVlc3Q7XG4vL1VNRCBGT09URVIgU1RBUlRcbn0pKTtcbi8vVU1EIEZPT1RFUiBFTkRcbiIsIi8qanNoaW50IGJyb3dzZXI6dHJ1ZSwgbm9kZTp0cnVlKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGVnYXRlO1xuXG4vKipcbiAqIERPTSBldmVudCBkZWxlZ2F0b3JcbiAqXG4gKiBUaGUgZGVsZWdhdG9yIHdpbGwgbGlzdGVuXG4gKiBmb3IgZXZlbnRzIHRoYXQgYnViYmxlIHVwXG4gKiB0byB0aGUgcm9vdCBub2RlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtOb2RlfHN0cmluZ30gW3Jvb3RdIFRoZSByb290IG5vZGUgb3IgYSBzZWxlY3RvciBzdHJpbmcgbWF0Y2hpbmcgdGhlIHJvb3Qgbm9kZVxuICovXG5mdW5jdGlvbiBEZWxlZ2F0ZShyb290KSB7XG5cbiAgLyoqXG4gICAqIE1haW50YWluIGEgbWFwIG9mIGxpc3RlbmVyXG4gICAqIGxpc3RzLCBrZXllZCBieSBldmVudCBuYW1lLlxuICAgKlxuICAgKiBAdHlwZSBPYmplY3RcbiAgICovXG4gIHRoaXMubGlzdGVuZXJNYXAgPSBbe30sIHt9XTtcbiAgaWYgKHJvb3QpIHtcbiAgICB0aGlzLnJvb3Qocm9vdCk7XG4gIH1cblxuICAvKiogQHR5cGUgZnVuY3Rpb24oKSAqL1xuICB0aGlzLmhhbmRsZSA9IERlbGVnYXRlLnByb3RvdHlwZS5oYW5kbGUuYmluZCh0aGlzKTtcbn1cblxuLyoqXG4gKiBTdGFydCBsaXN0ZW5pbmcgZm9yIGV2ZW50c1xuICogb24gdGhlIHByb3ZpZGVkIERPTSBlbGVtZW50XG4gKlxuICogQHBhcmFtICB7Tm9kZXxzdHJpbmd9IFtyb290XSBUaGUgcm9vdCBub2RlIG9yIGEgc2VsZWN0b3Igc3RyaW5nIG1hdGNoaW5nIHRoZSByb290IG5vZGVcbiAqIEByZXR1cm5zIHtEZWxlZ2F0ZX0gVGhpcyBtZXRob2QgaXMgY2hhaW5hYmxlXG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5yb290ID0gZnVuY3Rpb24ocm9vdCkge1xuICB2YXIgbGlzdGVuZXJNYXAgPSB0aGlzLmxpc3RlbmVyTWFwO1xuICB2YXIgZXZlbnRUeXBlO1xuXG4gIC8vIFJlbW92ZSBtYXN0ZXIgZXZlbnQgbGlzdGVuZXJzXG4gIGlmICh0aGlzLnJvb3RFbGVtZW50KSB7XG4gICAgZm9yIChldmVudFR5cGUgaW4gbGlzdGVuZXJNYXBbMV0pIHtcbiAgICAgIGlmIChsaXN0ZW5lck1hcFsxXS5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKSB7XG4gICAgICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChldmVudFR5cGUgaW4gbGlzdGVuZXJNYXBbMF0pIHtcbiAgICAgIGlmIChsaXN0ZW5lck1hcFswXS5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKSB7XG4gICAgICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgbm8gcm9vdCBvciByb290IGlzIG5vdFxuICAvLyBhIGRvbSBub2RlLCB0aGVuIHJlbW92ZSBpbnRlcm5hbFxuICAvLyByb290IHJlZmVyZW5jZSBhbmQgZXhpdCBoZXJlXG4gIGlmICghcm9vdCB8fCAhcm9vdC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgaWYgKHRoaXMucm9vdEVsZW1lbnQpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnJvb3RFbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcm9vdCBub2RlIGF0IHdoaWNoXG4gICAqIGxpc3RlbmVycyBhcmUgYXR0YWNoZWQuXG4gICAqXG4gICAqIEB0eXBlIE5vZGVcbiAgICovXG4gIHRoaXMucm9vdEVsZW1lbnQgPSByb290O1xuXG4gIC8vIFNldCB1cCBtYXN0ZXIgZXZlbnQgbGlzdGVuZXJzXG4gIGZvciAoZXZlbnRUeXBlIGluIGxpc3RlbmVyTWFwWzFdKSB7XG4gICAgaWYgKGxpc3RlbmVyTWFwWzFdLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB0cnVlKTtcbiAgICB9XG4gIH1cbiAgZm9yIChldmVudFR5cGUgaW4gbGlzdGVuZXJNYXBbMF0pIHtcbiAgICBpZiAobGlzdGVuZXJNYXBbMF0uaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSkge1xuICAgICAgdGhpcy5yb290RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5oYW5kbGUsIGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZVxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUuY2FwdHVyZUZvclR5cGUgPSBmdW5jdGlvbihldmVudFR5cGUpIHtcbiAgcmV0dXJuIFsnYmx1cicsICdlcnJvcicsICdmb2N1cycsICdsb2FkJywgJ3Jlc2l6ZScsICdzY3JvbGwnXS5pbmRleE9mKGV2ZW50VHlwZSkgIT09IC0xO1xufTtcblxuLyoqXG4gKiBBdHRhY2ggYSBoYW5kbGVyIHRvIG9uZVxuICogZXZlbnQgZm9yIGFsbCBlbGVtZW50c1xuICogdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3IsXG4gKiBub3cgb3IgaW4gdGhlIGZ1dHVyZVxuICpcbiAqIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHJlY2VpdmVzXG4gKiB0aHJlZSBhcmd1bWVudHM6IHRoZSBET00gZXZlbnRcbiAqIG9iamVjdCwgdGhlIG5vZGUgdGhhdCBtYXRjaGVkXG4gKiB0aGUgc2VsZWN0b3Igd2hpbGUgdGhlIGV2ZW50XG4gKiB3YXMgYnViYmxpbmcgYW5kIGEgcmVmZXJlbmNlXG4gKiB0byBpdHNlbGYuIFdpdGhpbiB0aGUgaGFuZGxlcixcbiAqICd0aGlzJyBpcyBlcXVhbCB0byB0aGUgc2Vjb25kXG4gKiBhcmd1bWVudC5cbiAqXG4gKiBUaGUgbm9kZSB0aGF0IGFjdHVhbGx5IHJlY2VpdmVkXG4gKiB0aGUgZXZlbnQgY2FuIGJlIGFjY2Vzc2VkIHZpYVxuICogJ2V2ZW50LnRhcmdldCcuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSBMaXN0ZW4gZm9yIHRoZXNlIGV2ZW50c1xuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBzZWxlY3RvciBPbmx5IGhhbmRsZSBldmVudHMgb24gZWxlbWVudHMgbWF0Y2hpbmcgdGhpcyBzZWxlY3RvciwgaWYgdW5kZWZpbmVkIG1hdGNoIHJvb3QgZWxlbWVudFxuICogQHBhcmFtIHtmdW5jdGlvbigpfSBoYW5kbGVyIEhhbmRsZXIgZnVuY3Rpb24gLSBldmVudCBkYXRhIHBhc3NlZCBoZXJlIHdpbGwgYmUgaW4gZXZlbnQuZGF0YVxuICogQHBhcmFtIHtPYmplY3R9IFtldmVudERhdGFdIERhdGEgdG8gcGFzcyBpbiBldmVudC5kYXRhXG4gKiBAcmV0dXJucyB7RGVsZWdhdGV9IFRoaXMgbWV0aG9kIGlzIGNoYWluYWJsZVxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudFR5cGUsIHNlbGVjdG9yLCBoYW5kbGVyLCB1c2VDYXB0dXJlKSB7XG4gIHZhciByb290LCBsaXN0ZW5lck1hcCwgbWF0Y2hlciwgbWF0Y2hlclBhcmFtO1xuXG4gIGlmICghZXZlbnRUeXBlKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCB0eXBlOiAnICsgZXZlbnRUeXBlKTtcbiAgfVxuXG4gIC8vIGhhbmRsZXIgY2FuIGJlIHBhc3NlZCBhc1xuICAvLyB0aGUgc2Vjb25kIG9yIHRoaXJkIGFyZ3VtZW50XG4gIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICB1c2VDYXB0dXJlID0gaGFuZGxlcjtcbiAgICBoYW5kbGVyID0gc2VsZWN0b3I7XG4gICAgc2VsZWN0b3IgPSBudWxsO1xuICB9XG5cbiAgLy8gRmFsbGJhY2sgdG8gc2Vuc2libGUgZGVmYXVsdHNcbiAgLy8gaWYgdXNlQ2FwdHVyZSBub3Qgc2V0XG4gIGlmICh1c2VDYXB0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICB1c2VDYXB0dXJlID0gdGhpcy5jYXB0dXJlRm9yVHlwZShldmVudFR5cGUpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSGFuZGxlciBtdXN0IGJlIGEgdHlwZSBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgcm9vdCA9IHRoaXMucm9vdEVsZW1lbnQ7XG4gIGxpc3RlbmVyTWFwID0gdGhpcy5saXN0ZW5lck1hcFt1c2VDYXB0dXJlID8gMSA6IDBdO1xuXG4gIC8vIEFkZCBtYXN0ZXIgaGFuZGxlciBmb3IgdHlwZSBpZiBub3QgY3JlYXRlZCB5ZXRcbiAgaWYgKCFsaXN0ZW5lck1hcFtldmVudFR5cGVdKSB7XG4gICAgaWYgKHJvb3QpIHtcbiAgICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB1c2VDYXB0dXJlKTtcbiAgICB9XG4gICAgbGlzdGVuZXJNYXBbZXZlbnRUeXBlXSA9IFtdO1xuICB9XG5cbiAgaWYgKCFzZWxlY3Rvcikge1xuICAgIG1hdGNoZXJQYXJhbSA9IG51bGw7XG5cbiAgICAvLyBDT01QTEVYIC0gbWF0Y2hlc1Jvb3QgbmVlZHMgdG8gaGF2ZSBhY2Nlc3MgdG9cbiAgICAvLyB0aGlzLnJvb3RFbGVtZW50LCBzbyBiaW5kIHRoZSBmdW5jdGlvbiB0byB0aGlzLlxuICAgIG1hdGNoZXIgPSBtYXRjaGVzUm9vdC5iaW5kKHRoaXMpO1xuXG4gIC8vIENvbXBpbGUgYSBtYXRjaGVyIGZvciB0aGUgZ2l2ZW4gc2VsZWN0b3JcbiAgfSBlbHNlIGlmICgvXlthLXpdKyQvaS50ZXN0KHNlbGVjdG9yKSkge1xuICAgIG1hdGNoZXJQYXJhbSA9IHNlbGVjdG9yO1xuICAgIG1hdGNoZXIgPSBtYXRjaGVzVGFnO1xuICB9IGVsc2UgaWYgKC9eI1thLXowLTlcXC1fXSskL2kudGVzdChzZWxlY3RvcikpIHtcbiAgICBtYXRjaGVyUGFyYW0gPSBzZWxlY3Rvci5zbGljZSgxKTtcbiAgICBtYXRjaGVyID0gbWF0Y2hlc0lkO1xuICB9IGVsc2Uge1xuICAgIG1hdGNoZXJQYXJhbSA9IHNlbGVjdG9yO1xuICAgIG1hdGNoZXIgPSBtYXRjaGVzO1xuICB9XG5cbiAgLy8gQWRkIHRvIHRoZSBsaXN0IG9mIGxpc3RlbmVyc1xuICBsaXN0ZW5lck1hcFtldmVudFR5cGVdLnB1c2goe1xuICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICBoYW5kbGVyOiBoYW5kbGVyLFxuICAgIG1hdGNoZXI6IG1hdGNoZXIsXG4gICAgbWF0Y2hlclBhcmFtOiBtYXRjaGVyUGFyYW1cbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBldmVudCBoYW5kbGVyXG4gKiBmb3IgZWxlbWVudHMgdGhhdCBtYXRjaFxuICogdGhlIHNlbGVjdG9yLCBmb3JldmVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IFtldmVudFR5cGVdIFJlbW92ZSBoYW5kbGVycyBmb3IgZXZlbnRzIG1hdGNoaW5nIHRoaXMgdHlwZSwgY29uc2lkZXJpbmcgdGhlIG90aGVyIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBbc2VsZWN0b3JdIElmIHRoaXMgcGFyYW1ldGVyIGlzIG9taXR0ZWQsIG9ubHkgaGFuZGxlcnMgd2hpY2ggbWF0Y2ggdGhlIG90aGVyIHR3byB3aWxsIGJlIHJlbW92ZWRcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oKX0gW2hhbmRsZXJdIElmIHRoaXMgcGFyYW1ldGVyIGlzIG9taXR0ZWQsIG9ubHkgaGFuZGxlcnMgd2hpY2ggbWF0Y2ggdGhlIHByZXZpb3VzIHR3byB3aWxsIGJlIHJlbW92ZWRcbiAqIEByZXR1cm5zIHtEZWxlZ2F0ZX0gVGhpcyBtZXRob2QgaXMgY2hhaW5hYmxlXG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudFR5cGUsIHNlbGVjdG9yLCBoYW5kbGVyLCB1c2VDYXB0dXJlKSB7XG4gIHZhciBpLCBsaXN0ZW5lciwgbGlzdGVuZXJNYXAsIGxpc3RlbmVyTGlzdCwgc2luZ2xlRXZlbnRUeXBlO1xuXG4gIC8vIEhhbmRsZXIgY2FuIGJlIHBhc3NlZCBhc1xuICAvLyB0aGUgc2Vjb25kIG9yIHRoaXJkIGFyZ3VtZW50XG4gIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICB1c2VDYXB0dXJlID0gaGFuZGxlcjtcbiAgICBoYW5kbGVyID0gc2VsZWN0b3I7XG4gICAgc2VsZWN0b3IgPSBudWxsO1xuICB9XG5cbiAgLy8gSWYgdXNlQ2FwdHVyZSBub3Qgc2V0LCByZW1vdmVcbiAgLy8gYWxsIGV2ZW50IGxpc3RlbmVyc1xuICBpZiAodXNlQ2FwdHVyZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5vZmYoZXZlbnRUeXBlLCBzZWxlY3RvciwgaGFuZGxlciwgdHJ1ZSk7XG4gICAgdGhpcy5vZmYoZXZlbnRUeXBlLCBzZWxlY3RvciwgaGFuZGxlciwgZmFsc2UpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJNYXAgPSB0aGlzLmxpc3RlbmVyTWFwW3VzZUNhcHR1cmUgPyAxIDogMF07XG4gIGlmICghZXZlbnRUeXBlKSB7XG4gICAgZm9yIChzaW5nbGVFdmVudFR5cGUgaW4gbGlzdGVuZXJNYXApIHtcbiAgICAgIGlmIChsaXN0ZW5lck1hcC5oYXNPd25Qcm9wZXJ0eShzaW5nbGVFdmVudFR5cGUpKSB7XG4gICAgICAgIHRoaXMub2ZmKHNpbmdsZUV2ZW50VHlwZSwgc2VsZWN0b3IsIGhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJMaXN0ID0gbGlzdGVuZXJNYXBbZXZlbnRUeXBlXTtcbiAgaWYgKCFsaXN0ZW5lckxpc3QgfHwgIWxpc3RlbmVyTGlzdC5sZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIFJlbW92ZSBvbmx5IHBhcmFtZXRlciBtYXRjaGVzXG4gIC8vIGlmIHNwZWNpZmllZFxuICBmb3IgKGkgPSBsaXN0ZW5lckxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBsaXN0ZW5lciA9IGxpc3RlbmVyTGlzdFtpXTtcblxuICAgIGlmICgoIXNlbGVjdG9yIHx8IHNlbGVjdG9yID09PSBsaXN0ZW5lci5zZWxlY3RvcikgJiYgKCFoYW5kbGVyIHx8IGhhbmRsZXIgPT09IGxpc3RlbmVyLmhhbmRsZXIpKSB7XG4gICAgICBsaXN0ZW5lckxpc3Quc3BsaWNlKGksIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFsbCBsaXN0ZW5lcnMgcmVtb3ZlZFxuICBpZiAoIWxpc3RlbmVyTGlzdC5sZW5ndGgpIHtcbiAgICBkZWxldGUgbGlzdGVuZXJNYXBbZXZlbnRUeXBlXTtcblxuICAgIC8vIFJlbW92ZSB0aGUgbWFpbiBoYW5kbGVyXG4gICAgaWYgKHRoaXMucm9vdEVsZW1lbnQpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB1c2VDYXB0dXJlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBIYW5kbGUgYW4gYXJiaXRyYXJ5IGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgaSwgbCwgdHlwZSA9IGV2ZW50LnR5cGUsIHJvb3QsIHBoYXNlLCBsaXN0ZW5lciwgcmV0dXJuZWQsIGxpc3RlbmVyTGlzdCA9IFtdLCB0YXJnZXQsIC8qKiBAY29uc3QgKi8gRVZFTlRJR05PUkUgPSAnZnRMYWJzRGVsZWdhdGVJZ25vcmUnO1xuXG4gIGlmIChldmVudFtFVkVOVElHTk9SRV0gPT09IHRydWUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG5cbiAgLy8gSGFyZGNvZGUgdmFsdWUgb2YgTm9kZS5URVhUX05PREVcbiAgLy8gYXMgbm90IGRlZmluZWQgaW4gSUU4XG4gIGlmICh0YXJnZXQubm9kZVR5cGUgPT09IDMpIHtcbiAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgfVxuXG4gIHJvb3QgPSB0aGlzLnJvb3RFbGVtZW50O1xuXG4gIHBoYXNlID0gZXZlbnQuZXZlbnRQaGFzZSB8fCAoIGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCA/IDMgOiAyICk7XG4gIFxuICBzd2l0Y2ggKHBoYXNlKSB7XG4gICAgY2FzZSAxOiAvL0V2ZW50LkNBUFRVUklOR19QSEFTRTpcbiAgICAgIGxpc3RlbmVyTGlzdCA9IHRoaXMubGlzdGVuZXJNYXBbMV1bdHlwZV07XG4gICAgYnJlYWs7XG4gICAgY2FzZSAyOiAvL0V2ZW50LkFUX1RBUkdFVDpcbiAgICAgIGlmICh0aGlzLmxpc3RlbmVyTWFwWzBdICYmIHRoaXMubGlzdGVuZXJNYXBbMF1bdHlwZV0pIGxpc3RlbmVyTGlzdCA9IGxpc3RlbmVyTGlzdC5jb25jYXQodGhpcy5saXN0ZW5lck1hcFswXVt0eXBlXSk7XG4gICAgICBpZiAodGhpcy5saXN0ZW5lck1hcFsxXSAmJiB0aGlzLmxpc3RlbmVyTWFwWzFdW3R5cGVdKSBsaXN0ZW5lckxpc3QgPSBsaXN0ZW5lckxpc3QuY29uY2F0KHRoaXMubGlzdGVuZXJNYXBbMV1bdHlwZV0pO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgMzogLy9FdmVudC5CVUJCTElOR19QSEFTRTpcbiAgICAgIGxpc3RlbmVyTGlzdCA9IHRoaXMubGlzdGVuZXJNYXBbMF1bdHlwZV07XG4gICAgYnJlYWs7XG4gIH1cblxuICAvLyBOZWVkIHRvIGNvbnRpbnVvdXNseSBjaGVja1xuICAvLyB0aGF0IHRoZSBzcGVjaWZpYyBsaXN0IGlzXG4gIC8vIHN0aWxsIHBvcHVsYXRlZCBpbiBjYXNlIG9uZVxuICAvLyBvZiB0aGUgY2FsbGJhY2tzIGFjdHVhbGx5XG4gIC8vIGNhdXNlcyB0aGUgbGlzdCB0byBiZSBkZXN0cm95ZWQuXG4gIGwgPSBsaXN0ZW5lckxpc3QubGVuZ3RoO1xuICB3aGlsZSAodGFyZ2V0ICYmIGwpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICBsaXN0ZW5lciA9IGxpc3RlbmVyTGlzdFtpXTtcblxuICAgICAgLy8gQmFpbCBmcm9tIHRoaXMgbG9vcCBpZlxuICAgICAgLy8gdGhlIGxlbmd0aCBjaGFuZ2VkIGFuZFxuICAgICAgLy8gbm8gbW9yZSBsaXN0ZW5lcnMgYXJlXG4gICAgICAvLyBkZWZpbmVkIGJldHdlZW4gaSBhbmQgbC5cbiAgICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGZvciBtYXRjaCBhbmQgZmlyZVxuICAgICAgLy8gdGhlIGV2ZW50IGlmIHRoZXJlJ3Mgb25lXG4gICAgICAvL1xuICAgICAgLy8gVE9ETzpNQ0c6MjAxMjAxMTc6IE5lZWQgYSB3YXlcbiAgICAgIC8vIHRvIGNoZWNrIGlmIGV2ZW50I3N0b3BJbW1lZGlhdGVQcm9wYWdhdGlvblxuICAgICAgLy8gd2FzIGNhbGxlZC4gSWYgc28sIGJyZWFrIGJvdGggbG9vcHMuXG4gICAgICBpZiAobGlzdGVuZXIubWF0Y2hlci5jYWxsKHRhcmdldCwgbGlzdGVuZXIubWF0Y2hlclBhcmFtLCB0YXJnZXQpKSB7XG4gICAgICAgIHJldHVybmVkID0gdGhpcy5maXJlKGV2ZW50LCB0YXJnZXQsIGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gU3RvcCBwcm9wYWdhdGlvbiB0byBzdWJzZXF1ZW50XG4gICAgICAvLyBjYWxsYmFja3MgaWYgdGhlIGNhbGxiYWNrIHJldHVybmVkXG4gICAgICAvLyBmYWxzZVxuICAgICAgaWYgKHJldHVybmVkID09PSBmYWxzZSkge1xuICAgICAgICBldmVudFtFVkVOVElHTk9SRV0gPSB0cnVlO1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETzpNQ0c6MjAxMjAxMTc6IE5lZWQgYSB3YXkgdG9cbiAgICAvLyBjaGVjayBpZiBldmVudCNzdG9wUHJvcGFnYXRpb25cbiAgICAvLyB3YXMgY2FsbGVkLiBJZiBzbywgYnJlYWsgbG9vcGluZ1xuICAgIC8vIHRocm91Z2ggdGhlIERPTS4gU3RvcCBpZiB0aGVcbiAgICAvLyBkZWxlZ2F0aW9uIHJvb3QgaGFzIGJlZW4gcmVhY2hlZFxuICAgIGlmICh0YXJnZXQgPT09IHJvb3QpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGwgPSBsaXN0ZW5lckxpc3QubGVuZ3RoO1xuICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnRFbGVtZW50O1xuICB9XG59O1xuXG4vKipcbiAqIEZpcmUgYSBsaXN0ZW5lciBvbiBhIHRhcmdldC5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7T2JqZWN0fSBsaXN0ZW5lclxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5maXJlID0gZnVuY3Rpb24oZXZlbnQsIHRhcmdldCwgbGlzdGVuZXIpIHtcbiAgcmV0dXJuIGxpc3RlbmVyLmhhbmRsZXIuY2FsbCh0YXJnZXQsIGV2ZW50LCB0YXJnZXQpO1xufTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIGVsZW1lbnRcbiAqIG1hdGNoZXMgYSBnZW5lcmljIHNlbGVjdG9yLlxuICpcbiAqIEB0eXBlIGZ1bmN0aW9uKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciBBIENTUyBzZWxlY3RvclxuICovXG52YXIgbWF0Y2hlcyA9IChmdW5jdGlvbihlbCkge1xuICBpZiAoIWVsKSByZXR1cm47XG4gIHZhciBwID0gZWwucHJvdG90eXBlO1xuICByZXR1cm4gKHAubWF0Y2hlcyB8fCBwLm1hdGNoZXNTZWxlY3RvciB8fCBwLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBwLm1vek1hdGNoZXNTZWxlY3RvciB8fCBwLm1zTWF0Y2hlc1NlbGVjdG9yIHx8IHAub01hdGNoZXNTZWxlY3Rvcik7XG59KEVsZW1lbnQpKTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIGVsZW1lbnRcbiAqIG1hdGNoZXMgYSB0YWcgc2VsZWN0b3IuXG4gKlxuICogVGFncyBhcmUgTk9UIGNhc2Utc2Vuc2l0aXZlLFxuICogZXhjZXB0IGluIFhNTCAoYW5kIFhNTC1iYXNlZFxuICogbGFuZ3VhZ2VzIHN1Y2ggYXMgWEhUTUwpLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lIFRoZSB0YWcgbmFtZSB0byB0ZXN0IGFnYWluc3RcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0byB0ZXN0IHdpdGhcbiAqIEByZXR1cm5zIGJvb2xlYW5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hlc1RhZyh0YWdOYW1lLCBlbGVtZW50KSB7XG4gIHJldHVybiB0YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYW4gZWxlbWVudFxuICogbWF0Y2hlcyB0aGUgcm9vdC5cbiAqXG4gKiBAcGFyYW0gez9TdHJpbmd9IHNlbGVjdG9yIEluIHRoaXMgY2FzZSB0aGlzIGlzIGFsd2F5cyBwYXNzZWQgdGhyb3VnaCBhcyBudWxsIGFuZCBub3QgdXNlZFxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHRlc3Qgd2l0aFxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5mdW5jdGlvbiBtYXRjaGVzUm9vdChzZWxlY3RvciwgZWxlbWVudCkge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSovXG4gIGlmICh0aGlzLnJvb3RFbGVtZW50ID09PSB3aW5kb3cpIHJldHVybiBlbGVtZW50ID09PSBkb2N1bWVudDtcbiAgcmV0dXJuIHRoaXMucm9vdEVsZW1lbnQgPT09IGVsZW1lbnQ7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgSUQgb2ZcbiAqIHRoZSBlbGVtZW50IGluICd0aGlzJ1xuICogbWF0Y2hlcyB0aGUgZ2l2ZW4gSUQuXG4gKlxuICogSURzIGFyZSBjYXNlLXNlbnNpdGl2ZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIElEIHRvIHRlc3QgYWdhaW5zdFxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHRlc3Qgd2l0aFxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5mdW5jdGlvbiBtYXRjaGVzSWQoaWQsIGVsZW1lbnQpIHtcbiAgcmV0dXJuIGlkID09PSBlbGVtZW50LmlkO1xufVxuXG4vKipcbiAqIFNob3J0IGhhbmQgZm9yIG9mZigpXG4gKiBhbmQgcm9vdCgpLCBpZSBib3RoXG4gKiB3aXRoIG5vIHBhcmFtZXRlcnNcbiAqXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5vZmYoKTtcbiAgdGhpcy5yb290KCk7XG59O1xuIiwiLypqc2hpbnQgYnJvd3Nlcjp0cnVlLCBub2RlOnRydWUqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHByZXNlcnZlIENyZWF0ZSBhbmQgbWFuYWdlIGEgRE9NIGV2ZW50IGRlbGVnYXRvci5cbiAqXG4gKiBAdmVyc2lvbiAwLjMuMFxuICogQGNvZGluZ3N0YW5kYXJkIGZ0bGFicy1qc3YyXG4gKiBAY29weXJpZ2h0IFRoZSBGaW5hbmNpYWwgVGltZXMgTGltaXRlZCBbQWxsIFJpZ2h0cyBSZXNlcnZlZF1cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChzZWUgTElDRU5TRS50eHQpXG4gKi9cbnZhciBEZWxlZ2F0ZSA9IHJlcXVpcmUoJy4vZGVsZWdhdGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihyb290KSB7XG4gIHJldHVybiBuZXcgRGVsZWdhdGUocm9vdCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5EZWxlZ2F0ZSA9IERlbGVnYXRlO1xuIiwiXG4vKipcbiAqIEV4cG9zZSBgcGFyc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2U7XG5cbi8qKlxuICogVGVzdHMgZm9yIGJyb3dzZXIgc3VwcG9ydC5cbiAqL1xuXG52YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4vLyBTZXR1cFxuZGl2LmlubmVySFRNTCA9ICcgIDxsaW5rLz48dGFibGU+PC90YWJsZT48YSBocmVmPVwiL2FcIj5hPC9hPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIi8+Jztcbi8vIE1ha2Ugc3VyZSB0aGF0IGxpbmsgZWxlbWVudHMgZ2V0IHNlcmlhbGl6ZWQgY29ycmVjdGx5IGJ5IGlubmVySFRNTFxuLy8gVGhpcyByZXF1aXJlcyBhIHdyYXBwZXIgZWxlbWVudCBpbiBJRVxudmFyIGlubmVySFRNTEJ1ZyA9ICFkaXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2xpbmsnKS5sZW5ndGg7XG5kaXYgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogV3JhcCBtYXAgZnJvbSBqcXVlcnkuXG4gKi9cblxudmFyIG1hcCA9IHtcbiAgbGVnZW5kOiBbMSwgJzxmaWVsZHNldD4nLCAnPC9maWVsZHNldD4nXSxcbiAgdHI6IFsyLCAnPHRhYmxlPjx0Ym9keT4nLCAnPC90Ym9keT48L3RhYmxlPiddLFxuICBjb2w6IFsyLCAnPHRhYmxlPjx0Ym9keT48L3Rib2R5Pjxjb2xncm91cD4nLCAnPC9jb2xncm91cD48L3RhYmxlPiddLFxuICAvLyBmb3Igc2NyaXB0L2xpbmsvc3R5bGUgdGFncyB0byB3b3JrIGluIElFNi04LCB5b3UgaGF2ZSB0byB3cmFwXG4gIC8vIGluIGEgZGl2IHdpdGggYSBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXIgaW4gZnJvbnQsIGhhIVxuICBfZGVmYXVsdDogaW5uZXJIVE1MQnVnID8gWzEsICdYPGRpdj4nLCAnPC9kaXY+J10gOiBbMCwgJycsICcnXVxufTtcblxubWFwLnRkID1cbm1hcC50aCA9IFszLCAnPHRhYmxlPjx0Ym9keT48dHI+JywgJzwvdHI+PC90Ym9keT48L3RhYmxlPiddO1xuXG5tYXAub3B0aW9uID1cbm1hcC5vcHRncm91cCA9IFsxLCAnPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+JywgJzwvc2VsZWN0PiddO1xuXG5tYXAudGhlYWQgPVxubWFwLnRib2R5ID1cbm1hcC5jb2xncm91cCA9XG5tYXAuY2FwdGlvbiA9XG5tYXAudGZvb3QgPSBbMSwgJzx0YWJsZT4nLCAnPC90YWJsZT4nXTtcblxubWFwLnRleHQgPVxubWFwLmNpcmNsZSA9XG5tYXAuZWxsaXBzZSA9XG5tYXAubGluZSA9XG5tYXAucGF0aCA9XG5tYXAucG9seWdvbiA9XG5tYXAucG9seWxpbmUgPVxubWFwLnJlY3QgPSBbMSwgJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZlcnNpb249XCIxLjFcIj4nLCc8L3N2Zz4nXTtcblxuLyoqXG4gKiBQYXJzZSBgaHRtbGAgYW5kIHJldHVybiBhIERPTSBOb2RlIGluc3RhbmNlLCB3aGljaCBjb3VsZCBiZSBhIFRleHROb2RlLFxuICogSFRNTCBET00gTm9kZSBvZiBzb21lIGtpbmQgKDxkaXY+IGZvciBleGFtcGxlKSwgb3IgYSBEb2N1bWVudEZyYWdtZW50XG4gKiBpbnN0YW5jZSwgZGVwZW5kaW5nIG9uIHRoZSBjb250ZW50cyBvZiB0aGUgYGh0bWxgIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbCAtIEhUTUwgc3RyaW5nIHRvIFwiZG9taWZ5XCJcbiAqIEBwYXJhbSB7RG9jdW1lbnR9IGRvYyAtIFRoZSBgZG9jdW1lbnRgIGluc3RhbmNlIHRvIGNyZWF0ZSB0aGUgTm9kZSBmb3JcbiAqIEByZXR1cm4ge0RPTU5vZGV9IHRoZSBUZXh0Tm9kZSwgRE9NIE5vZGUsIG9yIERvY3VtZW50RnJhZ21lbnQgaW5zdGFuY2VcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKGh0bWwsIGRvYykge1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIGh0bWwpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1N0cmluZyBleHBlY3RlZCcpO1xuXG4gIC8vIGRlZmF1bHQgdG8gdGhlIGdsb2JhbCBgZG9jdW1lbnRgIG9iamVjdFxuICBpZiAoIWRvYykgZG9jID0gZG9jdW1lbnQ7XG5cbiAgLy8gdGFnIG5hbWVcbiAgdmFyIG0gPSAvPChbXFx3Ol0rKS8uZXhlYyhodG1sKTtcbiAgaWYgKCFtKSByZXR1cm4gZG9jLmNyZWF0ZVRleHROb2RlKGh0bWwpO1xuXG4gIGh0bWwgPSBodG1sLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTsgLy8gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuXG4gIHZhciB0YWcgPSBtWzFdO1xuXG4gIC8vIGJvZHkgc3VwcG9ydFxuICBpZiAodGFnID09ICdib2R5Jykge1xuICAgIHZhciBlbCA9IGRvYy5jcmVhdGVFbGVtZW50KCdodG1sJyk7XG4gICAgZWwuaW5uZXJIVE1MID0gaHRtbDtcbiAgICByZXR1cm4gZWwucmVtb3ZlQ2hpbGQoZWwubGFzdENoaWxkKTtcbiAgfVxuXG4gIC8vIHdyYXAgbWFwXG4gIHZhciB3cmFwID0gbWFwW3RhZ10gfHwgbWFwLl9kZWZhdWx0O1xuICB2YXIgZGVwdGggPSB3cmFwWzBdO1xuICB2YXIgcHJlZml4ID0gd3JhcFsxXTtcbiAgdmFyIHN1ZmZpeCA9IHdyYXBbMl07XG4gIHZhciBlbCA9IGRvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZWwuaW5uZXJIVE1MID0gcHJlZml4ICsgaHRtbCArIHN1ZmZpeDtcbiAgd2hpbGUgKGRlcHRoLS0pIGVsID0gZWwubGFzdENoaWxkO1xuXG4gIC8vIG9uZSBlbGVtZW50XG4gIGlmIChlbC5maXJzdENoaWxkID09IGVsLmxhc3RDaGlsZCkge1xuICAgIHJldHVybiBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcbiAgfVxuXG4gIC8vIHNldmVyYWwgZWxlbWVudHNcbiAgdmFyIGZyYWdtZW50ID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKSk7XG4gIH1cblxuICByZXR1cm4gZnJhZ21lbnQ7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBmaWxlc2l6ZVxuICpcbiAqIEBhdXRob3IgSmFzb24gTXVsbGlnYW4gPGphc29uLm11bGxpZ2FuQGF2b2lkd29yay5jb20+XG4gKiBAY29weXJpZ2h0IDIwMTUgSmFzb24gTXVsbGlnYW5cbiAqIEBsaWNlbnNlIEJTRC0zIDxodHRwczovL3Jhdy5naXRodWIuY29tL2F2b2lkd29yay9maWxlc2l6ZS5qcy9tYXN0ZXIvTElDRU5TRT5cbiAqIEBsaW5rIGh0dHA6Ly9maWxlc2l6ZWpzLmNvbVxuICogQG1vZHVsZSBmaWxlc2l6ZVxuICogQHZlcnNpb24gMy4xLjBcbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwpIHtcbiAgdmFyIGJpdCA9IC9iJC87XG5cbiAgLyoqXG4gICAqIGZpbGVzaXplXG4gICAqXG4gICAqIEBtZXRob2QgZmlsZXNpemVcbiAgICogQHBhcmFtICB7TWl4ZWR9ICAgYXJnICAgICAgICBTdHJpbmcsIEludCBvciBGbG9hdCB0byB0cmFuc2Zvcm1cbiAgICogQHBhcmFtICB7T2JqZWN0fSAgZGVzY3JpcHRvciBbT3B0aW9uYWxdIEZsYWdzXG4gICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICAgUmVhZGFibGUgZmlsZSBzaXplIFN0cmluZ1xuICAgKi9cbiAgdmFyIGZpbGVzaXplID0gZnVuY3Rpb24gKGFyZywgZGVzY3JpcHRvcikge1xuICAgIHZhciByZXN1bHQgPSBbXSxcbiAgICAgICAgc2tpcCA9IGZhbHNlLFxuICAgICAgICB2YWwgPSAwLFxuICAgICAgICBlID0gdW5kZWZpbmVkLFxuICAgICAgICBiYXNlID0gdW5kZWZpbmVkLFxuICAgICAgICBiaXRzID0gdW5kZWZpbmVkLFxuICAgICAgICBjZWlsID0gdW5kZWZpbmVkLFxuICAgICAgICBuZWcgPSB1bmRlZmluZWQsXG4gICAgICAgIG51bSA9IHVuZGVmaW5lZCxcbiAgICAgICAgb3V0cHV0ID0gdW5kZWZpbmVkLFxuICAgICAgICByb3VuZCA9IHVuZGVmaW5lZCxcbiAgICAgICAgdW5peCA9IHVuZGVmaW5lZCxcbiAgICAgICAgc3BhY2VyID0gdW5kZWZpbmVkLFxuICAgICAgICBzdWZmaXhlcyA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChpc05hTihhcmcpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGFyZ3VtZW50c1wiKTtcbiAgICB9XG5cbiAgICBkZXNjcmlwdG9yID0gZGVzY3JpcHRvciB8fCB7fTtcbiAgICBiaXRzID0gZGVzY3JpcHRvci5iaXRzID09PSB0cnVlO1xuICAgIHVuaXggPSBkZXNjcmlwdG9yLnVuaXggPT09IHRydWU7XG4gICAgYmFzZSA9IGRlc2NyaXB0b3IuYmFzZSAhPT0gdW5kZWZpbmVkID8gZGVzY3JpcHRvci5iYXNlIDogMjtcbiAgICByb3VuZCA9IGRlc2NyaXB0b3Iucm91bmQgIT09IHVuZGVmaW5lZCA/IGRlc2NyaXB0b3Iucm91bmQgOiB1bml4ID8gMSA6IDI7XG4gICAgc3BhY2VyID0gZGVzY3JpcHRvci5zcGFjZXIgIT09IHVuZGVmaW5lZCA/IGRlc2NyaXB0b3Iuc3BhY2VyIDogdW5peCA/IFwiXCIgOiBcIiBcIjtcbiAgICBzdWZmaXhlcyA9IGRlc2NyaXB0b3Iuc3VmZml4ZXMgIT09IHVuZGVmaW5lZCA/IGRlc2NyaXB0b3Iuc3VmZml4ZXMgOiB7fTtcbiAgICBvdXRwdXQgPSBkZXNjcmlwdG9yLm91dHB1dCAhPT0gdW5kZWZpbmVkID8gZGVzY3JpcHRvci5vdXRwdXQgOiBcInN0cmluZ1wiO1xuICAgIGUgPSBkZXNjcmlwdG9yLmV4cG9uZW50ICE9PSB1bmRlZmluZWQgPyBkZXNjcmlwdG9yLmV4cG9uZW50IDogLTE7XG4gICAgbnVtID0gTnVtYmVyKGFyZyk7XG4gICAgbmVnID0gbnVtIDwgMDtcbiAgICBjZWlsID0gYmFzZSA+IDIgPyAxMDAwIDogMTAyNDtcblxuICAgIC8vIEZsaXBwaW5nIGEgbmVnYXRpdmUgbnVtYmVyIHRvIGRldGVybWluZSB0aGUgc2l6ZVxuICAgIGlmIChuZWcpIHtcbiAgICAgIG51bSA9IC1udW07XG4gICAgfVxuXG4gICAgLy8gWmVybyBpcyBub3cgYSBzcGVjaWFsIGNhc2UgYmVjYXVzZSBieXRlcyBkaXZpZGUgYnkgMVxuICAgIGlmIChudW0gPT09IDApIHtcbiAgICAgIHJlc3VsdFswXSA9IDA7XG5cbiAgICAgIGlmICh1bml4KSB7XG4gICAgICAgIHJlc3VsdFsxXSA9IFwiXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbMV0gPSBcIkJcIjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhlIGV4cG9uZW50XG4gICAgICBpZiAoZSA9PT0gLTEgfHwgaXNOYU4oZSkpIHtcbiAgICAgICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2cobnVtKSAvIE1hdGgubG9nKGNlaWwpKTtcbiAgICAgIH1cblxuICAgICAgLy8gRXhjZWVkaW5nIHN1cHBvcnRlZCBsZW5ndGgsIHRpbWUgdG8gcmVkdWNlICYgbXVsdGlwbHlcbiAgICAgIGlmIChlID4gOCkge1xuICAgICAgICB2YWwgPSB2YWwgKiAoMTAwMCAqIChlIC0gOCkpO1xuICAgICAgICBlID0gODtcbiAgICAgIH1cblxuICAgICAgaWYgKGJhc2UgPT09IDIpIHtcbiAgICAgICAgdmFsID0gbnVtIC8gTWF0aC5wb3coMiwgZSAqIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbCA9IG51bSAvIE1hdGgucG93KDEwMDAsIGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYml0cykge1xuICAgICAgICB2YWwgPSB2YWwgKiA4O1xuXG4gICAgICAgIGlmICh2YWwgPiBjZWlsKSB7XG4gICAgICAgICAgdmFsID0gdmFsIC8gY2VpbDtcbiAgICAgICAgICBlKys7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVzdWx0WzBdID0gTnVtYmVyKHZhbC50b0ZpeGVkKGUgPiAwID8gcm91bmQgOiAwKSk7XG4gICAgICByZXN1bHRbMV0gPSBzaVtiaXRzID8gXCJiaXRzXCIgOiBcImJ5dGVzXCJdW2VdO1xuXG4gICAgICBpZiAoIXNraXAgJiYgdW5peCkge1xuICAgICAgICBpZiAoYml0cyAmJiBiaXQudGVzdChyZXN1bHRbMV0pKSB7XG4gICAgICAgICAgcmVzdWx0WzFdID0gcmVzdWx0WzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHRbMV0gPSByZXN1bHRbMV0uY2hhckF0KDApO1xuXG4gICAgICAgIGlmIChyZXN1bHRbMV0gPT09IFwiQlwiKSB7XG4gICAgICAgICAgcmVzdWx0WzBdID0gTWF0aC5mbG9vcihyZXN1bHRbMF0pO1xuICAgICAgICAgIHJlc3VsdFsxXSA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoIWJpdHMgJiYgcmVzdWx0WzFdID09PSBcImtcIikge1xuICAgICAgICAgIHJlc3VsdFsxXSA9IFwiS1wiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVjb3JhdGluZyBhICdkaWZmJ1xuICAgIGlmIChuZWcpIHtcbiAgICAgIHJlc3VsdFswXSA9IC1yZXN1bHRbMF07XG4gICAgfVxuXG4gICAgLy8gQXBwbHlpbmcgY3VzdG9tIHN1ZmZpeFxuICAgIHJlc3VsdFsxXSA9IHN1ZmZpeGVzW3Jlc3VsdFsxXV0gfHwgcmVzdWx0WzFdO1xuXG4gICAgLy8gUmV0dXJuaW5nIEFycmF5LCBPYmplY3QsIG9yIFN0cmluZyAoZGVmYXVsdClcbiAgICBpZiAob3V0cHV0ID09PSBcImFycmF5XCIpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIGlmIChvdXRwdXQgPT09IFwiZXhwb25lbnRcIikge1xuICAgICAgcmV0dXJuIGU7XG4gICAgfSBlbHNlIGlmIChvdXRwdXQgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHJldHVybiB7IHZhbHVlOiByZXN1bHRbMF0sIHN1ZmZpeDogcmVzdWx0WzFdIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByZXN1bHQuam9pbihzcGFjZXIpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogU0kgc3VmZml4ZXNcbiAgICpcbiAgICogQHR5cGUge09iamVjdH1cbiAgICovXG4gIHZhciBzaSA9IHtcbiAgICBiaXRzOiBbXCJCXCIsIFwia2JcIiwgXCJNYlwiLCBcIkdiXCIsIFwiVGJcIiwgXCJQYlwiLCBcIkViXCIsIFwiWmJcIiwgXCJZYlwiXSxcbiAgICBieXRlczogW1wiQlwiLCBcImtCXCIsIFwiTUJcIiwgXCJHQlwiLCBcIlRCXCIsIFwiUEJcIiwgXCJFQlwiLCBcIlpCXCIsIFwiWUJcIl1cbiAgfTtcblxuICAvLyBDb21tb25KUywgQU1ELCBzY3JpcHQgdGFnXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmlsZXNpemU7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBmaWxlc2l6ZTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBnbG9iYWwuZmlsZXNpemUgPSBmaWxlc2l6ZTtcbiAgfVxufSkodGhpcyk7IiwiXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yRWFjaCAob2JqLCBmbiwgY3R4KSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwoZm4pICE9PSAnW29iamVjdCBGdW5jdGlvbl0nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2l0ZXJhdG9yIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgbCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGwgPT09ICtsKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBmbi5jYWxsKGN0eCwgb2JqW2ldLCBpLCBvYmopO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChoYXNPd24uY2FsbChvYmosIGspKSB7XG4gICAgICAgICAgICAgICAgZm4uY2FsbChjdHgsIG9ialtrXSwgaywgb2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbiIsInZhciBSRUFEWSA9IC0xLFxyXG5cdENPTVBMRVRFID0gMCxcclxuXHRGQUlMRUQgPSAxLFxyXG5cdEdhdGhlcmVyLFxyXG5cdGNoZWNrVGFza3M7XHJcblxyXG5mdW5jdGlvbiBHYXRoZXJlcigpe1xyXG5cclxuXHR0aGlzLnJlc2V0KCk7XHJcblx0cmV0dXJuIHRoaXM7XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiBjaGVja1Rhc2tzKCl7XHJcblxyXG5cdHZhciBjb21wbGV0ZWQgPSB0aGlzLnRhc2tzQ29tcGxldGUgKyB0aGlzLnRhc2tzRmFpbGVkO1xyXG5cdHZhciBjb3VudCA9IHRoaXMudGFza3MubGVuZ3RoO1xyXG5cclxuXHQvLyBwb3N0IHRoZSBwZXJjZW50IGNvbXBsZXRlLi5cclxuXHR0aGlzLmZuLnVwZGF0ZSggTWF0aC5jZWlsKDEwMCAqIChjb21wbGV0ZWQgLyBjb3VudCkpKTtcclxuXHJcblx0Ly8gYW5kIGZpcmUgdGhlIGNvbXBsZXRlIGNhbGxiYWNrIHdoZW4gZG9uZSwgcmVnYXJkbGVzcyBvZiBvdXRjb21lXHJcblx0aWYoY29tcGxldGVkID49IGNvdW50KXtcclxuXHJcblx0XHR0aGlzLmlzQ29tcGxldGUgPSB0cnVlO1xyXG5cclxuXHRcdHRoaXMuZm4uY29tcGxldGUoIHRoaXMudGFza3NGYWlsZWQgPyB0aGlzLmVycm9ycyA6IG51bGwgKTtcclxuXHRcdFxyXG5cdH1cclxuXHJcblx0cmV0dXJuO1xyXG59O1xyXG5cclxuR2F0aGVyZXIucHJvdG90eXBlID0ge1xyXG5cclxuXHRyZXNldCA6IGZ1bmN0aW9uIHJlc2V0R2F0aGVyaW5nKCl7XHJcblxyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdHRoaXMuZm4gPSB7XHJcblx0XHRcdGNvbXBsZXRlIDogZnVuY3Rpb24oKXt9LFxyXG5cdFx0XHR1cGRhdGUgOiBmdW5jdGlvbigpe31cclxuXHRcdH1cclxuXHRcdHRoaXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy50YXNrc0NvbXBsZXRlID0gMDtcclxuXHRcdHRoaXMudGFza3NGYWlsZWQgPSAwO1xyXG5cdFx0dGhpcy5lcnJvcnMgPSBbXTtcclxuXHJcblx0XHRyZXR1cm47XHJcblxyXG5cdH0sXHJcblxyXG5cdHRhc2sgOiBmdW5jdGlvbiBjcmVhdGVUYXNrKCBjYWxsYmFjayApe1xyXG5cclxuXHRcdHZhciBzZWxmID0gdGhpcyxcclxuXHRcdFx0dGFzayA9IHsgc3RhdHVzIDogUkVBRFkgfSxcclxuXHRcdFx0ZG9uZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dGFzay5zdGF0dXMgPSBDT01QTEVURTtcclxuXHRcdFx0XHRzZWxmLnRhc2tzQ29tcGxldGUrKztcclxuXHRcdFx0XHRjaGVja1Rhc2tzLmNhbGwoc2VsZik7XHRcclxuXHRcdFx0fSxcclxuXHRcdFx0ZXJyb3IgPSBmdW5jdGlvbihlcnIpe1xyXG5cdFx0XHRcdHRhc2suc3RhdHVzID0gRkFJTEVEO1xyXG5cdFx0XHRcdHNlbGYudGFza3NGYWlsZWQrKztcclxuXHRcdFx0XHRzZWxmLmVycm9ycy5wdXNoKGVycik7XHJcblx0XHRcdFx0Y2hlY2tUYXNrcy5jYWxsKHNlbGYpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdHRhc2suZm4gPSBmdW5jdGlvbigpe1xyXG5cclxuXHRcdFx0Y2FsbGJhY2soZG9uZSwgZXJyb3IpO1xyXG5cclxuXHRcdH1cclxuXHRcdHNlbGYudGFza3MucHVzaCh0YXNrKTtcclxuXHRcdHJldHVybiBzZWxmO1xyXG5cclxuXHR9LFxyXG5cclxuXHRydW4gOiBmdW5jdGlvbiBydW5UYXNrcyggY2FsbGJhY2ssIHRpbWVvdXQgKXtcclxuXHJcblx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG5cdFx0aWYgKHRpbWVvdXQpe1xyXG5cclxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cclxuXHRcdFx0XHRpZiAoIXNlbGYuaXNDb21wbGV0ZSl7XHJcblxyXG5cdFx0XHRcdFx0c2VsZi5mbi5jb21wbGV0ZSgnRXJyb3I6IFRpbWVkIG91dCcpO1xyXG5cdFx0XHRcdFx0c2VsZi5mbi5jb21wbGV0ZSA9IGZ1bmN0aW9uKCl7fTtcclxuXHJcblx0XHRcdFx0fVxyXG5cclxuXHJcblx0XHRcdH0sIHRpbWVvdXQpO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRzZWxmLmZuLmNvbXBsZXRlID0gY2FsbGJhY2s7XHJcblxyXG5cdFx0Ly8gcnVuIHRoZSB0YXNrIGNhbGxiYWNrcy4uLlxyXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGlsID0gc2VsZi50YXNrcy5sZW5ndGg7IGkgPCBpbDsgaSsrKXtcclxuXHRcdFx0c2VsZi50YXNrc1tpXS5mbigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBzZWxmO1xyXG5cclxuXHR9LFxyXG5cclxuXHR1cGRhdGUgOiBmdW5jdGlvbiBzZXRVcGRhdGVDYWxsYmFjayggY2FsbGJhY2sgKXtcclxuXHRcdHRoaXMuZm4udXBkYXRlID0gY2FsbGJhY2s7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9XHJcblxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhdGhlcmVyOyIsIi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgbWF0Y2hlcyA9IHJlcXVpcmUoJ21hdGNoZXMtc2VsZWN0b3InKTtcbnZhciBkZWxlZ2F0ZSA9IHJlcXVpcmUoJ2RlbGVnYXRlJyk7XG52YXIgY2xhc3NlcyA9IHJlcXVpcmUoJ2NsYXNzZXMnKTtcbnZhciB0cmF2ZXJzZSA9IHJlcXVpcmUoJ3RyYXZlcnNlJyk7XG52YXIgaW5kZXhvZiA9IHJlcXVpcmUoJ2luZGV4b2YnKTtcbnZhciBkb21pZnkgPSByZXF1aXJlKCdkb21pZnknKTtcbnZhciBldmVudHMgPSByZXF1aXJlKCdldmVudCcpO1xudmFyIHZhbHVlID0gcmVxdWlyZSgndmFsdWUnKTtcbnZhciBxdWVyeSA9IHJlcXVpcmUoJ3F1ZXJ5Jyk7XG52YXIgdHlwZSA9IHJlcXVpcmUoJ3R5cGUnKTtcbnZhciB0cmltID0gcmVxdWlyZSgndHJpbScpO1xudmFyIGNzcyA9IHJlcXVpcmUoJ2NzcycpO1xuXG52YXIgZXZlbnRSZWZzID0ge307XG52YXIgZXhwYW5kbyA9IDA7XG5cbi8qKlxuICogQXR0cmlidXRlcyBzdXBwb3J0ZWQuXG4gKi9cblxudmFyIGF0dHJzID0gW1xuICAnaWQnLFxuICAnc3JjJyxcbiAgJ3JlbCcsXG4gICdjb2xzJyxcbiAgJ3Jvd3MnLFxuICAndHlwZScsXG4gICduYW1lJyxcbiAgJ2hyZWYnLFxuICAndGl0bGUnLFxuICAnc3R5bGUnLFxuICAnd2lkdGgnLFxuICAnaGVpZ2h0JyxcbiAgJ2FjdGlvbicsXG4gICdtZXRob2QnLFxuICAndGFiaW5kZXgnLFxuICAncGxhY2Vob2xkZXInXG5dO1xuXG4vKipcbiAqIEV4cG9zZSBgZG9tKClgLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGRvbTtcblxuLyoqXG4gKiBFeHBvc2Ugc3VwcG9ydGVkIGF0dHJzLlxuICovXG5cbmV4cG9ydHMuYXR0cnMgPSBhdHRycztcblxuLyoqXG4gKiBSZXR1cm4gYSBkb20gYExpc3RgIGZvciB0aGUgZ2l2ZW5cbiAqIGBodG1sYCwgc2VsZWN0b3IsIG9yIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8RWxlbWVudHxMaXN0fVxuICogQHJldHVybiB7TGlzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZG9tKHNlbGVjdG9yLCBjb250ZXh0KSB7XG4gIC8vIGFycmF5XG4gIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yKSkge1xuICAgIHJldHVybiBuZXcgTGlzdChzZWxlY3Rvcik7XG4gIH1cblxuICAvLyBMaXN0XG4gIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIExpc3QpIHtcbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH1cblxuICAvLyBub2RlXG4gIGlmIChzZWxlY3Rvci5ub2RlTmFtZSkge1xuICAgIHJldHVybiBuZXcgTGlzdChbc2VsZWN0b3JdKTtcbiAgfVxuXG4gIGlmICgnc3RyaW5nJyAhPSB0eXBlb2Ygc2VsZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpbnZhbGlkIHNlbGVjdG9yJyk7XG4gIH1cblxuICAvLyBodG1sXG4gIHZhciBodG1sc2VsZWN0b3IgPSB0cmltLmxlZnQoc2VsZWN0b3IpO1xuICBpZiAoJzwnID09IGh0bWxzZWxlY3Rvci5jaGFyQXQoMCkpIHtcbiAgICByZXR1cm4gbmV3IExpc3QoW2RvbWlmeShodG1sc2VsZWN0b3IpXSwgaHRtbHNlbGVjdG9yKTtcbiAgfVxuXG4gIC8vIHNlbGVjdG9yXG4gIHZhciBjdHggPSBjb250ZXh0XG4gICAgPyAoY29udGV4dC5lbHMgPyBjb250ZXh0LmVsc1swXSA6IGNvbnRleHQpXG4gICAgOiBkb2N1bWVudDtcblxuICByZXR1cm4gbmV3IExpc3QocXVlcnkuYWxsKHNlbGVjdG9yLCBjdHgpLCBzZWxlY3Rvcik7XG59XG5cbi8qKlxuICogRXhwb3NlIGBMaXN0YCBjb25zdHJ1Y3Rvci5cbiAqL1xuXG5leHBvcnRzLkxpc3QgPSBMaXN0O1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYExpc3RgIHdpdGggdGhlXG4gKiBnaXZlbiBhcnJheS1pc2ggb2YgYGVsc2AgYW5kIGBzZWxlY3RvcmBcbiAqIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSBlbHNcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gTGlzdChlbHMsIHNlbGVjdG9yKSB7XG4gIHRoaXMuZWxzID0gZWxzIHx8IFtdO1xuICB0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3I7XG59XG5cbi8qKlxuICogRW51bWVyYWJsZSBpdGVyYXRvci5cbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5fX2l0ZXJhdGVfXyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHtcbiAgICBsZW5ndGg6IGZ1bmN0aW9uKCl7IHJldHVybiBzZWxmLmVscy5sZW5ndGggfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKGkpeyByZXR1cm4gbmV3IExpc3QoW3NlbGYuZWxzW2ldXSkgfVxuICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZSBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbigpe1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGVsID0gdGhpcy5lbHNbaV07XG4gICAgZWwuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiOyAvLyBoaWRlIGl0LCBpZiBub3RoaW5nIGVsc2UuXG4gICAgd2Fsa0RPTShlbCwgZnVuY3Rpb24oIG5vZGUgKXtcbiAgICAgIHZhciBpZDtcbiAgICAgIGlmKGlkID0gbm9kZS5fX2V4cGFuZG8pe1xuICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgZXZlbnRSZWZzW2lkXS5sZW5ndGg7ICsrail7XG4gICAgICAgICAgZXZlbnRzLnVuYmluZChub2RlLCBldmVudFJlZnNbaWRdW2pdLmV2dCwgZXZlbnRSZWZzW2lkXVtqXS5mbik7XG4gICAgICAgICAgZGVsZXRlIGV2ZW50UmVmc1tpZF1bal07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGVsLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuICAgIHZhciBwYXJlbnQgPSBlbC5wYXJlbnROb2RlO1xuICAgIGlmIChwYXJlbnQpIHBhcmVudC5yZW1vdmVDaGlsZChlbCk7XG4gIH1cbn07XG5cbi8qKlxuICogU2V0IGF0dHJpYnV0ZSBgbmFtZWAgdG8gYHZhbGAsIG9yIGdldCBhdHRyIGBuYW1lYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtTdHJpbmd9IFt2YWxdXG4gKiBAcmV0dXJuIHtTdHJpbmd8TGlzdH0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5hdHRyID0gZnVuY3Rpb24obmFtZSwgdmFsKXtcblxuICAvLyBzZXQgdmlhIG9iamVjdFxuICBpZiAoXCJvYmplY3RcIiA9PSB0eXBlb2YgbmFtZSl7XG4gICAgZm9yICh2YXIgYXR0ciBpbiBuYW1lKSB7XG4gICAgICB0aGlzLmF0dHIoYXR0ciwgbmFtZVthdHRyXSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZ2V0XG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcy5lbHNbMF0gJiYgdGhpcy5lbHNbMF0uZ2V0QXR0cmlidXRlKG5hbWUpO1xuICB9XG5cbiAgLy8gcmVtb3ZlXG4gIGlmIChudWxsID09IHZhbCkge1xuICAgIHJldHVybiB0aGlzLnJlbW92ZUF0dHIobmFtZSk7XG4gIH1cblxuICAvLyBzZXRcbiAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbihlbCl7XG4gICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYXR0cmlidXRlIGBuYW1lYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7TGlzdH0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5yZW1vdmVBdHRyID0gZnVuY3Rpb24obmFtZSl7XG4gIHJldHVybiB0aGlzLmZvckVhY2goZnVuY3Rpb24oZWwpe1xuICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFNldCBwcm9wZXJ0eSBgbmFtZWAgdG8gYHZhbGAsIG9yIGdldCBwcm9wZXJ0eSBgbmFtZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbdmFsXVxuICogQHJldHVybiB7T2JqZWN0fExpc3R9IHNlbGZcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUucHJvcCA9IGZ1bmN0aW9uKG5hbWUsIHZhbCl7XG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcy5lbHNbMF0gJiYgdGhpcy5lbHNbMF1bbmFtZV07XG4gIH1cblxuICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKGVsKXtcbiAgICBlbFtuYW1lXSA9IHZhbDtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgZmlyc3QgZWxlbWVudCdzIHZhbHVlIG9yIHNldCBzZWxlY3RlZFxuICogZWxlbWVudCB2YWx1ZXMgdG8gYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gW3ZhbF1cbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS52YWwgPVxuTGlzdC5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbih2YWwpe1xuICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxzWzBdXG4gICAgICA/IHZhbHVlKHRoaXMuZWxzWzBdKVxuICAgICAgOiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKGVsKXtcbiAgICB2YWx1ZShlbCwgdmFsKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybiBhIGNsb25lZCBgTGlzdGAgd2l0aCBhbGwgZWxlbWVudHMgY2xvbmVkLlxuICpcbiAqIEByZXR1cm4ge0xpc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKXtcbiAgdmFyIGFyciA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5lbHMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBhcnIucHVzaCh0aGlzLmVsc1tpXS5jbG9uZU5vZGUodHJ1ZSkpO1xuICB9XG4gIHJldHVybiBuZXcgTGlzdChhcnIpO1xufTtcblxuLyoqXG4gKiBQcmVwZW5kIGB2YWxgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEVsZW1lbnR8TGlzdH0gdmFsXG4gKiBAcmV0dXJuIHtMaXN0fSBuZXcgbGlzdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5wcmVwZW5kID0gZnVuY3Rpb24odmFsKXtcbiAgdmFyIGVsID0gdGhpcy5lbHNbMF07XG4gIGlmICghZWwpIHJldHVybiB0aGlzO1xuICB2YWwgPSBkb20odmFsKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWwuZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKGVsLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgZWwuaW5zZXJ0QmVmb3JlKHZhbC5lbHNbaV0sIGVsLmZpcnN0Q2hpbGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5hcHBlbmRDaGlsZCh2YWwuZWxzW2ldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbDtcbn07XG5cbi8qKlxuICogQXBwZW5kIGB2YWxgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEVsZW1lbnR8TGlzdH0gdmFsXG4gKiBAcmV0dXJuIHtMaXN0fSBuZXcgbGlzdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbih2YWwpe1xuICB2YXIgZWwgPSB0aGlzLmVsc1swXTtcbiAgaWYgKCFlbCkgcmV0dXJuIHRoaXM7XG4gIHZhbCA9IGRvbSh2YWwpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbC5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICBlbC5hcHBlbmRDaGlsZCh2YWwuZWxzW2ldKTtcbiAgfVxuICByZXR1cm4gdmFsO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgc2VsZidzIGBlbGAgdG8gYHZhbGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xFbGVtZW50fExpc3R9IHZhbFxuICogQHJldHVybiB7TGlzdH0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5hcHBlbmRUbyA9IGZ1bmN0aW9uKHZhbCl7XG4gIGRvbSh2YWwpLmFwcGVuZCh0aGlzKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEluc2VydCBzZWxmJ3MgYGVsc2AgYWZ0ZXIgYHZhbGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xFbGVtZW50fExpc3R9IHZhbFxuICogQHJldHVybiB7TGlzdH0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5pbnNlcnRBZnRlciA9IGZ1bmN0aW9uKHZhbCl7XG4gIHZhbCA9IGRvbSh2YWwpLmVsc1swXTtcbiAgaWYgKCF2YWwgfHwgIXZhbC5wYXJlbnROb2RlKSByZXR1cm4gdGhpcztcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKGVsKXtcbiAgICB2YWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZWwsIHZhbC5uZXh0U2libGluZyk7XG4gIH0pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgYExpc3RgIGNvbnRhaW5pbmcgdGhlIGVsZW1lbnQgYXQgYGlgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpXG4gKiBAcmV0dXJuIHtMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5hdCA9IGZ1bmN0aW9uKGkpe1xuICByZXR1cm4gbmV3IExpc3QoW3RoaXMuZWxzW2ldXSwgdGhpcy5zZWxlY3Rvcik7XG59O1xuXG4vKipcbiAqIFJldHVybiBhIGBMaXN0YCBjb250YWluaW5nIHRoZSBmaXJzdCBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpXG4gKiBAcmV0dXJuIHtMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5maXJzdCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBuZXcgTGlzdChbdGhpcy5lbHNbMF1dLCB0aGlzLnNlbGVjdG9yKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgYExpc3RgIGNvbnRhaW5pbmcgdGhlIGxhc3QgZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaVxuICogQHJldHVybiB7TGlzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUubGFzdCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBuZXcgTGlzdChbdGhpcy5lbHNbdGhpcy5lbHMubGVuZ3RoIC0gMV1dLCB0aGlzLnNlbGVjdG9yKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGFuIGBFbGVtZW50YCBhdCBgaWAuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGkpe1xuICByZXR1cm4gdGhpcy5lbHNbaSB8fCAwXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGxpc3QgbGVuZ3RoLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuZWxzLmxlbmd0aDtcbn07XG5cbi8qKlxuICogUmV0dXJuIGVsZW1lbnQgdGV4dC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmd8TGlzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUudGV4dCA9IGZ1bmN0aW9uKHN0cil7XG4gIC8vIFRPRE86IHJlYWwgaW1wbFxuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKGVsKXtcbiAgICAgIGVsLnRleHRDb250ZW50ID0gc3RyO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIHN0ciA9ICcnO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgc3RyICs9IHRoaXMuZWxzW2ldLnRleHRDb250ZW50O1xuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG4vKipcbiAqIFJldHVybiBlbGVtZW50IGh0bWwuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBodG1sXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLmh0bWwgPSBmdW5jdGlvbihodG1sKXtcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzLmZvckVhY2goZnVuY3Rpb24oZWwpe1xuICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbDtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFRPRE86IHJlYWwgaW1wbFxuICByZXR1cm4gdGhpcy5lbHNbMF0gJiYgdGhpcy5lbHNbMF0uaW5uZXJIVE1MO1xufTtcblxuLyoqXG4gKiBCaW5kIHRvIGBldmVudGAgYW5kIGludm9rZSBgZm4oZSlgLiBXaGVuXG4gKiBhIGBzZWxlY3RvcmAgaXMgZ2l2ZW4gdGhlbiBldmVudHMgYXJlIGRlbGVnYXRlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc2VsZWN0b3JdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtCb29sZWFufSBjYXB0dXJlXG4gKiBAcmV0dXJuIHtMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBzZWxlY3RvciwgZm4sIGNhcHR1cmUpe1xuICB2YXIgaWQsIGN1cjtcbiAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBzZWxlY3Rvcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGZuLl9kZWxlZ2F0ZSA9IGRlbGVnYXRlLmJpbmQodGhpcy5lbHNbaV0sIHNlbGVjdG9yLCBldmVudCwgZm4sIGNhcHR1cmUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGNhcHR1cmUgPSBmbjtcbiAgZm4gPSBzZWxlY3RvcjtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKGlkID0gdGhpcy5lbHNbaV0uX19leHBhbmRvKXtcbiAgICB9IGVsc2Uge1xuICAgICAgaWQgPSArK2V4cGFuZG87XG4gICAgICB0aGlzLmVsc1tpXS5fX2V4cGFuZG8gPSBpZDtcbiAgICB9XG4gICAgaWYoIWV2ZW50UmVmc1tpZF0pe1xuICAgICAgZXZlbnRSZWZzW2lkXSA9IFtdO1xuICAgIH1cbiAgICBjdXIgPSBldmVudFJlZnNbaWRdLmxlbmd0aDtcbiAgICBldmVudFJlZnNbaWRdW2N1cl0gPSB7XG4gICAgICBldnQgOiBldmVudCxcbiAgICAgIGZuIDogZm5cbiAgICB9O1xuICAgIGV2ZW50cy5iaW5kKHRoaXMuZWxzW2ldLCBldmVudFJlZnNbaWRdW2N1cl0uZXZ0LCBldmVudFJlZnNbaWRdW2N1cl0uZm4sIGNhcHR1cmUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFVuYmluZCB0byBgZXZlbnRgIGFuZCBpbnZva2UgYGZuKGUpYC4gV2hlblxuICogYSBgc2VsZWN0b3JgIGlzIGdpdmVuIHRoZW4gZGVsZWdhdGVkIGV2ZW50XG4gKiBoYW5kbGVycyBhcmUgdW5ib3VuZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBbc2VsZWN0b3JdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtCb29sZWFufSBjYXB0dXJlXG4gKiBAcmV0dXJuIHtMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudCwgc2VsZWN0b3IsIGZuLCBjYXB0dXJlKXtcbiAgdmFyIGlkLCBpO1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHNlbGVjdG9yKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMuZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgICAvLyBUT0RPOiBhZGQgc2VsZWN0b3Igc3VwcG9ydCBiYWNrXG4gICAgICBkZWxlZ2F0ZS51bmJpbmQodGhpcy5lbHNbaV0sIGV2ZW50LCBmbi5fZGVsZWdhdGUsIGNhcHR1cmUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGNhcHR1cmUgPSBmbjtcbiAgZm4gPSBzZWxlY3RvcjtcblxuICBpZiAoIXNlbGVjdG9yKXtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlkID0gdGhpcy5lbHNbaV0uX19leHBhbmRvO1xuICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGV2ZW50UmVmc1tpZF0ubGVuZ3RoOyArK2ope1xuICAgICAgICBldmVudHMudW5iaW5kKHRoaXMuZWxzW2ldLCBldmVudFJlZnNbaWRdW2pdLmV2dCwgZXZlbnRSZWZzW2lkXVtqXS5mbik7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmVscy5sZW5ndGg7ICsraSkge1xuICAgICAgZXZlbnRzLnVuYmluZCh0aGlzLmVsc1tpXSwgZXZlbnQsIGZuLCBjYXB0dXJlKTtcbiAgICB9XG4gIH1cbiAgXG4gIHJldHVybiB0aGlzO1xufTtcbi8qKlxuICogSXRlcmF0ZSBlbGVtZW50cyBhbmQgaW52b2tlIGBmbihsaXN0LCBpKWAuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0xpc3R9IHNlbGZcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUuZWFjaCA9IGZ1bmN0aW9uKGZuKXtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVscy5sZW5ndGg7ICsraSkge1xuICAgIGZuKG5ldyBMaXN0KFt0aGlzLmVsc1tpXV0sIHRoaXMuc2VsZWN0b3IpLCBpKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSXRlcmF0ZSBlbGVtZW50cyBhbmQgaW52b2tlIGBmbihlbCwgaSlgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtMaXN0fSBzZWxmXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihmbil7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICBmbih0aGlzLmVsc1tpXSwgaSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE1hcCBlbGVtZW50cyBpbnZva2luZyBgZm4obGlzdCwgaSlgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24oZm4pe1xuICB2YXIgYXJyID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICBhcnIucHVzaChmbihuZXcgTGlzdChbdGhpcy5lbHNbaV1dLCB0aGlzLnNlbGVjdG9yKSwgaSkpO1xuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG4vKipcbiAqIEZpbHRlciBlbGVtZW50cyBpbnZva2luZyBgZm4obGlzdCwgaSlgLCByZXR1cm5pbmdcbiAqIGEgbmV3IGBMaXN0YCBvZiBlbGVtZW50cyB3aGVuIGEgdHJ1dGh5IHZhbHVlIGlzIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5zZWxlY3QgPVxuTGlzdC5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24oZm4pe1xuICB2YXIgZWw7XG4gIHZhciBsaXN0ID0gbmV3IExpc3QoW10sIHRoaXMuc2VsZWN0b3IpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgZWwgPSB0aGlzLmVsc1tpXTtcbiAgICBpZiAoZm4obmV3IExpc3QoW2VsXSwgdGhpcy5zZWxlY3RvciksIGkpKSBsaXN0LmVscy5wdXNoKGVsKTtcbiAgfVxuICByZXR1cm4gbGlzdDtcbn07XG5cbi8qKlxuICogRmlsdGVyIGVsZW1lbnRzIGludm9raW5nIGBmbihsaXN0LCBpKWAsIHJldHVybmluZ1xuICogYSBuZXcgYExpc3RgIG9mIGVsZW1lbnRzIHdoZW4gYSBmYWxzZXkgdmFsdWUgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0xpc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLnJlamVjdCA9IGZ1bmN0aW9uKGZuKXtcbiAgdmFyIGVsO1xuICB2YXIgbGlzdCA9IG5ldyBMaXN0KFtdLCB0aGlzLnNlbGVjdG9yKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVscy5sZW5ndGg7ICsraSkge1xuICAgIGVsID0gdGhpcy5lbHNbaV07XG4gICAgaWYgKCFmbihuZXcgTGlzdChbZWxdLCB0aGlzLnNlbGVjdG9yKSwgaSkpIGxpc3QuZWxzLnB1c2goZWwpO1xuICB9XG4gIHJldHVybiBsaXN0O1xufTtcblxuLyoqXG4gKiBBZGQgdGhlIGdpdmVuIGNsYXNzIGBuYW1lYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7TGlzdH0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uKG5hbWUpe1xuICB2YXIgZWw7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICBlbCA9IHRoaXMuZWxzW2ldO1xuICAgIGVsLl9jbGFzc2VzID0gZWwuX2NsYXNzZXMgfHwgY2xhc3NlcyhlbCk7XG4gICAgZWwuX2NsYXNzZXMuYWRkKG5hbWUpO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIGdpdmVuIGNsYXNzIGBuYW1lYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB9IG5hbWVcbiAqIEByZXR1cm4ge0xpc3R9IHNlbGZcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbihuYW1lKXtcbiAgdmFyIGVsO1xuXG4gIGlmICgncmVnZXhwJyA9PSB0eXBlKG5hbWUpKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVscy5sZW5ndGg7ICsraSkge1xuICAgICAgZWwgPSB0aGlzLmVsc1tpXTtcbiAgICAgIGVsLl9jbGFzc2VzID0gZWwuX2NsYXNzZXMgfHwgY2xhc3NlcyhlbCk7XG4gICAgICB2YXIgYXJyID0gZWwuX2NsYXNzZXMuYXJyYXkoKTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYXJyLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChuYW1lLnRlc3QoYXJyW2pdKSkge1xuICAgICAgICAgIGVsLl9jbGFzc2VzLnJlbW92ZShhcnJbal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVscy5sZW5ndGg7ICsraSkge1xuICAgIGVsID0gdGhpcy5lbHNbaV07XG4gICAgZWwuX2NsYXNzZXMgPSBlbC5fY2xhc3NlcyB8fCBjbGFzc2VzKGVsKTtcbiAgICBlbC5fY2xhc3Nlcy5yZW1vdmUobmFtZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVG9nZ2xlIHRoZSBnaXZlbiBjbGFzcyBgbmFtZWAsXG4gKiBvcHRpb25hbGx5IGEgYGJvb2xgIG1heSBiZSBnaXZlblxuICogdG8gaW5kaWNhdGUgdGhhdCB0aGUgY2xhc3Mgc2hvdWxkXG4gKiBiZSBhZGRlZCB3aGVuIHRydXRoeS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtCb29sZWFufSBib29sXG4gKiBAcmV0dXJuIHtMaXN0fSBzZWxmXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLnRvZ2dsZUNsYXNzID0gZnVuY3Rpb24obmFtZSwgYm9vbCl7XG4gIHZhciBlbDtcbiAgdmFyIGZuID0gJ3RvZ2dsZSc7XG5cbiAgLy8gdG9nZ2xlIHdpdGggYm9vbGVhblxuICBpZiAoMiA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZm4gPSBib29sID8gJ2FkZCcgOiAncmVtb3ZlJztcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICBlbCA9IHRoaXMuZWxzW2ldO1xuICAgIGVsLl9jbGFzc2VzID0gZWwuX2NsYXNzZXMgfHwgY2xhc3NlcyhlbCk7XG4gICAgZWwuX2NsYXNzZXNbZm5dKG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiBjbGFzcyBgbmFtZWAgaXMgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUuaGFzQ2xhc3MgPSBmdW5jdGlvbihuYW1lKXtcbiAgdmFyIGVsO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgZWwgPSB0aGlzLmVsc1tpXTtcbiAgICBlbC5fY2xhc3NlcyA9IGVsLl9jbGFzc2VzIHx8IGNsYXNzZXMoZWwpO1xuICAgIGlmIChlbC5fY2xhc3Nlcy5oYXMobmFtZSkpIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogU2V0IENTUyBgcHJvcGAgdG8gYHZhbGAgb3IgZ2V0IGBwcm9wYCB2YWx1ZS5cbiAqIEFsc28gYWNjZXB0cyBhbiBvYmplY3QgKGBwcm9wYDogYHZhbGApXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHByb3BcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICogQHJldHVybiB7TGlzdHxTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLmNzcyA9IGZ1bmN0aW9uKHByb3AsIHZhbCl7XG4gIGlmICgyID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqW3Byb3BdID0gdmFsO1xuICAgIHJldHVybiB0aGlzLnNldFN0eWxlKG9iaik7XG4gIH1cblxuICBpZiAoJ29iamVjdCcgPT0gdHlwZShwcm9wKSkge1xuICAgIHJldHVybiB0aGlzLnNldFN0eWxlKHByb3ApO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZ2V0U3R5bGUocHJvcCk7XG59O1xuXG4vKipcbiAqIFNldCBDU1MgYHByb3BzYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcHJvcHNcbiAqIEByZXR1cm4ge0xpc3R9IHNlbGZcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbkxpc3QucHJvdG90eXBlLnNldFN0eWxlID0gZnVuY3Rpb24ocHJvcHMpe1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgY3NzKHRoaXMuZWxzW2ldLCBwcm9wcyk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCBDU1MgYHByb3BgIHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5nZXRTdHlsZSA9IGZ1bmN0aW9uKHByb3Ape1xuICB2YXIgZWwgPSB0aGlzLmVsc1swXTtcbiAgaWYgKGVsKSByZXR1cm4gZWwuc3R5bGVbcHJvcF07XG59O1xuXG4vKipcbiAqIEZpbmQgY2hpbGRyZW4gbWF0Y2hpbmcgdGhlIGdpdmVuIGBzZWxlY3RvcmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24oc2VsZWN0b3Ipe1xuICByZXR1cm4gZG9tKHNlbGVjdG9yLCB0aGlzKTtcbn07XG5cbi8qKlxuICogRW1wdHkgdGhlIGRvbSBsaXN0XG4gKlxuICogQHJldHVybiBzZWxmXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLmVtcHR5ID0gZnVuY3Rpb24oKXtcbiAgdmFyIGVsZW0sIGVsO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbHMubGVuZ3RoOyArK2kpIHtcbiAgICBlbCA9IHRoaXMuZWxzW2ldO1xuICAgIHdoaWxlIChlbC5maXJzdENoaWxkKSB7XG4gICAgICBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZmlyc3QgZWxlbWVudCBtYXRjaGVzIGBzZWxlY3RvcmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5pcyA9IGZ1bmN0aW9uKHNlbGVjdG9yKXtcbiAgcmV0dXJuIG1hdGNoZXModGhpcy5nZXQoMCksIHNlbGVjdG9yKTtcbn07XG5cbi8qKlxuICogR2V0IHBhcmVudChzKSB3aXRoIG9wdGlvbmFsIGBzZWxlY3RvcmAgYW5kIGBsaW1pdGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7TnVtYmVyfSBsaW1pdFxuICogQHJldHVybiB7TGlzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTGlzdC5wcm90b3R5cGUucGFyZW50ID0gZnVuY3Rpb24oc2VsZWN0b3IsIGxpbWl0KXtcbiAgcmV0dXJuIG5ldyBMaXN0KHRyYXZlcnNlKCdwYXJlbnROb2RlJyxcbiAgICB0aGlzLmdldCgwKSxcbiAgICBzZWxlY3RvcixcbiAgICBsaW1pdFxuICAgIHx8IDEpKTtcbn07XG5cbi8qKlxuICogR2V0IG5leHQgZWxlbWVudChzKSB3aXRoIG9wdGlvbmFsIGBzZWxlY3RvcmAgYW5kIGBsaW1pdGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge051bWJlcn0gbGltaXRcbiAqIEByZXRydW4ge0xpc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkxpc3QucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbihzZWxlY3RvciwgbGltaXQpe1xuICByZXR1cm4gbmV3IExpc3QodHJhdmVyc2UoJ25leHRTaWJsaW5nJyxcbiAgICB0aGlzLmdldCgwKSxcbiAgICBzZWxlY3RvcixcbiAgICBsaW1pdFxuICAgIHx8IDEpKTtcbn07XG5cbi8qKlxuICogR2V0IHByZXZpb3VzIGVsZW1lbnQocykgd2l0aCBvcHRpb25hbCBgc2VsZWN0b3JgIGFuZCBgbGltaXRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvclxuICogQHBhcmFtIHtOdW1iZXJ9IGxpbWl0XG4gKiBAcmV0dXJuIHtMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5MaXN0LnByb3RvdHlwZS5wcmV2ID1cbkxpc3QucHJvdG90eXBlLnByZXZpb3VzID0gZnVuY3Rpb24oc2VsZWN0b3IsIGxpbWl0KXtcbiAgcmV0dXJuIG5ldyBMaXN0KHRyYXZlcnNlKCdwcmV2aW91c1NpYmxpbmcnLFxuICAgIHRoaXMuZ2V0KDApLFxuICAgIHNlbGVjdG9yLFxuICAgIGxpbWl0XG4gICAgfHwgMSkpO1xufTtcblxuLyoqXG4gKiBBdHRyaWJ1dGUgYWNjZXNzb3JzLlxuICovXG5cbmF0dHJzLmZvckVhY2goZnVuY3Rpb24obmFtZSl7XG4gIExpc3QucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24odmFsKXtcbiAgICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5hdHRyKG5hbWUpO1xuICAgIHJldHVybiB0aGlzLmF0dHIobmFtZSwgdmFsKTtcbiAgfTtcbn0pO1xuXG4vKipcbiAqIFdhbGsgRG9tIGBub2RlYCBhbmQgY2FsbCBgZnVuY2AuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRvbU5vZGUsIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm4gbnVsbFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gd2Fsa0RPTShub2RlLCBmdW5jKXtcbiAgdmFyIGdvID0gZnVuYyhub2RlKTtcbiAgaWYoZ28pe1xuICAgIG5vZGUgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgd2hpbGUgKG5vZGUpe1xuICAgICAgd2Fsa0RPTShub2RlLCBmdW5jKTtcbiAgICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgfVxufTtcblxuIiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBpbmRleCA9IHJlcXVpcmUoJ2luZGV4b2YnKTtcblxuLyoqXG4gKiBXaGl0ZXNwYWNlIHJlZ2V4cC5cbiAqL1xuXG52YXIgcmUgPSAvXFxzKy87XG5cbi8qKlxuICogdG9TdHJpbmcgcmVmZXJlbmNlLlxuICovXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogV3JhcCBgZWxgIGluIGEgYENsYXNzTGlzdGAuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHJldHVybiB7Q2xhc3NMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsKXtcbiAgcmV0dXJuIG5ldyBDbGFzc0xpc3QoZWwpO1xufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IENsYXNzTGlzdCBmb3IgYGVsYC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBDbGFzc0xpc3QoZWwpIHtcbiAgaWYgKCFlbCkgdGhyb3cgbmV3IEVycm9yKCdBIERPTSBlbGVtZW50IHJlZmVyZW5jZSBpcyByZXF1aXJlZCcpO1xuICB0aGlzLmVsID0gZWw7XG4gIHRoaXMubGlzdCA9IGVsLmNsYXNzTGlzdDtcbn1cblxuLyoqXG4gKiBBZGQgY2xhc3MgYG5hbWVgIGlmIG5vdCBhbHJlYWR5IHByZXNlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0NsYXNzTGlzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuQ2xhc3NMaXN0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihuYW1lKXtcbiAgLy8gY2xhc3NMaXN0XG4gIGlmICh0aGlzLmxpc3QpIHtcbiAgICB0aGlzLmxpc3QuYWRkKG5hbWUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZmFsbGJhY2tcbiAgdmFyIGFyciA9IHRoaXMuYXJyYXkoKTtcbiAgdmFyIGkgPSBpbmRleChhcnIsIG5hbWUpO1xuICBpZiAoIX5pKSBhcnIucHVzaChuYW1lKTtcbiAgdGhpcy5lbC5jbGFzc05hbWUgPSBhcnIuam9pbignICcpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGNsYXNzIGBuYW1lYCB3aGVuIHByZXNlbnQsIG9yXG4gKiBwYXNzIGEgcmVndWxhciBleHByZXNzaW9uIHRvIHJlbW92ZVxuICogYW55IHdoaWNoIG1hdGNoLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cH0gbmFtZVxuICogQHJldHVybiB7Q2xhc3NMaXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5DbGFzc0xpc3QucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5hbWUpe1xuICBpZiAoJ1tvYmplY3QgUmVnRXhwXScgPT0gdG9TdHJpbmcuY2FsbChuYW1lKSkge1xuICAgIHJldHVybiB0aGlzLnJlbW92ZU1hdGNoaW5nKG5hbWUpO1xuICB9XG5cbiAgLy8gY2xhc3NMaXN0XG4gIGlmICh0aGlzLmxpc3QpIHtcbiAgICB0aGlzLmxpc3QucmVtb3ZlKG5hbWUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZmFsbGJhY2tcbiAgdmFyIGFyciA9IHRoaXMuYXJyYXkoKTtcbiAgdmFyIGkgPSBpbmRleChhcnIsIG5hbWUpO1xuICBpZiAofmkpIGFyci5zcGxpY2UoaSwgMSk7XG4gIHRoaXMuZWwuY2xhc3NOYW1lID0gYXJyLmpvaW4oJyAnKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgY2xhc3NlcyBtYXRjaGluZyBgcmVgLlxuICpcbiAqIEBwYXJhbSB7UmVnRXhwfSByZVxuICogQHJldHVybiB7Q2xhc3NMaXN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuQ2xhc3NMaXN0LnByb3RvdHlwZS5yZW1vdmVNYXRjaGluZyA9IGZ1bmN0aW9uKHJlKXtcbiAgdmFyIGFyciA9IHRoaXMuYXJyYXkoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAocmUudGVzdChhcnJbaV0pKSB7XG4gICAgICB0aGlzLnJlbW92ZShhcnJbaV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVG9nZ2xlIGNsYXNzIGBuYW1lYCwgY2FuIGZvcmNlIHN0YXRlIHZpYSBgZm9yY2VgLlxuICpcbiAqIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgY2xhc3NMaXN0LCBidXQgZG8gbm90IHN1cHBvcnQgYGZvcmNlYCB5ZXQsXG4gKiB0aGUgbWlzdGFrZSB3aWxsIGJlIGRldGVjdGVkIGFuZCBjb3JyZWN0ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2VcbiAqIEByZXR1cm4ge0NsYXNzTGlzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuQ2xhc3NMaXN0LnByb3RvdHlwZS50b2dnbGUgPSBmdW5jdGlvbihuYW1lLCBmb3JjZSl7XG4gIC8vIGNsYXNzTGlzdFxuICBpZiAodGhpcy5saXN0KSB7XG4gICAgaWYgKFwidW5kZWZpbmVkXCIgIT09IHR5cGVvZiBmb3JjZSkge1xuICAgICAgaWYgKGZvcmNlICE9PSB0aGlzLmxpc3QudG9nZ2xlKG5hbWUsIGZvcmNlKSkge1xuICAgICAgICB0aGlzLmxpc3QudG9nZ2xlKG5hbWUpOyAvLyB0b2dnbGUgYWdhaW4gdG8gY29ycmVjdFxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpc3QudG9nZ2xlKG5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGZhbGxiYWNrXG4gIGlmIChcInVuZGVmaW5lZFwiICE9PSB0eXBlb2YgZm9yY2UpIHtcbiAgICBpZiAoIWZvcmNlKSB7XG4gICAgICB0aGlzLnJlbW92ZShuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGQobmFtZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICh0aGlzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5yZW1vdmUobmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkKG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYW4gYXJyYXkgb2YgY2xhc3Nlcy5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuQ2xhc3NMaXN0LnByb3RvdHlwZS5hcnJheSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzdHIgPSB0aGlzLmVsLmNsYXNzTmFtZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG4gIHZhciBhcnIgPSBzdHIuc3BsaXQocmUpO1xuICBpZiAoJycgPT09IGFyclswXSkgYXJyLnNoaWZ0KCk7XG4gIHJldHVybiBhcnI7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGNsYXNzIGBuYW1lYCBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJuIHtDbGFzc0xpc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkNsYXNzTGlzdC5wcm90b3R5cGUuaGFzID1cbkNsYXNzTGlzdC5wcm90b3R5cGUuY29udGFpbnMgPSBmdW5jdGlvbihuYW1lKXtcbiAgcmV0dXJuIHRoaXMubGlzdFxuICAgID8gdGhpcy5saXN0LmNvbnRhaW5zKG5hbWUpXG4gICAgOiAhISB+aW5kZXgodGhpcy5hcnJheSgpLCBuYW1lKTtcbn07XG4iLCIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIGNsb3Nlc3QgPSByZXF1aXJlKCdjbG9zZXN0JylcbiAgLCBldmVudCA9IHJlcXVpcmUoJ2V2ZW50Jyk7XG5cbi8qKlxuICogRGVsZWdhdGUgZXZlbnQgYHR5cGVgIHRvIGBzZWxlY3RvcmBcbiAqIGFuZCBpbnZva2UgYGZuKGUpYC4gQSBjYWxsYmFjayBmdW5jdGlvblxuICogaXMgcmV0dXJuZWQgd2hpY2ggbWF5IGJlIHBhc3NlZCB0byBgLnVuYmluZCgpYC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtCb29sZWFufSBjYXB0dXJlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZXhwb3J0cy5iaW5kID0gZnVuY3Rpb24oZWwsIHNlbGVjdG9yLCB0eXBlLCBmbiwgY2FwdHVyZSl7XG4gIHJldHVybiBldmVudC5iaW5kKGVsLCB0eXBlLCBmdW5jdGlvbihlKXtcbiAgICB2YXIgdGFyZ2V0ID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgIGUuZGVsZWdhdGVUYXJnZXQgPSBjbG9zZXN0KHRhcmdldCwgc2VsZWN0b3IsIHRydWUsIGVsKTtcbiAgICBpZiAoZS5kZWxlZ2F0ZVRhcmdldCkgZm4uY2FsbChlbCwgZSk7XG4gIH0sIGNhcHR1cmUpO1xufTtcblxuLyoqXG4gKiBVbmJpbmQgZXZlbnQgYHR5cGVgJ3MgY2FsbGJhY2sgYGZuYC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gY2FwdHVyZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLnVuYmluZCA9IGZ1bmN0aW9uKGVsLCB0eXBlLCBmbiwgY2FwdHVyZSl7XG4gIGV2ZW50LnVuYmluZChlbCwgdHlwZSwgZm4sIGNhcHR1cmUpO1xufTtcbiIsInZhciBtYXRjaGVzID0gcmVxdWlyZSgnbWF0Y2hlcy1zZWxlY3RvcicpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGVsZW1lbnQsIHNlbGVjdG9yLCBjaGVja1lvU2VsZiwgcm9vdCkge1xuICBlbGVtZW50ID0gY2hlY2tZb1NlbGYgPyB7cGFyZW50Tm9kZTogZWxlbWVudH0gOiBlbGVtZW50XG5cbiAgcm9vdCA9IHJvb3QgfHwgZG9jdW1lbnRcblxuICAvLyBNYWtlIHN1cmUgYGVsZW1lbnQgIT09IGRvY3VtZW50YCBhbmQgYGVsZW1lbnQgIT0gbnVsbGBcbiAgLy8gb3RoZXJ3aXNlIHdlIGdldCBhbiBpbGxlZ2FsIGludm9jYXRpb25cbiAgd2hpbGUgKChlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlKSAmJiBlbGVtZW50ICE9PSBkb2N1bWVudCkge1xuICAgIGlmIChtYXRjaGVzKGVsZW1lbnQsIHNlbGVjdG9yKSlcbiAgICAgIHJldHVybiBlbGVtZW50XG4gICAgLy8gQWZ0ZXIgYG1hdGNoZXNgIG9uIHRoZSBlZGdlIGNhc2UgdGhhdFxuICAgIC8vIHRoZSBzZWxlY3RvciBtYXRjaGVzIHRoZSByb290XG4gICAgLy8gKHdoZW4gdGhlIHJvb3QgaXMgbm90IHRoZSBkb2N1bWVudClcbiAgICBpZiAoZWxlbWVudCA9PT0gcm9vdClcbiAgICAgIHJldHVybiAgXG4gIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBwcm90byA9IEVsZW1lbnQucHJvdG90eXBlO1xudmFyIHZlbmRvciA9IHByb3RvLm1hdGNoZXNcbiAgfHwgcHJvdG8ubWF0Y2hlc1NlbGVjdG9yXG4gIHx8IHByb3RvLndlYmtpdE1hdGNoZXNTZWxlY3RvclxuICB8fCBwcm90by5tb3pNYXRjaGVzU2VsZWN0b3JcbiAgfHwgcHJvdG8ubXNNYXRjaGVzU2VsZWN0b3JcbiAgfHwgcHJvdG8ub01hdGNoZXNTZWxlY3RvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBtYXRjaDtcblxuLyoqXG4gKiBNYXRjaCBgZWxgIHRvIGBzZWxlY3RvcmAuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBtYXRjaChlbCwgc2VsZWN0b3IpIHtcbiAgaWYgKHZlbmRvcikgcmV0dXJuIHZlbmRvci5jYWxsKGVsLCBzZWxlY3Rvcik7XG4gIHZhciBub2RlcyA9IGVsLnBhcmVudE5vZGUucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobm9kZXNbaV0gPT0gZWwpIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn0iLCJcbi8qKlxuICogRXhwb3NlIGBwYXJzZWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZTtcblxuLyoqXG4gKiBXcmFwIG1hcCBmcm9tIGpxdWVyeS5cbiAqL1xuXG52YXIgbWFwID0ge1xuICBsZWdlbmQ6IFsxLCAnPGZpZWxkc2V0PicsICc8L2ZpZWxkc2V0PiddLFxuICB0cjogWzIsICc8dGFibGU+PHRib2R5PicsICc8L3Rib2R5PjwvdGFibGU+J10sXG4gIGNvbDogWzIsICc8dGFibGU+PHRib2R5PjwvdGJvZHk+PGNvbGdyb3VwPicsICc8L2NvbGdyb3VwPjwvdGFibGU+J10sXG4gIF9kZWZhdWx0OiBbMCwgJycsICcnXVxufTtcblxubWFwLnRkID1cbm1hcC50aCA9IFszLCAnPHRhYmxlPjx0Ym9keT48dHI+JywgJzwvdHI+PC90Ym9keT48L3RhYmxlPiddO1xuXG5tYXAub3B0aW9uID1cbm1hcC5vcHRncm91cCA9IFsxLCAnPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+JywgJzwvc2VsZWN0PiddO1xuXG5tYXAudGhlYWQgPVxubWFwLnRib2R5ID1cbm1hcC5jb2xncm91cCA9XG5tYXAuY2FwdGlvbiA9XG5tYXAudGZvb3QgPSBbMSwgJzx0YWJsZT4nLCAnPC90YWJsZT4nXTtcblxubWFwLnRleHQgPVxubWFwLmNpcmNsZSA9XG5tYXAuZWxsaXBzZSA9XG5tYXAubGluZSA9XG5tYXAucGF0aCA9XG5tYXAucG9seWdvbiA9XG5tYXAucG9seWxpbmUgPVxubWFwLnJlY3QgPSBbMSwgJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZlcnNpb249XCIxLjFcIj4nLCc8L3N2Zz4nXTtcblxuLyoqXG4gKiBQYXJzZSBgaHRtbGAgYW5kIHJldHVybiB0aGUgY2hpbGRyZW4uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2UoaHRtbCkge1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIGh0bWwpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1N0cmluZyBleHBlY3RlZCcpO1xuICBcbiAgLy8gdGFnIG5hbWVcbiAgdmFyIG0gPSAvPChbXFx3Ol0rKS8uZXhlYyhodG1sKTtcbiAgaWYgKCFtKSByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoaHRtbCk7XG5cbiAgaHRtbCA9IGh0bWwucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpOyAvLyBSZW1vdmUgbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlXG5cbiAgdmFyIHRhZyA9IG1bMV07XG5cbiAgLy8gYm9keSBzdXBwb3J0XG4gIGlmICh0YWcgPT0gJ2JvZHknKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaHRtbCcpO1xuICAgIGVsLmlubmVySFRNTCA9IGh0bWw7XG4gICAgcmV0dXJuIGVsLnJlbW92ZUNoaWxkKGVsLmxhc3RDaGlsZCk7XG4gIH1cblxuICAvLyB3cmFwIG1hcFxuICB2YXIgd3JhcCA9IG1hcFt0YWddIHx8IG1hcC5fZGVmYXVsdDtcbiAgdmFyIGRlcHRoID0gd3JhcFswXTtcbiAgdmFyIHByZWZpeCA9IHdyYXBbMV07XG4gIHZhciBzdWZmaXggPSB3cmFwWzJdO1xuICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZWwuaW5uZXJIVE1MID0gcHJlZml4ICsgaHRtbCArIHN1ZmZpeDtcbiAgd2hpbGUgKGRlcHRoLS0pIGVsID0gZWwubGFzdENoaWxkO1xuXG4gIC8vIG9uZSBlbGVtZW50XG4gIGlmIChlbC5maXJzdENoaWxkID09IGVsLmxhc3RDaGlsZCkge1xuICAgIHJldHVybiBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcbiAgfVxuXG4gIC8vIHNldmVyYWwgZWxlbWVudHNcbiAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpKTtcbiAgfVxuXG4gIHJldHVybiBmcmFnbWVudDtcbn1cbiIsInZhciBiaW5kID0gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgPyAnYWRkRXZlbnRMaXN0ZW5lcicgOiAnYXR0YWNoRXZlbnQnLFxuICAgIHVuYmluZCA9IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyID8gJ3JlbW92ZUV2ZW50TGlzdGVuZXInIDogJ2RldGFjaEV2ZW50JyxcbiAgICBwcmVmaXggPSBiaW5kICE9PSAnYWRkRXZlbnRMaXN0ZW5lcicgPyAnb24nIDogJyc7XG5cbi8qKlxuICogQmluZCBgZWxgIGV2ZW50IGB0eXBlYCB0byBgZm5gLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtCb29sZWFufSBjYXB0dXJlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZXhwb3J0cy5iaW5kID0gZnVuY3Rpb24oZWwsIHR5cGUsIGZuLCBjYXB0dXJlKXtcbiAgZWxbYmluZF0ocHJlZml4ICsgdHlwZSwgZm4sIGNhcHR1cmUgfHwgZmFsc2UpO1xuICByZXR1cm4gZm47XG59O1xuXG4vKipcbiAqIFVuYmluZCBgZWxgIGV2ZW50IGB0eXBlYCdzIGNhbGxiYWNrIGBmbmAuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGNhcHR1cmVcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLnVuYmluZCA9IGZ1bmN0aW9uKGVsLCB0eXBlLCBmbiwgY2FwdHVyZSl7XG4gIGVsW3VuYmluZF0ocHJlZml4ICsgdHlwZSwgZm4sIGNhcHR1cmUgfHwgZmFsc2UpO1xuICByZXR1cm4gZm47XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXJyLCBvYmope1xuICBpZiAoYXJyLmluZGV4T2YpIHJldHVybiBhcnIuaW5kZXhPZihvYmopO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgIGlmIChhcnJbaV0gPT09IG9iaikgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufTsiLCIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHF1ZXJ5ID0gcmVxdWlyZSgncXVlcnknKTtcblxuLyoqXG4gKiBFbGVtZW50IHByb3RvdHlwZS5cbiAqL1xuXG52YXIgcHJvdG8gPSBFbGVtZW50LnByb3RvdHlwZTtcblxuLyoqXG4gKiBWZW5kb3IgZnVuY3Rpb24uXG4gKi9cblxudmFyIHZlbmRvciA9IHByb3RvLm1hdGNoZXNcbiAgfHwgcHJvdG8ud2Via2l0TWF0Y2hlc1NlbGVjdG9yXG4gIHx8IHByb3RvLm1vek1hdGNoZXNTZWxlY3RvclxuICB8fCBwcm90by5tc01hdGNoZXNTZWxlY3RvclxuICB8fCBwcm90by5vTWF0Y2hlc1NlbGVjdG9yO1xuXG4vKipcbiAqIEV4cG9zZSBgbWF0Y2goKWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBtYXRjaDtcblxuLyoqXG4gKiBNYXRjaCBgZWxgIHRvIGBzZWxlY3RvcmAuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBtYXRjaChlbCwgc2VsZWN0b3IpIHtcbiAgaWYgKHZlbmRvcikgcmV0dXJuIHZlbmRvci5jYWxsKGVsLCBzZWxlY3Rvcik7XG4gIHZhciBub2RlcyA9IHF1ZXJ5LmFsbChzZWxlY3RvciwgZWwucGFyZW50Tm9kZSk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZXNbaV0gPT0gZWwpIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsImZ1bmN0aW9uIG9uZShzZWxlY3RvciwgZWwpIHtcbiAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xufVxuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWxlY3RvciwgZWwpe1xuICBlbCA9IGVsIHx8IGRvY3VtZW50O1xuICByZXR1cm4gb25lKHNlbGVjdG9yLCBlbCk7XG59O1xuXG5leHBvcnRzLmFsbCA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBlbCl7XG4gIGVsID0gZWwgfHwgZG9jdW1lbnQ7XG4gIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbn07XG5cbmV4cG9ydHMuZW5naW5lID0gZnVuY3Rpb24ob2JqKXtcbiAgaWYgKCFvYmoub25lKSB0aHJvdyBuZXcgRXJyb3IoJy5vbmUgY2FsbGJhY2sgcmVxdWlyZWQnKTtcbiAgaWYgKCFvYmouYWxsKSB0aHJvdyBuZXcgRXJyb3IoJy5hbGwgY2FsbGJhY2sgcmVxdWlyZWQnKTtcbiAgb25lID0gb2JqLm9uZTtcbiAgZXhwb3J0cy5hbGwgPSBvYmouYWxsO1xuICByZXR1cm4gZXhwb3J0cztcbn07XG4iLCJcbi8qKlxuICogdG9TdHJpbmcgcmVmLlxuICovXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogUmV0dXJuIHRoZSB0eXBlIG9mIGB2YWxgLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCl7XG4gIHN3aXRjaCAodG9TdHJpbmcuY2FsbCh2YWwpKSB7XG4gICAgY2FzZSAnW29iamVjdCBGdW5jdGlvbl0nOiByZXR1cm4gJ2Z1bmN0aW9uJztcbiAgICBjYXNlICdbb2JqZWN0IERhdGVdJzogcmV0dXJuICdkYXRlJztcbiAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOiByZXR1cm4gJ3JlZ2V4cCc7XG4gICAgY2FzZSAnW29iamVjdCBBcmd1bWVudHNdJzogcmV0dXJuICdhcmd1bWVudHMnO1xuICAgIGNhc2UgJ1tvYmplY3QgQXJyYXldJzogcmV0dXJuICdhcnJheSc7XG4gICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzogcmV0dXJuICdzdHJpbmcnO1xuICB9XG5cbiAgaWYgKHZhbCA9PT0gbnVsbCkgcmV0dXJuICdudWxsJztcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJ3VuZGVmaW5lZCc7XG4gIGlmICh2YWwgJiYgdmFsLm5vZGVUeXBlID09PSAxKSByZXR1cm4gJ2VsZW1lbnQnO1xuICBpZiAodmFsID09PSBPYmplY3QodmFsKSkgcmV0dXJuICdvYmplY3QnO1xuXG4gIHJldHVybiB0eXBlb2YgdmFsO1xufTtcbiIsIlxuLyoqXG4gKiBQcm9wZXJ0aWVzIHRvIGlnbm9yZSBhcHBlbmRpbmcgXCJweFwiLlxuICovXG5cbnZhciBpZ25vcmUgPSB7XG4gIGNvbHVtbkNvdW50OiB0cnVlLFxuICBmaWxsT3BhY2l0eTogdHJ1ZSxcbiAgZm9udFdlaWdodDogdHJ1ZSxcbiAgbGluZUhlaWdodDogdHJ1ZSxcbiAgb3BhY2l0eTogdHJ1ZSxcbiAgb3JwaGFuczogdHJ1ZSxcbiAgd2lkb3dzOiB0cnVlLFxuICB6SW5kZXg6IHRydWUsXG4gIHpvb206IHRydWVcbn07XG5cbi8qKlxuICogU2V0IGBlbGAgY3NzIHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtFbGVtZW50fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsLCBvYmope1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgdmFyIHZhbCA9IG9ialtrZXldO1xuICAgIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgdmFsICYmICFpZ25vcmVba2V5XSkgdmFsICs9ICdweCc7XG4gICAgZWwuc3R5bGVba2V5XSA9IHZhbDtcbiAgfVxuICByZXR1cm4gZWw7XG59O1xuIiwiXG4vKipcbiAqIGRlcGVuZGVuY2llc1xuICovXG5cbnZhciBtYXRjaGVzID0gcmVxdWlyZSgnbWF0Y2hlcy1zZWxlY3RvcicpO1xuXG4vKipcbiAqIFRyYXZlcnNlIHdpdGggdGhlIGdpdmVuIGBlbGAsIGBzZWxlY3RvcmAgYW5kIGBsZW5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7TnVtYmVyfSBsZW5cbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHR5cGUsIGVsLCBzZWxlY3RvciwgbGVuKXtcbiAgdmFyIGVsID0gZWxbdHlwZV1cbiAgICAsIG4gPSBsZW4gfHwgMVxuICAgICwgcmV0ID0gW107XG5cbiAgaWYgKCFlbCkgcmV0dXJuIHJldDtcblxuICBkbyB7XG4gICAgaWYgKG4gPT0gcmV0Lmxlbmd0aCkgYnJlYWs7XG4gICAgaWYgKDEgIT0gZWwubm9kZVR5cGUpIGNvbnRpbnVlO1xuICAgIGlmIChtYXRjaGVzKGVsLCBzZWxlY3RvcikpIHJldC5wdXNoKGVsKTtcbiAgICBpZiAoIXNlbGVjdG9yKSByZXQucHVzaChlbCk7XG4gIH0gd2hpbGUgKGVsID0gZWxbdHlwZV0pO1xuXG4gIHJldHVybiByZXQ7XG59XG4iLCIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHR5cGVPZiA9IHJlcXVpcmUoJ3R5cGUnKTtcblxuLyoqXG4gKiBTZXQgb3IgZ2V0IGBlbGAncycgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbCwgdmFsKXtcbiAgaWYgKDIgPT0gYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNldChlbCwgdmFsKTtcbiAgcmV0dXJuIGdldChlbCk7XG59O1xuXG4vKipcbiAqIEdldCBgZWxgJ3MgdmFsdWUuXG4gKi9cblxuZnVuY3Rpb24gZ2V0KGVsKSB7XG4gIHN3aXRjaCAodHlwZShlbCkpIHtcbiAgICBjYXNlICdjaGVja2JveCc6XG4gICAgY2FzZSAncmFkaW8nOlxuICAgICAgaWYgKGVsLmNoZWNrZWQpIHtcbiAgICAgICAgdmFyIGF0dHIgPSBlbC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XG4gICAgICAgIHJldHVybiBudWxsID09IGF0dHIgPyB0cnVlIDogYXR0cjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICBjYXNlICdyYWRpb2dyb3VwJzpcbiAgICAgIGZvciAodmFyIGkgPSAwLCByYWRpbzsgcmFkaW8gPSBlbFtpXTsgaSsrKSB7XG4gICAgICAgIGlmIChyYWRpby5jaGVja2VkKSByZXR1cm4gcmFkaW8udmFsdWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBvcHRpb247IG9wdGlvbiA9IGVsLm9wdGlvbnNbaV07IGkrKykge1xuICAgICAgICBpZiAob3B0aW9uLnNlbGVjdGVkKSB2YWxzLnB1c2gob3B0aW9uLnZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAodmFscy5sZW5ndGg9PT0xID8gdmFsc1swXSA6IHZhbHMpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBlbC52YWx1ZTtcbiAgfVxufVxuXG4vKipcbiAqIFNldCBgZWxgJ3MgdmFsdWUuXG4gKi9cblxuXG5mdW5jdGlvbiBzZXQoZWwsIHZhbCkge1xuICBzd2l0Y2ggKHR5cGUoZWwpKSB7XG4gICAgY2FzZSAnY2hlY2tib3gnOlxuICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgIGVsLmNoZWNrZWQgPSAodmFsID09PSB0cnVlID8gdHJ1ZSA6ICh2YWwgPT0gZWwuZ2V0QXR0cmlidXRlKCd2YWx1ZScpKSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyYWRpb2dyb3VwJzpcbiAgICAgIGZvciAodmFyIGkgPSAwLCByYWRpbzsgcmFkaW8gPSBlbFtpXTsgaSsrKSB7XG4gICAgICAgIHJhZGlvLmNoZWNrZWQgPSByYWRpby52YWx1ZSA9PT0gdmFsO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIHZhciB2YWxzID0gKCdhcnJheScgPT0gdHlwZU9mKHZhbCkgPyB2YWwgOiBbdmFsXSksIGZvdW5kO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIG9wdGlvbjsgb3B0aW9uID0gZWwub3B0aW9uc1tpXTsgaSsrKSB7XG4gICAgICAgIGZvdW5kID0gMDtcbiAgICAgICAgZm9yICh2YXIgaiA9IDAsIHY7IHYgPSB2YWxzW2pdOyBqKyspe1xuICAgICAgICAgIGZvdW5kIHw9IHYgPT09IG9wdGlvbi52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSAoZm91bmQgPT09IDEpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGVsLnZhbHVlID0gdmFsO1xuICB9XG59XG5cbi8qKlxuICogRWxlbWVudCB0eXBlLlxuICovXG5cbmZ1bmN0aW9uIHR5cGUoZWwpIHtcbiAgdmFyIGdyb3VwID0gJ2FycmF5JyA9PSB0eXBlT2YoZWwpIHx8ICdvYmplY3QnID09IHR5cGVPZihlbCk7XG4gIGlmIChncm91cCkgZWwgPSBlbFswXTtcbiAgdmFyIG5hbWUgPSBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgdHlwZSA9IGVsLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuXG4gIGlmIChncm91cCAmJiB0eXBlICYmICdyYWRpbycgPT0gdHlwZS50b0xvd2VyQ2FzZSgpKSByZXR1cm4gJ3JhZGlvZ3JvdXAnO1xuICBpZiAoJ2lucHV0JyA9PSBuYW1lICYmIHR5cGUgJiYgJ2NoZWNrYm94JyA9PSB0eXBlLnRvTG93ZXJDYXNlKCkpIHJldHVybiAnY2hlY2tib3gnO1xuICBpZiAoJ2lucHV0JyA9PSBuYW1lICYmIHR5cGUgJiYgJ3JhZGlvJyA9PSB0eXBlLnRvTG93ZXJDYXNlKCkpIHJldHVybiAncmFkaW8nO1xuICBpZiAoJ3NlbGVjdCcgPT0gbmFtZSkgcmV0dXJuICdzZWxlY3QnO1xuICByZXR1cm4gbmFtZTtcbn1cbiIsIlxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gdHJpbTtcblxuZnVuY3Rpb24gdHJpbShzdHIpe1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMqfFxccyokL2csICcnKTtcbn1cblxuZXhwb3J0cy5sZWZ0ID0gZnVuY3Rpb24oc3RyKXtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzKi8sICcnKTtcbn07XG5cbmV4cG9ydHMucmlnaHQgPSBmdW5jdGlvbihzdHIpe1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1xccyokLywgJycpO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8qKlxuICogbWFya2VkIC0gYSBtYXJrZG93biBwYXJzZXJcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDE0LCBDaHJpc3RvcGhlciBKZWZmcmV5LiAoTUlUIExpY2Vuc2VkKVxuICogaHR0cHM6Ly9naXRodWIuY29tL2NoamovbWFya2VkXG4gKi9cblxuOyhmdW5jdGlvbigpIHtcblxuLyoqXG4gKiBCbG9jay1MZXZlbCBHcmFtbWFyXG4gKi9cblxudmFyIGJsb2NrID0ge1xuICBuZXdsaW5lOiAvXlxcbisvLFxuICBjb2RlOiAvXiggezR9W15cXG5dK1xcbiopKy8sXG4gIGZlbmNlczogbm9vcCxcbiAgaHI6IC9eKCAqWy0qX10pezMsfSAqKD86XFxuK3wkKS8sXG4gIGhlYWRpbmc6IC9eICooI3sxLDZ9KSAqKFteXFxuXSs/KSAqIyogKig/Olxcbit8JCkvLFxuICBucHRhYmxlOiBub29wLFxuICBsaGVhZGluZzogL14oW15cXG5dKylcXG4gKig9fC0pezIsfSAqKD86XFxuK3wkKS8sXG4gIGJsb2NrcXVvdGU6IC9eKCAqPlteXFxuXSsoXFxuKD8hZGVmKVteXFxuXSspKlxcbiopKy8sXG4gIGxpc3Q6IC9eKCAqKShidWxsKSBbXFxzXFxTXSs/KD86aHJ8ZGVmfFxcbnsyLH0oPyEgKSg/IVxcMWJ1bGwgKVxcbip8XFxzKiQpLyxcbiAgaHRtbDogL14gKig/OmNvbW1lbnQgKig/OlxcbnxcXHMqJCl8Y2xvc2VkICooPzpcXG57Mix9fFxccyokKXxjbG9zaW5nICooPzpcXG57Mix9fFxccyokKSkvLFxuICBkZWY6IC9eICpcXFsoW15cXF1dKylcXF06ICo8PyhbXlxccz5dKyk+Pyg/OiArW1wiKF0oW15cXG5dKylbXCIpXSk/ICooPzpcXG4rfCQpLyxcbiAgdGFibGU6IG5vb3AsXG4gIHBhcmFncmFwaDogL14oKD86W15cXG5dK1xcbj8oPyFocnxoZWFkaW5nfGxoZWFkaW5nfGJsb2NrcXVvdGV8dGFnfGRlZikpKylcXG4qLyxcbiAgdGV4dDogL15bXlxcbl0rL1xufTtcblxuYmxvY2suYnVsbGV0ID0gLyg/OlsqKy1dfFxcZCtcXC4pLztcbmJsb2NrLml0ZW0gPSAvXiggKikoYnVsbCkgW15cXG5dKig/Olxcbig/IVxcMWJ1bGwgKVteXFxuXSopKi87XG5ibG9jay5pdGVtID0gcmVwbGFjZShibG9jay5pdGVtLCAnZ20nKVxuICAoL2J1bGwvZywgYmxvY2suYnVsbGV0KVxuICAoKTtcblxuYmxvY2subGlzdCA9IHJlcGxhY2UoYmxvY2subGlzdClcbiAgKC9idWxsL2csIGJsb2NrLmJ1bGxldClcbiAgKCdocicsICdcXFxcbisoPz1cXFxcMT8oPzpbLSpfXSAqKXszLH0oPzpcXFxcbit8JCkpJylcbiAgKCdkZWYnLCAnXFxcXG4rKD89JyArIGJsb2NrLmRlZi5zb3VyY2UgKyAnKScpXG4gICgpO1xuXG5ibG9jay5ibG9ja3F1b3RlID0gcmVwbGFjZShibG9jay5ibG9ja3F1b3RlKVxuICAoJ2RlZicsIGJsb2NrLmRlZilcbiAgKCk7XG5cbmJsb2NrLl90YWcgPSAnKD8hKD86J1xuICArICdhfGVtfHN0cm9uZ3xzbWFsbHxzfGNpdGV8cXxkZm58YWJicnxkYXRhfHRpbWV8Y29kZSdcbiAgKyAnfHZhcnxzYW1wfGtiZHxzdWJ8c3VwfGl8Ynx1fG1hcmt8cnVieXxydHxycHxiZGl8YmRvJ1xuICArICd8c3Bhbnxicnx3YnJ8aW5zfGRlbHxpbWcpXFxcXGIpXFxcXHcrKD8hOi98W15cXFxcd1xcXFxzQF0qQClcXFxcYic7XG5cbmJsb2NrLmh0bWwgPSByZXBsYWNlKGJsb2NrLmh0bWwpXG4gICgnY29tbWVudCcsIC88IS0tW1xcc1xcU10qPy0tPi8pXG4gICgnY2xvc2VkJywgLzwodGFnKVtcXHNcXFNdKz88XFwvXFwxPi8pXG4gICgnY2xvc2luZycsIC88dGFnKD86XCJbXlwiXSpcInwnW14nXSonfFteJ1wiPl0pKj8+LylcbiAgKC90YWcvZywgYmxvY2suX3RhZylcbiAgKCk7XG5cbmJsb2NrLnBhcmFncmFwaCA9IHJlcGxhY2UoYmxvY2sucGFyYWdyYXBoKVxuICAoJ2hyJywgYmxvY2suaHIpXG4gICgnaGVhZGluZycsIGJsb2NrLmhlYWRpbmcpXG4gICgnbGhlYWRpbmcnLCBibG9jay5saGVhZGluZylcbiAgKCdibG9ja3F1b3RlJywgYmxvY2suYmxvY2txdW90ZSlcbiAgKCd0YWcnLCAnPCcgKyBibG9jay5fdGFnKVxuICAoJ2RlZicsIGJsb2NrLmRlZilcbiAgKCk7XG5cbi8qKlxuICogTm9ybWFsIEJsb2NrIEdyYW1tYXJcbiAqL1xuXG5ibG9jay5ub3JtYWwgPSBtZXJnZSh7fSwgYmxvY2spO1xuXG4vKipcbiAqIEdGTSBCbG9jayBHcmFtbWFyXG4gKi9cblxuYmxvY2suZ2ZtID0gbWVyZ2Uoe30sIGJsb2NrLm5vcm1hbCwge1xuICBmZW5jZXM6IC9eICooYHszLH18fnszLH0pICooXFxTKyk/ICpcXG4oW1xcc1xcU10rPylcXHMqXFwxICooPzpcXG4rfCQpLyxcbiAgcGFyYWdyYXBoOiAvXi9cbn0pO1xuXG5ibG9jay5nZm0ucGFyYWdyYXBoID0gcmVwbGFjZShibG9jay5wYXJhZ3JhcGgpXG4gICgnKD8hJywgJyg/ISdcbiAgICArIGJsb2NrLmdmbS5mZW5jZXMuc291cmNlLnJlcGxhY2UoJ1xcXFwxJywgJ1xcXFwyJykgKyAnfCdcbiAgICArIGJsb2NrLmxpc3Quc291cmNlLnJlcGxhY2UoJ1xcXFwxJywgJ1xcXFwzJykgKyAnfCcpXG4gICgpO1xuXG4vKipcbiAqIEdGTSArIFRhYmxlcyBCbG9jayBHcmFtbWFyXG4gKi9cblxuYmxvY2sudGFibGVzID0gbWVyZ2Uoe30sIGJsb2NrLmdmbSwge1xuICBucHRhYmxlOiAvXiAqKFxcUy4qXFx8LiopXFxuICooWy06XSsgKlxcfFstfCA6XSopXFxuKCg/Oi4qXFx8LiooPzpcXG58JCkpKilcXG4qLyxcbiAgdGFibGU6IC9eICpcXHwoLispXFxuICpcXHwoICpbLTpdK1stfCA6XSopXFxuKCg/OiAqXFx8LiooPzpcXG58JCkpKilcXG4qL1xufSk7XG5cbi8qKlxuICogQmxvY2sgTGV4ZXJcbiAqL1xuXG5mdW5jdGlvbiBMZXhlcihvcHRpb25zKSB7XG4gIHRoaXMudG9rZW5zID0gW107XG4gIHRoaXMudG9rZW5zLmxpbmtzID0ge307XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwgbWFya2VkLmRlZmF1bHRzO1xuICB0aGlzLnJ1bGVzID0gYmxvY2subm9ybWFsO1xuXG4gIGlmICh0aGlzLm9wdGlvbnMuZ2ZtKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy50YWJsZXMpIHtcbiAgICAgIHRoaXMucnVsZXMgPSBibG9jay50YWJsZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucnVsZXMgPSBibG9jay5nZm07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRXhwb3NlIEJsb2NrIFJ1bGVzXG4gKi9cblxuTGV4ZXIucnVsZXMgPSBibG9jaztcblxuLyoqXG4gKiBTdGF0aWMgTGV4IE1ldGhvZFxuICovXG5cbkxleGVyLmxleCA9IGZ1bmN0aW9uKHNyYywgb3B0aW9ucykge1xuICB2YXIgbGV4ZXIgPSBuZXcgTGV4ZXIob3B0aW9ucyk7XG4gIHJldHVybiBsZXhlci5sZXgoc3JjKTtcbn07XG5cbi8qKlxuICogUHJlcHJvY2Vzc2luZ1xuICovXG5cbkxleGVyLnByb3RvdHlwZS5sZXggPSBmdW5jdGlvbihzcmMpIHtcbiAgc3JjID0gc3JjXG4gICAgLnJlcGxhY2UoL1xcclxcbnxcXHIvZywgJ1xcbicpXG4gICAgLnJlcGxhY2UoL1xcdC9nLCAnICAgICcpXG4gICAgLnJlcGxhY2UoL1xcdTAwYTAvZywgJyAnKVxuICAgIC5yZXBsYWNlKC9cXHUyNDI0L2csICdcXG4nKTtcblxuICByZXR1cm4gdGhpcy50b2tlbihzcmMsIHRydWUpO1xufTtcblxuLyoqXG4gKiBMZXhpbmdcbiAqL1xuXG5MZXhlci5wcm90b3R5cGUudG9rZW4gPSBmdW5jdGlvbihzcmMsIHRvcCwgYnEpIHtcbiAgdmFyIHNyYyA9IHNyYy5yZXBsYWNlKC9eICskL2dtLCAnJylcbiAgICAsIG5leHRcbiAgICAsIGxvb3NlXG4gICAgLCBjYXBcbiAgICAsIGJ1bGxcbiAgICAsIGJcbiAgICAsIGl0ZW1cbiAgICAsIHNwYWNlXG4gICAgLCBpXG4gICAgLCBsO1xuXG4gIHdoaWxlIChzcmMpIHtcbiAgICAvLyBuZXdsaW5lXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMubmV3bGluZS5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBpZiAoY2FwWzBdLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhpcy50b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3NwYWNlJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjb2RlXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuY29kZS5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBjYXAgPSBjYXBbMF0ucmVwbGFjZSgvXiB7NH0vZ20sICcnKTtcbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAnY29kZScsXG4gICAgICAgIHRleHQ6ICF0aGlzLm9wdGlvbnMucGVkYW50aWNcbiAgICAgICAgICA/IGNhcC5yZXBsYWNlKC9cXG4rJC8sICcnKVxuICAgICAgICAgIDogY2FwXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGZlbmNlcyAoZ2ZtKVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmZlbmNlcy5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2NvZGUnLFxuICAgICAgICBsYW5nOiBjYXBbMl0sXG4gICAgICAgIHRleHQ6IGNhcFszXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBoZWFkaW5nXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuaGVhZGluZy5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2hlYWRpbmcnLFxuICAgICAgICBkZXB0aDogY2FwWzFdLmxlbmd0aCxcbiAgICAgICAgdGV4dDogY2FwWzJdXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRhYmxlIG5vIGxlYWRpbmcgcGlwZSAoZ2ZtKVxuICAgIGlmICh0b3AgJiYgKGNhcCA9IHRoaXMucnVsZXMubnB0YWJsZS5leGVjKHNyYykpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuXG4gICAgICBpdGVtID0ge1xuICAgICAgICB0eXBlOiAndGFibGUnLFxuICAgICAgICBoZWFkZXI6IGNhcFsxXS5yZXBsYWNlKC9eICp8ICpcXHwgKiQvZywgJycpLnNwbGl0KC8gKlxcfCAqLyksXG4gICAgICAgIGFsaWduOiBjYXBbMl0ucmVwbGFjZSgvXiAqfFxcfCAqJC9nLCAnJykuc3BsaXQoLyAqXFx8ICovKSxcbiAgICAgICAgY2VsbHM6IGNhcFszXS5yZXBsYWNlKC9cXG4kLywgJycpLnNwbGl0KCdcXG4nKVxuICAgICAgfTtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IGl0ZW0uYWxpZ24ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKC9eICotKzogKiQvLnRlc3QoaXRlbS5hbGlnbltpXSkpIHtcbiAgICAgICAgICBpdGVtLmFsaWduW2ldID0gJ3JpZ2h0JztcbiAgICAgICAgfSBlbHNlIGlmICgvXiAqOi0rOiAqJC8udGVzdChpdGVtLmFsaWduW2ldKSkge1xuICAgICAgICAgIGl0ZW0uYWxpZ25baV0gPSAnY2VudGVyJztcbiAgICAgICAgfSBlbHNlIGlmICgvXiAqOi0rICokLy50ZXN0KGl0ZW0uYWxpZ25baV0pKSB7XG4gICAgICAgICAgaXRlbS5hbGlnbltpXSA9ICdsZWZ0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtLmFsaWduW2ldID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgaXRlbS5jZWxscy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVtLmNlbGxzW2ldID0gaXRlbS5jZWxsc1tpXS5zcGxpdCgvICpcXHwgKi8pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRva2Vucy5wdXNoKGl0ZW0pO1xuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBsaGVhZGluZ1xuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmxoZWFkaW5nLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAnaGVhZGluZycsXG4gICAgICAgIGRlcHRoOiBjYXBbMl0gPT09ICc9JyA/IDEgOiAyLFxuICAgICAgICB0ZXh0OiBjYXBbMV1cbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gaHJcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5oci5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2hyJ1xuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBibG9ja3F1b3RlXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuYmxvY2txdW90ZS5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG5cbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAnYmxvY2txdW90ZV9zdGFydCdcbiAgICAgIH0pO1xuXG4gICAgICBjYXAgPSBjYXBbMF0ucmVwbGFjZSgvXiAqPiA/L2dtLCAnJyk7XG5cbiAgICAgIC8vIFBhc3MgYHRvcGAgdG8ga2VlcCB0aGUgY3VycmVudFxuICAgICAgLy8gXCJ0b3BsZXZlbFwiIHN0YXRlLiBUaGlzIGlzIGV4YWN0bHlcbiAgICAgIC8vIGhvdyBtYXJrZG93bi5wbCB3b3Jrcy5cbiAgICAgIHRoaXMudG9rZW4oY2FwLCB0b3AsIHRydWUpO1xuXG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2Jsb2NrcXVvdGVfZW5kJ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGxpc3RcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5saXN0LmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIGJ1bGwgPSBjYXBbMl07XG5cbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAnbGlzdF9zdGFydCcsXG4gICAgICAgIG9yZGVyZWQ6IGJ1bGwubGVuZ3RoID4gMVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEdldCBlYWNoIHRvcC1sZXZlbCBpdGVtLlxuICAgICAgY2FwID0gY2FwWzBdLm1hdGNoKHRoaXMucnVsZXMuaXRlbSk7XG5cbiAgICAgIG5leHQgPSBmYWxzZTtcbiAgICAgIGwgPSBjYXAubGVuZ3RoO1xuICAgICAgaSA9IDA7XG5cbiAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGl0ZW0gPSBjYXBbaV07XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsaXN0IGl0ZW0ncyBidWxsZXRcbiAgICAgICAgLy8gc28gaXQgaXMgc2VlbiBhcyB0aGUgbmV4dCB0b2tlbi5cbiAgICAgICAgc3BhY2UgPSBpdGVtLmxlbmd0aDtcbiAgICAgICAgaXRlbSA9IGl0ZW0ucmVwbGFjZSgvXiAqKFsqKy1dfFxcZCtcXC4pICsvLCAnJyk7XG5cbiAgICAgICAgLy8gT3V0ZGVudCB3aGF0ZXZlciB0aGVcbiAgICAgICAgLy8gbGlzdCBpdGVtIGNvbnRhaW5zLiBIYWNreS5cbiAgICAgICAgaWYgKH5pdGVtLmluZGV4T2YoJ1xcbiAnKSkge1xuICAgICAgICAgIHNwYWNlIC09IGl0ZW0ubGVuZ3RoO1xuICAgICAgICAgIGl0ZW0gPSAhdGhpcy5vcHRpb25zLnBlZGFudGljXG4gICAgICAgICAgICA/IGl0ZW0ucmVwbGFjZShuZXcgUmVnRXhwKCdeIHsxLCcgKyBzcGFjZSArICd9JywgJ2dtJyksICcnKVxuICAgICAgICAgICAgOiBpdGVtLnJlcGxhY2UoL14gezEsNH0vZ20sICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVybWluZSB3aGV0aGVyIHRoZSBuZXh0IGxpc3QgaXRlbSBiZWxvbmdzIGhlcmUuXG4gICAgICAgIC8vIEJhY2twZWRhbCBpZiBpdCBkb2VzIG5vdCBiZWxvbmcgaW4gdGhpcyBsaXN0LlxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNtYXJ0TGlzdHMgJiYgaSAhPT0gbCAtIDEpIHtcbiAgICAgICAgICBiID0gYmxvY2suYnVsbGV0LmV4ZWMoY2FwW2kgKyAxXSlbMF07XG4gICAgICAgICAgaWYgKGJ1bGwgIT09IGIgJiYgIShidWxsLmxlbmd0aCA+IDEgJiYgYi5sZW5ndGggPiAxKSkge1xuICAgICAgICAgICAgc3JjID0gY2FwLnNsaWNlKGkgKyAxKS5qb2luKCdcXG4nKSArIHNyYztcbiAgICAgICAgICAgIGkgPSBsIC0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hldGhlciBpdGVtIGlzIGxvb3NlIG9yIG5vdC5cbiAgICAgICAgLy8gVXNlOiAvKF58XFxuKSg/ISApW15cXG5dK1xcblxcbig/IVxccyokKS9cbiAgICAgICAgLy8gZm9yIGRpc2NvdW50IGJlaGF2aW9yLlxuICAgICAgICBsb29zZSA9IG5leHQgfHwgL1xcblxcbig/IVxccyokKS8udGVzdChpdGVtKTtcbiAgICAgICAgaWYgKGkgIT09IGwgLSAxKSB7XG4gICAgICAgICAgbmV4dCA9IGl0ZW0uY2hhckF0KGl0ZW0ubGVuZ3RoIC0gMSkgPT09ICdcXG4nO1xuICAgICAgICAgIGlmICghbG9vc2UpIGxvb3NlID0gbmV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICAgIHR5cGU6IGxvb3NlXG4gICAgICAgICAgICA/ICdsb29zZV9pdGVtX3N0YXJ0J1xuICAgICAgICAgICAgOiAnbGlzdF9pdGVtX3N0YXJ0J1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZWN1cnNlLlxuICAgICAgICB0aGlzLnRva2VuKGl0ZW0sIGZhbHNlLCBicSk7XG5cbiAgICAgICAgdGhpcy50b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ2xpc3RfaXRlbV9lbmQnXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2xpc3RfZW5kJ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGh0bWxcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5odG1sLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiB0aGlzLm9wdGlvbnMuc2FuaXRpemVcbiAgICAgICAgICA/ICdwYXJhZ3JhcGgnXG4gICAgICAgICAgOiAnaHRtbCcsXG4gICAgICAgIHByZTogY2FwWzFdID09PSAncHJlJyB8fCBjYXBbMV0gPT09ICdzY3JpcHQnIHx8IGNhcFsxXSA9PT0gJ3N0eWxlJyxcbiAgICAgICAgdGV4dDogY2FwWzBdXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGRlZlxuICAgIGlmICgoIWJxICYmIHRvcCkgJiYgKGNhcCA9IHRoaXMucnVsZXMuZGVmLmV4ZWMoc3JjKSkpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5saW5rc1tjYXBbMV0udG9Mb3dlckNhc2UoKV0gPSB7XG4gICAgICAgIGhyZWY6IGNhcFsyXSxcbiAgICAgICAgdGl0bGU6IGNhcFszXVxuICAgICAgfTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRhYmxlIChnZm0pXG4gICAgaWYgKHRvcCAmJiAoY2FwID0gdGhpcy5ydWxlcy50YWJsZS5leGVjKHNyYykpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuXG4gICAgICBpdGVtID0ge1xuICAgICAgICB0eXBlOiAndGFibGUnLFxuICAgICAgICBoZWFkZXI6IGNhcFsxXS5yZXBsYWNlKC9eICp8ICpcXHwgKiQvZywgJycpLnNwbGl0KC8gKlxcfCAqLyksXG4gICAgICAgIGFsaWduOiBjYXBbMl0ucmVwbGFjZSgvXiAqfFxcfCAqJC9nLCAnJykuc3BsaXQoLyAqXFx8ICovKSxcbiAgICAgICAgY2VsbHM6IGNhcFszXS5yZXBsYWNlKC8oPzogKlxcfCAqKT9cXG4kLywgJycpLnNwbGl0KCdcXG4nKVxuICAgICAgfTtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IGl0ZW0uYWxpZ24ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKC9eICotKzogKiQvLnRlc3QoaXRlbS5hbGlnbltpXSkpIHtcbiAgICAgICAgICBpdGVtLmFsaWduW2ldID0gJ3JpZ2h0JztcbiAgICAgICAgfSBlbHNlIGlmICgvXiAqOi0rOiAqJC8udGVzdChpdGVtLmFsaWduW2ldKSkge1xuICAgICAgICAgIGl0ZW0uYWxpZ25baV0gPSAnY2VudGVyJztcbiAgICAgICAgfSBlbHNlIGlmICgvXiAqOi0rICokLy50ZXN0KGl0ZW0uYWxpZ25baV0pKSB7XG4gICAgICAgICAgaXRlbS5hbGlnbltpXSA9ICdsZWZ0JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtLmFsaWduW2ldID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgaXRlbS5jZWxscy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVtLmNlbGxzW2ldID0gaXRlbS5jZWxsc1tpXVxuICAgICAgICAgIC5yZXBsYWNlKC9eICpcXHwgKnwgKlxcfCAqJC9nLCAnJylcbiAgICAgICAgICAuc3BsaXQoLyAqXFx8ICovKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50b2tlbnMucHVzaChpdGVtKTtcblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gdG9wLWxldmVsIHBhcmFncmFwaFxuICAgIGlmICh0b3AgJiYgKGNhcCA9IHRoaXMucnVsZXMucGFyYWdyYXBoLmV4ZWMoc3JjKSkpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICB0aGlzLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3BhcmFncmFwaCcsXG4gICAgICAgIHRleHQ6IGNhcFsxXS5jaGFyQXQoY2FwWzFdLmxlbmd0aCAtIDEpID09PSAnXFxuJ1xuICAgICAgICAgID8gY2FwWzFdLnNsaWNlKDAsIC0xKVxuICAgICAgICAgIDogY2FwWzFdXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRleHRcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy50ZXh0LmV4ZWMoc3JjKSkge1xuICAgICAgLy8gVG9wLWxldmVsIHNob3VsZCBuZXZlciByZWFjaCBoZXJlLlxuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRoaXMudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgIHRleHQ6IGNhcFswXVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoc3JjKSB7XG4gICAgICB0aHJvdyBuZXdcbiAgICAgICAgRXJyb3IoJ0luZmluaXRlIGxvb3Agb24gYnl0ZTogJyArIHNyYy5jaGFyQ29kZUF0KDApKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcy50b2tlbnM7XG59O1xuXG4vKipcbiAqIElubGluZS1MZXZlbCBHcmFtbWFyXG4gKi9cblxudmFyIGlubGluZSA9IHtcbiAgZXNjYXBlOiAvXlxcXFwoW1xcXFxgKnt9XFxbXFxdKCkjK1xcLS4hXz5dKS8sXG4gIGF1dG9saW5rOiAvXjwoW14gPl0rKEB8OlxcLylbXiA+XSspPi8sXG4gIHVybDogbm9vcCxcbiAgdGFnOiAvXjwhLS1bXFxzXFxTXSo/LS0+fF48XFwvP1xcdysoPzpcIlteXCJdKlwifCdbXiddKid8W14nXCI+XSkqPz4vLFxuICBsaW5rOiAvXiE/XFxbKGluc2lkZSlcXF1cXChocmVmXFwpLyxcbiAgcmVmbGluazogL14hP1xcWyhpbnNpZGUpXFxdXFxzKlxcWyhbXlxcXV0qKVxcXS8sXG4gIG5vbGluazogL14hP1xcWygoPzpcXFtbXlxcXV0qXFxdfFteXFxbXFxdXSkqKVxcXS8sXG4gIHN0cm9uZzogL15fXyhbXFxzXFxTXSs/KV9fKD8hXyl8XlxcKlxcKihbXFxzXFxTXSs/KVxcKlxcKig/IVxcKikvLFxuICBlbTogL15cXGJfKCg/Ol9ffFtcXHNcXFNdKSs/KV9cXGJ8XlxcKigoPzpcXCpcXCp8W1xcc1xcU10pKz8pXFwqKD8hXFwqKS8sXG4gIGNvZGU6IC9eKGArKVxccyooW1xcc1xcU10qP1teYF0pXFxzKlxcMSg/IWApLyxcbiAgYnI6IC9eIHsyLH1cXG4oPyFcXHMqJCkvLFxuICBkZWw6IG5vb3AsXG4gIHRleHQ6IC9eW1xcc1xcU10rPyg/PVtcXFxcPCFcXFtfKmBdfCB7Mix9XFxufCQpL1xufTtcblxuaW5saW5lLl9pbnNpZGUgPSAvKD86XFxbW15cXF1dKlxcXXxbXlxcW1xcXV18XFxdKD89W15cXFtdKlxcXSkpKi87XG5pbmxpbmUuX2hyZWYgPSAvXFxzKjw/KFtcXHNcXFNdKj8pPj8oPzpcXHMrWydcIl0oW1xcc1xcU10qPylbJ1wiXSk/XFxzKi87XG5cbmlubGluZS5saW5rID0gcmVwbGFjZShpbmxpbmUubGluaylcbiAgKCdpbnNpZGUnLCBpbmxpbmUuX2luc2lkZSlcbiAgKCdocmVmJywgaW5saW5lLl9ocmVmKVxuICAoKTtcblxuaW5saW5lLnJlZmxpbmsgPSByZXBsYWNlKGlubGluZS5yZWZsaW5rKVxuICAoJ2luc2lkZScsIGlubGluZS5faW5zaWRlKVxuICAoKTtcblxuLyoqXG4gKiBOb3JtYWwgSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUubm9ybWFsID0gbWVyZ2Uoe30sIGlubGluZSk7XG5cbi8qKlxuICogUGVkYW50aWMgSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUucGVkYW50aWMgPSBtZXJnZSh7fSwgaW5saW5lLm5vcm1hbCwge1xuICBzdHJvbmc6IC9eX18oPz1cXFMpKFtcXHNcXFNdKj9cXFMpX18oPyFfKXxeXFwqXFwqKD89XFxTKShbXFxzXFxTXSo/XFxTKVxcKlxcKig/IVxcKikvLFxuICBlbTogL15fKD89XFxTKShbXFxzXFxTXSo/XFxTKV8oPyFfKXxeXFwqKD89XFxTKShbXFxzXFxTXSo/XFxTKVxcKig/IVxcKikvXG59KTtcblxuLyoqXG4gKiBHRk0gSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUuZ2ZtID0gbWVyZ2Uoe30sIGlubGluZS5ub3JtYWwsIHtcbiAgZXNjYXBlOiByZXBsYWNlKGlubGluZS5lc2NhcGUpKCddKScsICd+fF0pJykoKSxcbiAgdXJsOiAvXihodHRwcz86XFwvXFwvW15cXHM8XStbXjwuLDo7XCInKVxcXVxcc10pLyxcbiAgZGVsOiAvXn5+KD89XFxTKShbXFxzXFxTXSo/XFxTKX5+LyxcbiAgdGV4dDogcmVwbGFjZShpbmxpbmUudGV4dClcbiAgICAoJ118JywgJ35dfCcpXG4gICAgKCd8JywgJ3xodHRwcz86Ly98JylcbiAgICAoKVxufSk7XG5cbi8qKlxuICogR0ZNICsgTGluZSBCcmVha3MgSW5saW5lIEdyYW1tYXJcbiAqL1xuXG5pbmxpbmUuYnJlYWtzID0gbWVyZ2Uoe30sIGlubGluZS5nZm0sIHtcbiAgYnI6IHJlcGxhY2UoaW5saW5lLmJyKSgnezIsfScsICcqJykoKSxcbiAgdGV4dDogcmVwbGFjZShpbmxpbmUuZ2ZtLnRleHQpKCd7Mix9JywgJyonKSgpXG59KTtcblxuLyoqXG4gKiBJbmxpbmUgTGV4ZXIgJiBDb21waWxlclxuICovXG5cbmZ1bmN0aW9uIElubGluZUxleGVyKGxpbmtzLCBvcHRpb25zKSB7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwgbWFya2VkLmRlZmF1bHRzO1xuICB0aGlzLmxpbmtzID0gbGlua3M7XG4gIHRoaXMucnVsZXMgPSBpbmxpbmUubm9ybWFsO1xuICB0aGlzLnJlbmRlcmVyID0gdGhpcy5vcHRpb25zLnJlbmRlcmVyIHx8IG5ldyBSZW5kZXJlcjtcbiAgdGhpcy5yZW5kZXJlci5vcHRpb25zID0gdGhpcy5vcHRpb25zO1xuXG4gIGlmICghdGhpcy5saW5rcykge1xuICAgIHRocm93IG5ld1xuICAgICAgRXJyb3IoJ1Rva2VucyBhcnJheSByZXF1aXJlcyBhIGBsaW5rc2AgcHJvcGVydHkuJyk7XG4gIH1cblxuICBpZiAodGhpcy5vcHRpb25zLmdmbSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYnJlYWtzKSB7XG4gICAgICB0aGlzLnJ1bGVzID0gaW5saW5lLmJyZWFrcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ydWxlcyA9IGlubGluZS5nZm07XG4gICAgfVxuICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5wZWRhbnRpYykge1xuICAgIHRoaXMucnVsZXMgPSBpbmxpbmUucGVkYW50aWM7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvc2UgSW5saW5lIFJ1bGVzXG4gKi9cblxuSW5saW5lTGV4ZXIucnVsZXMgPSBpbmxpbmU7XG5cbi8qKlxuICogU3RhdGljIExleGluZy9Db21waWxpbmcgTWV0aG9kXG4gKi9cblxuSW5saW5lTGV4ZXIub3V0cHV0ID0gZnVuY3Rpb24oc3JjLCBsaW5rcywgb3B0aW9ucykge1xuICB2YXIgaW5saW5lID0gbmV3IElubGluZUxleGVyKGxpbmtzLCBvcHRpb25zKTtcbiAgcmV0dXJuIGlubGluZS5vdXRwdXQoc3JjKTtcbn07XG5cbi8qKlxuICogTGV4aW5nL0NvbXBpbGluZ1xuICovXG5cbklubGluZUxleGVyLnByb3RvdHlwZS5vdXRwdXQgPSBmdW5jdGlvbihzcmMpIHtcbiAgdmFyIG91dCA9ICcnXG4gICAgLCBsaW5rXG4gICAgLCB0ZXh0XG4gICAgLCBocmVmXG4gICAgLCBjYXA7XG5cbiAgd2hpbGUgKHNyYykge1xuICAgIC8vIGVzY2FwZVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmVzY2FwZS5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBvdXQgKz0gY2FwWzFdO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYXV0b2xpbmtcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5hdXRvbGluay5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBpZiAoY2FwWzJdID09PSAnQCcpIHtcbiAgICAgICAgdGV4dCA9IGNhcFsxXS5jaGFyQXQoNikgPT09ICc6J1xuICAgICAgICAgID8gdGhpcy5tYW5nbGUoY2FwWzFdLnN1YnN0cmluZyg3KSlcbiAgICAgICAgICA6IHRoaXMubWFuZ2xlKGNhcFsxXSk7XG4gICAgICAgIGhyZWYgPSB0aGlzLm1hbmdsZSgnbWFpbHRvOicpICsgdGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRleHQgPSBlc2NhcGUoY2FwWzFdKTtcbiAgICAgICAgaHJlZiA9IHRleHQ7XG4gICAgICB9XG4gICAgICBvdXQgKz0gdGhpcy5yZW5kZXJlci5saW5rKGhyZWYsIG51bGwsIHRleHQpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gdXJsIChnZm0pXG4gICAgaWYgKCF0aGlzLmluTGluayAmJiAoY2FwID0gdGhpcy5ydWxlcy51cmwuZXhlYyhzcmMpKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRleHQgPSBlc2NhcGUoY2FwWzFdKTtcbiAgICAgIGhyZWYgPSB0ZXh0O1xuICAgICAgb3V0ICs9IHRoaXMucmVuZGVyZXIubGluayhocmVmLCBudWxsLCB0ZXh0KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRhZ1xuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLnRhZy5leGVjKHNyYykpIHtcbiAgICAgIGlmICghdGhpcy5pbkxpbmsgJiYgL148YSAvaS50ZXN0KGNhcFswXSkpIHtcbiAgICAgICAgdGhpcy5pbkxpbmsgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmluTGluayAmJiAvXjxcXC9hPi9pLnRlc3QoY2FwWzBdKSkge1xuICAgICAgICB0aGlzLmluTGluayA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSB0aGlzLm9wdGlvbnMuc2FuaXRpemVcbiAgICAgICAgPyBlc2NhcGUoY2FwWzBdKVxuICAgICAgICA6IGNhcFswXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGxpbmtcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5saW5rLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIHRoaXMuaW5MaW5rID0gdHJ1ZTtcbiAgICAgIG91dCArPSB0aGlzLm91dHB1dExpbmsoY2FwLCB7XG4gICAgICAgIGhyZWY6IGNhcFsyXSxcbiAgICAgICAgdGl0bGU6IGNhcFszXVxuICAgICAgfSk7XG4gICAgICB0aGlzLmluTGluayA9IGZhbHNlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gcmVmbGluaywgbm9saW5rXG4gICAgaWYgKChjYXAgPSB0aGlzLnJ1bGVzLnJlZmxpbmsuZXhlYyhzcmMpKVxuICAgICAgICB8fCAoY2FwID0gdGhpcy5ydWxlcy5ub2xpbmsuZXhlYyhzcmMpKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIGxpbmsgPSAoY2FwWzJdIHx8IGNhcFsxXSkucmVwbGFjZSgvXFxzKy9nLCAnICcpO1xuICAgICAgbGluayA9IHRoaXMubGlua3NbbGluay50b0xvd2VyQ2FzZSgpXTtcbiAgICAgIGlmICghbGluayB8fCAhbGluay5ocmVmKSB7XG4gICAgICAgIG91dCArPSBjYXBbMF0uY2hhckF0KDApO1xuICAgICAgICBzcmMgPSBjYXBbMF0uc3Vic3RyaW5nKDEpICsgc3JjO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaW5MaW5rID0gdHJ1ZTtcbiAgICAgIG91dCArPSB0aGlzLm91dHB1dExpbmsoY2FwLCBsaW5rKTtcbiAgICAgIHRoaXMuaW5MaW5rID0gZmFsc2U7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBzdHJvbmdcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5zdHJvbmcuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9IHRoaXMucmVuZGVyZXIuc3Ryb25nKHRoaXMub3V0cHV0KGNhcFsyXSB8fCBjYXBbMV0pKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGVtXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuZW0uZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9IHRoaXMucmVuZGVyZXIuZW0odGhpcy5vdXRwdXQoY2FwWzJdIHx8IGNhcFsxXSkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gY29kZVxuICAgIGlmIChjYXAgPSB0aGlzLnJ1bGVzLmNvZGUuZXhlYyhzcmMpKSB7XG4gICAgICBzcmMgPSBzcmMuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuICAgICAgb3V0ICs9IHRoaXMucmVuZGVyZXIuY29kZXNwYW4oZXNjYXBlKGNhcFsyXSwgdHJ1ZSkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYnJcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy5ici5leGVjKHNyYykpIHtcbiAgICAgIHNyYyA9IHNyYy5zdWJzdHJpbmcoY2FwWzBdLmxlbmd0aCk7XG4gICAgICBvdXQgKz0gdGhpcy5yZW5kZXJlci5icigpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gZGVsIChnZm0pXG4gICAgaWYgKGNhcCA9IHRoaXMucnVsZXMuZGVsLmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSB0aGlzLnJlbmRlcmVyLmRlbCh0aGlzLm91dHB1dChjYXBbMV0pKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIHRleHRcbiAgICBpZiAoY2FwID0gdGhpcy5ydWxlcy50ZXh0LmV4ZWMoc3JjKSkge1xuICAgICAgc3JjID0gc3JjLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcbiAgICAgIG91dCArPSBlc2NhcGUodGhpcy5zbWFydHlwYW50cyhjYXBbMF0pKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChzcmMpIHtcbiAgICAgIHRocm93IG5ld1xuICAgICAgICBFcnJvcignSW5maW5pdGUgbG9vcCBvbiBieXRlOiAnICsgc3JjLmNoYXJDb2RlQXQoMCkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIENvbXBpbGUgTGlua1xuICovXG5cbklubGluZUxleGVyLnByb3RvdHlwZS5vdXRwdXRMaW5rID0gZnVuY3Rpb24oY2FwLCBsaW5rKSB7XG4gIHZhciBocmVmID0gZXNjYXBlKGxpbmsuaHJlZilcbiAgICAsIHRpdGxlID0gbGluay50aXRsZSA/IGVzY2FwZShsaW5rLnRpdGxlKSA6IG51bGw7XG5cbiAgcmV0dXJuIGNhcFswXS5jaGFyQXQoMCkgIT09ICchJ1xuICAgID8gdGhpcy5yZW5kZXJlci5saW5rKGhyZWYsIHRpdGxlLCB0aGlzLm91dHB1dChjYXBbMV0pKVxuICAgIDogdGhpcy5yZW5kZXJlci5pbWFnZShocmVmLCB0aXRsZSwgZXNjYXBlKGNhcFsxXSkpO1xufTtcblxuLyoqXG4gKiBTbWFydHlwYW50cyBUcmFuc2Zvcm1hdGlvbnNcbiAqL1xuXG5JbmxpbmVMZXhlci5wcm90b3R5cGUuc21hcnR5cGFudHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIGlmICghdGhpcy5vcHRpb25zLnNtYXJ0eXBhbnRzKSByZXR1cm4gdGV4dDtcbiAgcmV0dXJuIHRleHRcbiAgICAvLyBlbS1kYXNoZXNcbiAgICAucmVwbGFjZSgvLS0vZywgJ1xcdTIwMTQnKVxuICAgIC8vIG9wZW5pbmcgc2luZ2xlc1xuICAgIC5yZXBsYWNlKC8oXnxbLVxcdTIwMTQvKFxcW3tcIlxcc10pJy9nLCAnJDFcXHUyMDE4JylcbiAgICAvLyBjbG9zaW5nIHNpbmdsZXMgJiBhcG9zdHJvcGhlc1xuICAgIC5yZXBsYWNlKC8nL2csICdcXHUyMDE5JylcbiAgICAvLyBvcGVuaW5nIGRvdWJsZXNcbiAgICAucmVwbGFjZSgvKF58Wy1cXHUyMDE0LyhcXFt7XFx1MjAxOFxcc10pXCIvZywgJyQxXFx1MjAxYycpXG4gICAgLy8gY2xvc2luZyBkb3VibGVzXG4gICAgLnJlcGxhY2UoL1wiL2csICdcXHUyMDFkJylcbiAgICAvLyBlbGxpcHNlc1xuICAgIC5yZXBsYWNlKC9cXC57M30vZywgJ1xcdTIwMjYnKTtcbn07XG5cbi8qKlxuICogTWFuZ2xlIExpbmtzXG4gKi9cblxuSW5saW5lTGV4ZXIucHJvdG90eXBlLm1hbmdsZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgdmFyIG91dCA9ICcnXG4gICAgLCBsID0gdGV4dC5sZW5ndGhcbiAgICAsIGkgPSAwXG4gICAgLCBjaDtcblxuICBmb3IgKDsgaSA8IGw7IGkrKykge1xuICAgIGNoID0gdGV4dC5jaGFyQ29kZUF0KGkpO1xuICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICBjaCA9ICd4JyArIGNoLnRvU3RyaW5nKDE2KTtcbiAgICB9XG4gICAgb3V0ICs9ICcmIycgKyBjaCArICc7JztcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIFJlbmRlcmVyXG4gKi9cblxuZnVuY3Rpb24gUmVuZGVyZXIob3B0aW9ucykge1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xufVxuXG5SZW5kZXJlci5wcm90b3R5cGUuY29kZSA9IGZ1bmN0aW9uKGNvZGUsIGxhbmcsIGVzY2FwZWQpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5oaWdobGlnaHQpIHtcbiAgICB2YXIgb3V0ID0gdGhpcy5vcHRpb25zLmhpZ2hsaWdodChjb2RlLCBsYW5nKTtcbiAgICBpZiAob3V0ICE9IG51bGwgJiYgb3V0ICE9PSBjb2RlKSB7XG4gICAgICBlc2NhcGVkID0gdHJ1ZTtcbiAgICAgIGNvZGUgPSBvdXQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFsYW5nKSB7XG4gICAgcmV0dXJuICc8cHJlPjxjb2RlPidcbiAgICAgICsgKGVzY2FwZWQgPyBjb2RlIDogZXNjYXBlKGNvZGUsIHRydWUpKVxuICAgICAgKyAnXFxuPC9jb2RlPjwvcHJlPic7XG4gIH1cblxuICByZXR1cm4gJzxwcmU+PGNvZGUgY2xhc3M9XCInXG4gICAgKyB0aGlzLm9wdGlvbnMubGFuZ1ByZWZpeFxuICAgICsgZXNjYXBlKGxhbmcsIHRydWUpXG4gICAgKyAnXCI+J1xuICAgICsgKGVzY2FwZWQgPyBjb2RlIDogZXNjYXBlKGNvZGUsIHRydWUpKVxuICAgICsgJ1xcbjwvY29kZT48L3ByZT5cXG4nO1xufTtcblxuUmVuZGVyZXIucHJvdG90eXBlLmJsb2NrcXVvdGUgPSBmdW5jdGlvbihxdW90ZSkge1xuICByZXR1cm4gJzxibG9ja3F1b3RlPlxcbicgKyBxdW90ZSArICc8L2Jsb2NrcXVvdGU+XFxuJztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5odG1sID0gZnVuY3Rpb24oaHRtbCkge1xuICByZXR1cm4gaHRtbDtcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5oZWFkaW5nID0gZnVuY3Rpb24odGV4dCwgbGV2ZWwsIHJhdykge1xuICByZXR1cm4gJzxoJ1xuICAgICsgbGV2ZWxcbiAgICArICcgaWQ9XCInXG4gICAgKyB0aGlzLm9wdGlvbnMuaGVhZGVyUHJlZml4XG4gICAgKyByYXcudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXlxcd10rL2csICctJylcbiAgICArICdcIj4nXG4gICAgKyB0ZXh0XG4gICAgKyAnPC9oJ1xuICAgICsgbGV2ZWxcbiAgICArICc+XFxuJztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5ociA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5vcHRpb25zLnhodG1sID8gJzxoci8+XFxuJyA6ICc8aHI+XFxuJztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5saXN0ID0gZnVuY3Rpb24oYm9keSwgb3JkZXJlZCkge1xuICB2YXIgdHlwZSA9IG9yZGVyZWQgPyAnb2wnIDogJ3VsJztcbiAgcmV0dXJuICc8JyArIHR5cGUgKyAnPlxcbicgKyBib2R5ICsgJzwvJyArIHR5cGUgKyAnPlxcbic7XG59O1xuXG5SZW5kZXJlci5wcm90b3R5cGUubGlzdGl0ZW0gPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiAnPGxpPicgKyB0ZXh0ICsgJzwvbGk+XFxuJztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5wYXJhZ3JhcGggPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiAnPHA+JyArIHRleHQgKyAnPC9wPlxcbic7XG59O1xuXG5SZW5kZXJlci5wcm90b3R5cGUudGFibGUgPSBmdW5jdGlvbihoZWFkZXIsIGJvZHkpIHtcbiAgcmV0dXJuICc8dGFibGU+XFxuJ1xuICAgICsgJzx0aGVhZD5cXG4nXG4gICAgKyBoZWFkZXJcbiAgICArICc8L3RoZWFkPlxcbidcbiAgICArICc8dGJvZHk+XFxuJ1xuICAgICsgYm9keVxuICAgICsgJzwvdGJvZHk+XFxuJ1xuICAgICsgJzwvdGFibGU+XFxuJztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS50YWJsZXJvdyA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgcmV0dXJuICc8dHI+XFxuJyArIGNvbnRlbnQgKyAnPC90cj5cXG4nO1xufTtcblxuUmVuZGVyZXIucHJvdG90eXBlLnRhYmxlY2VsbCA9IGZ1bmN0aW9uKGNvbnRlbnQsIGZsYWdzKSB7XG4gIHZhciB0eXBlID0gZmxhZ3MuaGVhZGVyID8gJ3RoJyA6ICd0ZCc7XG4gIHZhciB0YWcgPSBmbGFncy5hbGlnblxuICAgID8gJzwnICsgdHlwZSArICcgc3R5bGU9XCJ0ZXh0LWFsaWduOicgKyBmbGFncy5hbGlnbiArICdcIj4nXG4gICAgOiAnPCcgKyB0eXBlICsgJz4nO1xuICByZXR1cm4gdGFnICsgY29udGVudCArICc8LycgKyB0eXBlICsgJz5cXG4nO1xufTtcblxuLy8gc3BhbiBsZXZlbCByZW5kZXJlclxuUmVuZGVyZXIucHJvdG90eXBlLnN0cm9uZyA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgcmV0dXJuICc8c3Ryb25nPicgKyB0ZXh0ICsgJzwvc3Ryb25nPic7XG59O1xuXG5SZW5kZXJlci5wcm90b3R5cGUuZW0gPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiAnPGVtPicgKyB0ZXh0ICsgJzwvZW0+Jztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5jb2Rlc3BhbiA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgcmV0dXJuICc8Y29kZT4nICsgdGV4dCArICc8L2NvZGU+Jztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5iciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5vcHRpb25zLnhodG1sID8gJzxici8+JyA6ICc8YnI+Jztcbn07XG5cblJlbmRlcmVyLnByb3RvdHlwZS5kZWwgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHJldHVybiAnPGRlbD4nICsgdGV4dCArICc8L2RlbD4nO1xufTtcblxuUmVuZGVyZXIucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbihocmVmLCB0aXRsZSwgdGV4dCkge1xuICBpZiAodGhpcy5vcHRpb25zLnNhbml0aXplKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBwcm90ID0gZGVjb2RlVVJJQ29tcG9uZW50KHVuZXNjYXBlKGhyZWYpKVxuICAgICAgICAucmVwbGFjZSgvW15cXHc6XS9nLCAnJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBpZiAocHJvdC5pbmRleE9mKCdqYXZhc2NyaXB0OicpID09PSAwIHx8IHByb3QuaW5kZXhPZigndmJzY3JpcHQ6JykgPT09IDApIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cbiAgdmFyIG91dCA9ICc8YSBocmVmPVwiJyArIGhyZWYgKyAnXCInO1xuICBpZiAodGl0bGUpIHtcbiAgICBvdXQgKz0gJyB0aXRsZT1cIicgKyB0aXRsZSArICdcIic7XG4gIH1cbiAgb3V0ICs9ICc+JyArIHRleHQgKyAnPC9hPic7XG4gIHJldHVybiBvdXQ7XG59O1xuXG5SZW5kZXJlci5wcm90b3R5cGUuaW1hZ2UgPSBmdW5jdGlvbihocmVmLCB0aXRsZSwgdGV4dCkge1xuICB2YXIgb3V0ID0gJzxpbWcgc3JjPVwiJyArIGhyZWYgKyAnXCIgYWx0PVwiJyArIHRleHQgKyAnXCInO1xuICBpZiAodGl0bGUpIHtcbiAgICBvdXQgKz0gJyB0aXRsZT1cIicgKyB0aXRsZSArICdcIic7XG4gIH1cbiAgb3V0ICs9IHRoaXMub3B0aW9ucy54aHRtbCA/ICcvPicgOiAnPic7XG4gIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIFBhcnNpbmcgJiBDb21waWxpbmdcbiAqL1xuXG5mdW5jdGlvbiBQYXJzZXIob3B0aW9ucykge1xuICB0aGlzLnRva2VucyA9IFtdO1xuICB0aGlzLnRva2VuID0gbnVsbDtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCBtYXJrZWQuZGVmYXVsdHM7XG4gIHRoaXMub3B0aW9ucy5yZW5kZXJlciA9IHRoaXMub3B0aW9ucy5yZW5kZXJlciB8fCBuZXcgUmVuZGVyZXI7XG4gIHRoaXMucmVuZGVyZXIgPSB0aGlzLm9wdGlvbnMucmVuZGVyZXI7XG4gIHRoaXMucmVuZGVyZXIub3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbn1cblxuLyoqXG4gKiBTdGF0aWMgUGFyc2UgTWV0aG9kXG4gKi9cblxuUGFyc2VyLnBhcnNlID0gZnVuY3Rpb24oc3JjLCBvcHRpb25zLCByZW5kZXJlcikge1xuICB2YXIgcGFyc2VyID0gbmV3IFBhcnNlcihvcHRpb25zLCByZW5kZXJlcik7XG4gIHJldHVybiBwYXJzZXIucGFyc2Uoc3JjKTtcbn07XG5cbi8qKlxuICogUGFyc2UgTG9vcFxuICovXG5cblBhcnNlci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbihzcmMpIHtcbiAgdGhpcy5pbmxpbmUgPSBuZXcgSW5saW5lTGV4ZXIoc3JjLmxpbmtzLCB0aGlzLm9wdGlvbnMsIHRoaXMucmVuZGVyZXIpO1xuICB0aGlzLnRva2VucyA9IHNyYy5yZXZlcnNlKCk7XG5cbiAgdmFyIG91dCA9ICcnO1xuICB3aGlsZSAodGhpcy5uZXh0KCkpIHtcbiAgICBvdXQgKz0gdGhpcy50b2soKTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIE5leHQgVG9rZW5cbiAqL1xuXG5QYXJzZXIucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudG9rZW4gPSB0aGlzLnRva2Vucy5wb3AoKTtcbn07XG5cbi8qKlxuICogUHJldmlldyBOZXh0IFRva2VuXG4gKi9cblxuUGFyc2VyLnByb3RvdHlwZS5wZWVrID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnRva2Vuc1t0aGlzLnRva2Vucy5sZW5ndGggLSAxXSB8fCAwO1xufTtcblxuLyoqXG4gKiBQYXJzZSBUZXh0IFRva2Vuc1xuICovXG5cblBhcnNlci5wcm90b3R5cGUucGFyc2VUZXh0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBib2R5ID0gdGhpcy50b2tlbi50ZXh0O1xuXG4gIHdoaWxlICh0aGlzLnBlZWsoKS50eXBlID09PSAndGV4dCcpIHtcbiAgICBib2R5ICs9ICdcXG4nICsgdGhpcy5uZXh0KCkudGV4dDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmlubGluZS5vdXRwdXQoYm9keSk7XG59O1xuXG4vKipcbiAqIFBhcnNlIEN1cnJlbnQgVG9rZW5cbiAqL1xuXG5QYXJzZXIucHJvdG90eXBlLnRvayA9IGZ1bmN0aW9uKCkge1xuICBzd2l0Y2ggKHRoaXMudG9rZW4udHlwZSkge1xuICAgIGNhc2UgJ3NwYWNlJzoge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBjYXNlICdocic6IHtcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmhyKCk7XG4gICAgfVxuICAgIGNhc2UgJ2hlYWRpbmcnOiB7XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXJlci5oZWFkaW5nKFxuICAgICAgICB0aGlzLmlubGluZS5vdXRwdXQodGhpcy50b2tlbi50ZXh0KSxcbiAgICAgICAgdGhpcy50b2tlbi5kZXB0aCxcbiAgICAgICAgdGhpcy50b2tlbi50ZXh0KTtcbiAgICB9XG4gICAgY2FzZSAnY29kZSc6IHtcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmNvZGUodGhpcy50b2tlbi50ZXh0LFxuICAgICAgICB0aGlzLnRva2VuLmxhbmcsXG4gICAgICAgIHRoaXMudG9rZW4uZXNjYXBlZCk7XG4gICAgfVxuICAgIGNhc2UgJ3RhYmxlJzoge1xuICAgICAgdmFyIGhlYWRlciA9ICcnXG4gICAgICAgICwgYm9keSA9ICcnXG4gICAgICAgICwgaVxuICAgICAgICAsIHJvd1xuICAgICAgICAsIGNlbGxcbiAgICAgICAgLCBmbGFnc1xuICAgICAgICAsIGo7XG5cbiAgICAgIC8vIGhlYWRlclxuICAgICAgY2VsbCA9ICcnO1xuICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMudG9rZW4uaGVhZGVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGZsYWdzID0geyBoZWFkZXI6IHRydWUsIGFsaWduOiB0aGlzLnRva2VuLmFsaWduW2ldIH07XG4gICAgICAgIGNlbGwgKz0gdGhpcy5yZW5kZXJlci50YWJsZWNlbGwoXG4gICAgICAgICAgdGhpcy5pbmxpbmUub3V0cHV0KHRoaXMudG9rZW4uaGVhZGVyW2ldKSxcbiAgICAgICAgICB7IGhlYWRlcjogdHJ1ZSwgYWxpZ246IHRoaXMudG9rZW4uYWxpZ25baV0gfVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaGVhZGVyICs9IHRoaXMucmVuZGVyZXIudGFibGVyb3coY2VsbCk7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLnRva2VuLmNlbGxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJvdyA9IHRoaXMudG9rZW4uY2VsbHNbaV07XG5cbiAgICAgICAgY2VsbCA9ICcnO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgcm93Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY2VsbCArPSB0aGlzLnJlbmRlcmVyLnRhYmxlY2VsbChcbiAgICAgICAgICAgIHRoaXMuaW5saW5lLm91dHB1dChyb3dbal0pLFxuICAgICAgICAgICAgeyBoZWFkZXI6IGZhbHNlLCBhbGlnbjogdGhpcy50b2tlbi5hbGlnbltqXSB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJvZHkgKz0gdGhpcy5yZW5kZXJlci50YWJsZXJvdyhjZWxsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLnRhYmxlKGhlYWRlciwgYm9keSk7XG4gICAgfVxuICAgIGNhc2UgJ2Jsb2NrcXVvdGVfc3RhcnQnOiB7XG4gICAgICB2YXIgYm9keSA9ICcnO1xuXG4gICAgICB3aGlsZSAodGhpcy5uZXh0KCkudHlwZSAhPT0gJ2Jsb2NrcXVvdGVfZW5kJykge1xuICAgICAgICBib2R5ICs9IHRoaXMudG9rKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmJsb2NrcXVvdGUoYm9keSk7XG4gICAgfVxuICAgIGNhc2UgJ2xpc3Rfc3RhcnQnOiB7XG4gICAgICB2YXIgYm9keSA9ICcnXG4gICAgICAgICwgb3JkZXJlZCA9IHRoaXMudG9rZW4ub3JkZXJlZDtcblxuICAgICAgd2hpbGUgKHRoaXMubmV4dCgpLnR5cGUgIT09ICdsaXN0X2VuZCcpIHtcbiAgICAgICAgYm9keSArPSB0aGlzLnRvaygpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXJlci5saXN0KGJvZHksIG9yZGVyZWQpO1xuICAgIH1cbiAgICBjYXNlICdsaXN0X2l0ZW1fc3RhcnQnOiB7XG4gICAgICB2YXIgYm9keSA9ICcnO1xuXG4gICAgICB3aGlsZSAodGhpcy5uZXh0KCkudHlwZSAhPT0gJ2xpc3RfaXRlbV9lbmQnKSB7XG4gICAgICAgIGJvZHkgKz0gdGhpcy50b2tlbi50eXBlID09PSAndGV4dCdcbiAgICAgICAgICA/IHRoaXMucGFyc2VUZXh0KClcbiAgICAgICAgICA6IHRoaXMudG9rKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmxpc3RpdGVtKGJvZHkpO1xuICAgIH1cbiAgICBjYXNlICdsb29zZV9pdGVtX3N0YXJ0Jzoge1xuICAgICAgdmFyIGJvZHkgPSAnJztcblxuICAgICAgd2hpbGUgKHRoaXMubmV4dCgpLnR5cGUgIT09ICdsaXN0X2l0ZW1fZW5kJykge1xuICAgICAgICBib2R5ICs9IHRoaXMudG9rKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLmxpc3RpdGVtKGJvZHkpO1xuICAgIH1cbiAgICBjYXNlICdodG1sJzoge1xuICAgICAgdmFyIGh0bWwgPSAhdGhpcy50b2tlbi5wcmUgJiYgIXRoaXMub3B0aW9ucy5wZWRhbnRpY1xuICAgICAgICA/IHRoaXMuaW5saW5lLm91dHB1dCh0aGlzLnRva2VuLnRleHQpXG4gICAgICAgIDogdGhpcy50b2tlbi50ZXh0O1xuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyZXIuaHRtbChodG1sKTtcbiAgICB9XG4gICAgY2FzZSAncGFyYWdyYXBoJzoge1xuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyZXIucGFyYWdyYXBoKHRoaXMuaW5saW5lLm91dHB1dCh0aGlzLnRva2VuLnRleHQpKTtcbiAgICB9XG4gICAgY2FzZSAndGV4dCc6IHtcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcmVyLnBhcmFncmFwaCh0aGlzLnBhcnNlVGV4dCgpKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogSGVscGVyc1xuICovXG5cbmZ1bmN0aW9uIGVzY2FwZShodG1sLCBlbmNvZGUpIHtcbiAgcmV0dXJuIGh0bWxcbiAgICAucmVwbGFjZSghZW5jb2RlID8gLyYoPyEjP1xcdys7KS9nIDogLyYvZywgJyZhbXA7JylcbiAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKTtcbn1cblxuZnVuY3Rpb24gdW5lc2NhcGUoaHRtbCkge1xuICByZXR1cm4gaHRtbC5yZXBsYWNlKC8mKFsjXFx3XSspOy9nLCBmdW5jdGlvbihfLCBuKSB7XG4gICAgbiA9IG4udG9Mb3dlckNhc2UoKTtcbiAgICBpZiAobiA9PT0gJ2NvbG9uJykgcmV0dXJuICc6JztcbiAgICBpZiAobi5jaGFyQXQoMCkgPT09ICcjJykge1xuICAgICAgcmV0dXJuIG4uY2hhckF0KDEpID09PSAneCdcbiAgICAgICAgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKHBhcnNlSW50KG4uc3Vic3RyaW5nKDIpLCAxNikpXG4gICAgICAgIDogU3RyaW5nLmZyb21DaGFyQ29kZSgrbi5zdWJzdHJpbmcoMSkpO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlKHJlZ2V4LCBvcHQpIHtcbiAgcmVnZXggPSByZWdleC5zb3VyY2U7XG4gIG9wdCA9IG9wdCB8fCAnJztcbiAgcmV0dXJuIGZ1bmN0aW9uIHNlbGYobmFtZSwgdmFsKSB7XG4gICAgaWYgKCFuYW1lKSByZXR1cm4gbmV3IFJlZ0V4cChyZWdleCwgb3B0KTtcbiAgICB2YWwgPSB2YWwuc291cmNlIHx8IHZhbDtcbiAgICB2YWwgPSB2YWwucmVwbGFjZSgvKF58W15cXFtdKVxcXi9nLCAnJDEnKTtcbiAgICByZWdleCA9IHJlZ2V4LnJlcGxhY2UobmFtZSwgdmFsKTtcbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5ub29wLmV4ZWMgPSBub29wO1xuXG5mdW5jdGlvbiBtZXJnZShvYmopIHtcbiAgdmFyIGkgPSAxXG4gICAgLCB0YXJnZXRcbiAgICAsIGtleTtcblxuICBmb3IgKDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHRhcmdldCA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKGtleSBpbiB0YXJnZXQpIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gdGFyZ2V0W2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxuXG4vKipcbiAqIE1hcmtlZFxuICovXG5cbmZ1bmN0aW9uIG1hcmtlZChzcmMsIG9wdCwgY2FsbGJhY2spIHtcbiAgaWYgKGNhbGxiYWNrIHx8IHR5cGVvZiBvcHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdDtcbiAgICAgIG9wdCA9IG51bGw7XG4gICAgfVxuXG4gICAgb3B0ID0gbWVyZ2Uoe30sIG1hcmtlZC5kZWZhdWx0cywgb3B0IHx8IHt9KTtcblxuICAgIHZhciBoaWdobGlnaHQgPSBvcHQuaGlnaGxpZ2h0XG4gICAgICAsIHRva2Vuc1xuICAgICAgLCBwZW5kaW5nXG4gICAgICAsIGkgPSAwO1xuXG4gICAgdHJ5IHtcbiAgICAgIHRva2VucyA9IExleGVyLmxleChzcmMsIG9wdClcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgfVxuXG4gICAgcGVuZGluZyA9IHRva2Vucy5sZW5ndGg7XG5cbiAgICB2YXIgZG9uZSA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBvcHQuaGlnaGxpZ2h0ID0gaGlnaGxpZ2h0O1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG91dDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgb3V0ID0gUGFyc2VyLnBhcnNlKHRva2Vucywgb3B0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyID0gZTtcbiAgICAgIH1cblxuICAgICAgb3B0LmhpZ2hsaWdodCA9IGhpZ2hsaWdodDtcblxuICAgICAgcmV0dXJuIGVyclxuICAgICAgICA/IGNhbGxiYWNrKGVycilcbiAgICAgICAgOiBjYWxsYmFjayhudWxsLCBvdXQpO1xuICAgIH07XG5cbiAgICBpZiAoIWhpZ2hsaWdodCB8fCBoaWdobGlnaHQubGVuZ3RoIDwgMykge1xuICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICB9XG5cbiAgICBkZWxldGUgb3B0LmhpZ2hsaWdodDtcblxuICAgIGlmICghcGVuZGluZykgcmV0dXJuIGRvbmUoKTtcblxuICAgIGZvciAoOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAoZnVuY3Rpb24odG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09ICdjb2RlJykge1xuICAgICAgICAgIHJldHVybiAtLXBlbmRpbmcgfHwgZG9uZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBoaWdobGlnaHQodG9rZW4udGV4dCwgdG9rZW4ubGFuZywgZnVuY3Rpb24oZXJyLCBjb2RlKSB7XG4gICAgICAgICAgaWYgKGVycikgcmV0dXJuIGRvbmUoZXJyKTtcbiAgICAgICAgICBpZiAoY29kZSA9PSBudWxsIHx8IGNvZGUgPT09IHRva2VuLnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiAtLXBlbmRpbmcgfHwgZG9uZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0b2tlbi50ZXh0ID0gY29kZTtcbiAgICAgICAgICB0b2tlbi5lc2NhcGVkID0gdHJ1ZTtcbiAgICAgICAgICAtLXBlbmRpbmcgfHwgZG9uZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKHRva2Vuc1tpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG4gIHRyeSB7XG4gICAgaWYgKG9wdCkgb3B0ID0gbWVyZ2Uoe30sIG1hcmtlZC5kZWZhdWx0cywgb3B0KTtcbiAgICByZXR1cm4gUGFyc2VyLnBhcnNlKExleGVyLmxleChzcmMsIG9wdCksIG9wdCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBlLm1lc3NhZ2UgKz0gJ1xcblBsZWFzZSByZXBvcnQgdGhpcyB0byBodHRwczovL2dpdGh1Yi5jb20vY2hqai9tYXJrZWQuJztcbiAgICBpZiAoKG9wdCB8fCBtYXJrZWQuZGVmYXVsdHMpLnNpbGVudCkge1xuICAgICAgcmV0dXJuICc8cD5BbiBlcnJvciBvY2N1cmVkOjwvcD48cHJlPidcbiAgICAgICAgKyBlc2NhcGUoZS5tZXNzYWdlICsgJycsIHRydWUpXG4gICAgICAgICsgJzwvcHJlPic7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn1cblxuLyoqXG4gKiBPcHRpb25zXG4gKi9cblxubWFya2VkLm9wdGlvbnMgPVxubWFya2VkLnNldE9wdGlvbnMgPSBmdW5jdGlvbihvcHQpIHtcbiAgbWVyZ2UobWFya2VkLmRlZmF1bHRzLCBvcHQpO1xuICByZXR1cm4gbWFya2VkO1xufTtcblxubWFya2VkLmRlZmF1bHRzID0ge1xuICBnZm06IHRydWUsXG4gIHRhYmxlczogdHJ1ZSxcbiAgYnJlYWtzOiBmYWxzZSxcbiAgcGVkYW50aWM6IGZhbHNlLFxuICBzYW5pdGl6ZTogZmFsc2UsXG4gIHNtYXJ0TGlzdHM6IGZhbHNlLFxuICBzaWxlbnQ6IGZhbHNlLFxuICBoaWdobGlnaHQ6IG51bGwsXG4gIGxhbmdQcmVmaXg6ICdsYW5nLScsXG4gIHNtYXJ0eXBhbnRzOiBmYWxzZSxcbiAgaGVhZGVyUHJlZml4OiAnJyxcbiAgcmVuZGVyZXI6IG5ldyBSZW5kZXJlcixcbiAgeGh0bWw6IGZhbHNlXG59O1xuXG4vKipcbiAqIEV4cG9zZVxuICovXG5cbm1hcmtlZC5QYXJzZXIgPSBQYXJzZXI7XG5tYXJrZWQucGFyc2VyID0gUGFyc2VyLnBhcnNlO1xuXG5tYXJrZWQuUmVuZGVyZXIgPSBSZW5kZXJlcjtcblxubWFya2VkLkxleGVyID0gTGV4ZXI7XG5tYXJrZWQubGV4ZXIgPSBMZXhlci5sZXg7XG5cbm1hcmtlZC5JbmxpbmVMZXhlciA9IElubGluZUxleGVyO1xubWFya2VkLmlubGluZUxleGVyID0gSW5saW5lTGV4ZXIub3V0cHV0O1xuXG5tYXJrZWQucGFyc2UgPSBtYXJrZWQ7XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBtYXJrZWQ7XG59IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBtYXJrZWQ7IH0pO1xufSBlbHNlIHtcbiAgdGhpcy5tYXJrZWQgPSBtYXJrZWQ7XG59XG5cbn0pLmNhbGwoZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzIHx8ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IGdsb2JhbCk7XG59KCkpO1xuIiwiLy8hIG1vbWVudC5qc1xuLy8hIHZlcnNpb24gOiAyLjkuMFxuLy8hIGF1dGhvcnMgOiBUaW0gV29vZCwgSXNrcmVuIENoZXJuZXYsIE1vbWVudC5qcyBjb250cmlidXRvcnNcbi8vISBsaWNlbnNlIDogTUlUXG4vLyEgbW9tZW50anMuY29tXG5cbihmdW5jdGlvbiAodW5kZWZpbmVkKSB7XG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdGFudHNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB2YXIgbW9tZW50LFxuICAgICAgICBWRVJTSU9OID0gJzIuOS4wJyxcbiAgICAgICAgLy8gdGhlIGdsb2JhbC1zY29wZSB0aGlzIGlzIE5PVCB0aGUgZ2xvYmFsIG9iamVjdCBpbiBOb2RlLmpzXG4gICAgICAgIGdsb2JhbFNjb3BlID0gKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnICYmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyB8fCB3aW5kb3cgPT09IGdsb2JhbC53aW5kb3cpKSA/IGdsb2JhbCA6IHRoaXMsXG4gICAgICAgIG9sZEdsb2JhbE1vbWVudCxcbiAgICAgICAgcm91bmQgPSBNYXRoLnJvdW5kLFxuICAgICAgICBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG4gICAgICAgIGksXG5cbiAgICAgICAgWUVBUiA9IDAsXG4gICAgICAgIE1PTlRIID0gMSxcbiAgICAgICAgREFURSA9IDIsXG4gICAgICAgIEhPVVIgPSAzLFxuICAgICAgICBNSU5VVEUgPSA0LFxuICAgICAgICBTRUNPTkQgPSA1LFxuICAgICAgICBNSUxMSVNFQ09ORCA9IDYsXG5cbiAgICAgICAgLy8gaW50ZXJuYWwgc3RvcmFnZSBmb3IgbG9jYWxlIGNvbmZpZyBmaWxlc1xuICAgICAgICBsb2NhbGVzID0ge30sXG5cbiAgICAgICAgLy8gZXh0cmEgbW9tZW50IGludGVybmFsIHByb3BlcnRpZXMgKHBsdWdpbnMgcmVnaXN0ZXIgcHJvcHMgaGVyZSlcbiAgICAgICAgbW9tZW50UHJvcGVydGllcyA9IFtdLFxuXG4gICAgICAgIC8vIGNoZWNrIGZvciBub2RlSlNcbiAgICAgICAgaGFzTW9kdWxlID0gKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cyksXG5cbiAgICAgICAgLy8gQVNQLk5FVCBqc29uIGRhdGUgZm9ybWF0IHJlZ2V4XG4gICAgICAgIGFzcE5ldEpzb25SZWdleCA9IC9eXFwvP0RhdGVcXCgoXFwtP1xcZCspL2ksXG4gICAgICAgIGFzcE5ldFRpbWVTcGFuSnNvblJlZ2V4ID0gLyhcXC0pPyg/OihcXGQqKVxcLik/KFxcZCspXFw6KFxcZCspKD86XFw6KFxcZCspXFwuPyhcXGR7M30pPyk/LyxcblxuICAgICAgICAvLyBmcm9tIGh0dHA6Ly9kb2NzLmNsb3N1cmUtbGlicmFyeS5nb29nbGVjb2RlLmNvbS9naXQvY2xvc3VyZV9nb29nX2RhdGVfZGF0ZS5qcy5zb3VyY2UuaHRtbFxuICAgICAgICAvLyBzb21ld2hhdCBtb3JlIGluIGxpbmUgd2l0aCA0LjQuMy4yIDIwMDQgc3BlYywgYnV0IGFsbG93cyBkZWNpbWFsIGFueXdoZXJlXG4gICAgICAgIGlzb0R1cmF0aW9uUmVnZXggPSAvXigtKT9QKD86KD86KFswLTksLl0qKVkpPyg/OihbMC05LC5dKilNKT8oPzooWzAtOSwuXSopRCk/KD86VCg/OihbMC05LC5dKilIKT8oPzooWzAtOSwuXSopTSk/KD86KFswLTksLl0qKVMpPyk/fChbMC05LC5dKilXKSQvLFxuXG4gICAgICAgIC8vIGZvcm1hdCB0b2tlbnNcbiAgICAgICAgZm9ybWF0dGluZ1Rva2VucyA9IC8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhNb3xNTT9NP00/fERvfERERG98REQ/RD9EP3xkZGQ/ZD98ZG8/fHdbb3x3XT98V1tvfFddP3xRfFlZWVlZWXxZWVlZWXxZWVlZfFlZfGdnKGdnZz8pP3xHRyhHR0c/KT98ZXxFfGF8QXxoaD98SEg/fG1tP3xzcz98U3sxLDR9fHh8WHx6ej98Wlo/fC4pL2csXG4gICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2VucyA9IC8oXFxbW15cXFtdKlxcXSl8KFxcXFwpPyhMVFN8TFR8TEw/TD9MP3xsezEsNH0pL2csXG5cbiAgICAgICAgLy8gcGFyc2luZyB0b2tlbiByZWdleGVzXG4gICAgICAgIHBhcnNlVG9rZW5PbmVPclR3b0RpZ2l0cyA9IC9cXGRcXGQ/LywgLy8gMCAtIDk5XG4gICAgICAgIHBhcnNlVG9rZW5PbmVUb1RocmVlRGlnaXRzID0gL1xcZHsxLDN9LywgLy8gMCAtIDk5OVxuICAgICAgICBwYXJzZVRva2VuT25lVG9Gb3VyRGlnaXRzID0gL1xcZHsxLDR9LywgLy8gMCAtIDk5OTlcbiAgICAgICAgcGFyc2VUb2tlbk9uZVRvU2l4RGlnaXRzID0gL1srXFwtXT9cXGR7MSw2fS8sIC8vIC05OTksOTk5IC0gOTk5LDk5OVxuICAgICAgICBwYXJzZVRva2VuRGlnaXRzID0gL1xcZCsvLCAvLyBub256ZXJvIG51bWJlciBvZiBkaWdpdHNcbiAgICAgICAgcGFyc2VUb2tlbldvcmQgPSAvWzAtOV0qWydhLXpcXHUwMEEwLVxcdTA1RkZcXHUwNzAwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdK3xbXFx1MDYwMC1cXHUwNkZGXFwvXSsoXFxzKj9bXFx1MDYwMC1cXHUwNkZGXSspezEsMn0vaSwgLy8gYW55IHdvcmQgKG9yIHR3bykgY2hhcmFjdGVycyBvciBudW1iZXJzIGluY2x1ZGluZyB0d28vdGhyZWUgd29yZCBtb250aCBpbiBhcmFiaWMuXG4gICAgICAgIHBhcnNlVG9rZW5UaW1lem9uZSA9IC9afFtcXCtcXC1dXFxkXFxkOj9cXGRcXGQvZ2ksIC8vICswMDowMCAtMDA6MDAgKzAwMDAgLTAwMDAgb3IgWlxuICAgICAgICBwYXJzZVRva2VuVCA9IC9UL2ksIC8vIFQgKElTTyBzZXBhcmF0b3IpXG4gICAgICAgIHBhcnNlVG9rZW5PZmZzZXRNcyA9IC9bXFwrXFwtXT9cXGQrLywgLy8gMTIzNDU2Nzg5MDEyM1xuICAgICAgICBwYXJzZVRva2VuVGltZXN0YW1wTXMgPSAvW1xcK1xcLV0/XFxkKyhcXC5cXGR7MSwzfSk/LywgLy8gMTIzNDU2Nzg5IDEyMzQ1Njc4OS4xMjNcblxuICAgICAgICAvL3N0cmljdCBwYXJzaW5nIHJlZ2V4ZXNcbiAgICAgICAgcGFyc2VUb2tlbk9uZURpZ2l0ID0gL1xcZC8sIC8vIDAgLSA5XG4gICAgICAgIHBhcnNlVG9rZW5Ud29EaWdpdHMgPSAvXFxkXFxkLywgLy8gMDAgLSA5OVxuICAgICAgICBwYXJzZVRva2VuVGhyZWVEaWdpdHMgPSAvXFxkezN9LywgLy8gMDAwIC0gOTk5XG4gICAgICAgIHBhcnNlVG9rZW5Gb3VyRGlnaXRzID0gL1xcZHs0fS8sIC8vIDAwMDAgLSA5OTk5XG4gICAgICAgIHBhcnNlVG9rZW5TaXhEaWdpdHMgPSAvWystXT9cXGR7Nn0vLCAvLyAtOTk5LDk5OSAtIDk5OSw5OTlcbiAgICAgICAgcGFyc2VUb2tlblNpZ25lZE51bWJlciA9IC9bKy1dP1xcZCsvLCAvLyAtaW5mIC0gaW5mXG5cbiAgICAgICAgLy8gaXNvIDg2MDEgcmVnZXhcbiAgICAgICAgLy8gMDAwMC0wMC0wMCAwMDAwLVcwMCBvciAwMDAwLVcwMC0wICsgVCArIDAwIG9yIDAwOjAwIG9yIDAwOjAwOjAwIG9yIDAwOjAwOjAwLjAwMCArICswMDowMCBvciArMDAwMCBvciArMDApXG4gICAgICAgIGlzb1JlZ2V4ID0gL15cXHMqKD86WystXVxcZHs2fXxcXGR7NH0pLSg/OihcXGRcXGQtXFxkXFxkKXwoV1xcZFxcZCQpfChXXFxkXFxkLVxcZCl8KFxcZFxcZFxcZCkpKChUfCApKFxcZFxcZCg6XFxkXFxkKDpcXGRcXGQoXFwuXFxkKyk/KT8pPyk/KFtcXCtcXC1dXFxkXFxkKD86Oj9cXGRcXGQpP3xcXHMqWik/KT8kLyxcblxuICAgICAgICBpc29Gb3JtYXQgPSAnWVlZWS1NTS1ERFRISDptbTpzc1onLFxuXG4gICAgICAgIGlzb0RhdGVzID0gW1xuICAgICAgICAgICAgWydZWVlZWVktTU0tREQnLCAvWystXVxcZHs2fS1cXGR7Mn0tXFxkezJ9L10sXG4gICAgICAgICAgICBbJ1lZWVktTU0tREQnLCAvXFxkezR9LVxcZHsyfS1cXGR7Mn0vXSxcbiAgICAgICAgICAgIFsnR0dHRy1bV11XVy1FJywgL1xcZHs0fS1XXFxkezJ9LVxcZC9dLFxuICAgICAgICAgICAgWydHR0dHLVtXXVdXJywgL1xcZHs0fS1XXFxkezJ9L10sXG4gICAgICAgICAgICBbJ1lZWVktREREJywgL1xcZHs0fS1cXGR7M30vXVxuICAgICAgICBdLFxuXG4gICAgICAgIC8vIGlzbyB0aW1lIGZvcm1hdHMgYW5kIHJlZ2V4ZXNcbiAgICAgICAgaXNvVGltZXMgPSBbXG4gICAgICAgICAgICBbJ0hIOm1tOnNzLlNTU1MnLCAvKFR8IClcXGRcXGQ6XFxkXFxkOlxcZFxcZFxcLlxcZCsvXSxcbiAgICAgICAgICAgIFsnSEg6bW06c3MnLCAvKFR8IClcXGRcXGQ6XFxkXFxkOlxcZFxcZC9dLFxuICAgICAgICAgICAgWydISDptbScsIC8oVHwgKVxcZFxcZDpcXGRcXGQvXSxcbiAgICAgICAgICAgIFsnSEgnLCAvKFR8IClcXGRcXGQvXVxuICAgICAgICBdLFxuXG4gICAgICAgIC8vIHRpbWV6b25lIGNodW5rZXIgJysxMDowMCcgPiBbJzEwJywgJzAwJ10gb3IgJy0xNTMwJyA+IFsnLScsICcxNScsICczMCddXG4gICAgICAgIHBhcnNlVGltZXpvbmVDaHVua2VyID0gLyhbXFwrXFwtXXxcXGRcXGQpL2dpLFxuXG4gICAgICAgIC8vIGdldHRlciBhbmQgc2V0dGVyIG5hbWVzXG4gICAgICAgIHByb3h5R2V0dGVyc0FuZFNldHRlcnMgPSAnRGF0ZXxIb3Vyc3xNaW51dGVzfFNlY29uZHN8TWlsbGlzZWNvbmRzJy5zcGxpdCgnfCcpLFxuICAgICAgICB1bml0TWlsbGlzZWNvbmRGYWN0b3JzID0ge1xuICAgICAgICAgICAgJ01pbGxpc2Vjb25kcycgOiAxLFxuICAgICAgICAgICAgJ1NlY29uZHMnIDogMWUzLFxuICAgICAgICAgICAgJ01pbnV0ZXMnIDogNmU0LFxuICAgICAgICAgICAgJ0hvdXJzJyA6IDM2ZTUsXG4gICAgICAgICAgICAnRGF5cycgOiA4NjRlNSxcbiAgICAgICAgICAgICdNb250aHMnIDogMjU5MmU2LFxuICAgICAgICAgICAgJ1llYXJzJyA6IDMxNTM2ZTZcbiAgICAgICAgfSxcblxuICAgICAgICB1bml0QWxpYXNlcyA9IHtcbiAgICAgICAgICAgIG1zIDogJ21pbGxpc2Vjb25kJyxcbiAgICAgICAgICAgIHMgOiAnc2Vjb25kJyxcbiAgICAgICAgICAgIG0gOiAnbWludXRlJyxcbiAgICAgICAgICAgIGggOiAnaG91cicsXG4gICAgICAgICAgICBkIDogJ2RheScsXG4gICAgICAgICAgICBEIDogJ2RhdGUnLFxuICAgICAgICAgICAgdyA6ICd3ZWVrJyxcbiAgICAgICAgICAgIFcgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICBNIDogJ21vbnRoJyxcbiAgICAgICAgICAgIFEgOiAncXVhcnRlcicsXG4gICAgICAgICAgICB5IDogJ3llYXInLFxuICAgICAgICAgICAgREREIDogJ2RheU9mWWVhcicsXG4gICAgICAgICAgICBlIDogJ3dlZWtkYXknLFxuICAgICAgICAgICAgRSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGdnOiAnd2Vla1llYXInLFxuICAgICAgICAgICAgR0c6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICBjYW1lbEZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIGRheW9meWVhciA6ICdkYXlPZlllYXInLFxuICAgICAgICAgICAgaXNvd2Vla2RheSA6ICdpc29XZWVrZGF5JyxcbiAgICAgICAgICAgIGlzb3dlZWsgOiAnaXNvV2VlaycsXG4gICAgICAgICAgICB3ZWVreWVhciA6ICd3ZWVrWWVhcicsXG4gICAgICAgICAgICBpc293ZWVreWVhciA6ICdpc29XZWVrWWVhcidcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBmb3JtYXQgZnVuY3Rpb24gc3RyaW5nc1xuICAgICAgICBmb3JtYXRGdW5jdGlvbnMgPSB7fSxcblxuICAgICAgICAvLyBkZWZhdWx0IHJlbGF0aXZlIHRpbWUgdGhyZXNob2xkc1xuICAgICAgICByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzID0ge1xuICAgICAgICAgICAgczogNDUsICAvLyBzZWNvbmRzIHRvIG1pbnV0ZVxuICAgICAgICAgICAgbTogNDUsICAvLyBtaW51dGVzIHRvIGhvdXJcbiAgICAgICAgICAgIGg6IDIyLCAgLy8gaG91cnMgdG8gZGF5XG4gICAgICAgICAgICBkOiAyNiwgIC8vIGRheXMgdG8gbW9udGhcbiAgICAgICAgICAgIE06IDExICAgLy8gbW9udGhzIHRvIHllYXJcbiAgICAgICAgfSxcblxuICAgICAgICAvLyB0b2tlbnMgdG8gb3JkaW5hbGl6ZSBhbmQgcGFkXG4gICAgICAgIG9yZGluYWxpemVUb2tlbnMgPSAnREREIHcgVyBNIEQgZCcuc3BsaXQoJyAnKSxcbiAgICAgICAgcGFkZGVkVG9rZW5zID0gJ00gRCBIIGggbSBzIHcgVycuc3BsaXQoJyAnKSxcblxuICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9ucyA9IHtcbiAgICAgICAgICAgIE0gICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9udGgoKSArIDE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTU1NICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubW9udGhzU2hvcnQodGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBNTU1NIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5tb250aHModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBEREQgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRheU9mWWVhcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGQgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGQgICA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXNNaW4odGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZGQgIDogZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS53ZWVrZGF5c1Nob3J0KHRoaXMsIGZvcm1hdCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGRkZCA6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkud2Vla2RheXModGhpcywgZm9ybWF0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3ICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBXICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzb1dlZWsoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBZWSAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy55ZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLnllYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgWVlZWVlZIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB5ID0gdGhpcy55ZWFyKCksIHNpZ24gPSB5ID49IDAgPyAnKycgOiAnLSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWZ0WmVyb0ZpbGwoTWF0aC5hYnMoeSksIDYpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCkgJSAxMDAsIDIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLndlZWtZZWFyKCksIDQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdnZ2dnIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy53ZWVrWWVhcigpLCA1KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHRyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpICUgMTAwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodGhpcy5pc29XZWVrWWVhcigpLCA0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBHR0dHRyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMuaXNvV2Vla1llYXIoKSwgNSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53ZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc29XZWVrZGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgQSAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkubWVyaWRpZW0odGhpcy5ob3VycygpLCB0aGlzLm1pbnV0ZXMoKSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEggICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG91cnMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvdXJzKCkgJSAxMiB8fCAxMjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm1pbnV0ZXMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlY29uZHMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b0ludCh0aGlzLm1pbGxpc2Vjb25kcygpIC8gMTAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTUyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0WmVyb0ZpbGwodG9JbnQodGhpcy5taWxsaXNlY29uZHMoKSAvIDEwKSwgMik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU1NTICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdFplcm9GaWxsKHRoaXMubWlsbGlzZWNvbmRzKCksIDMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFNTU1MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbCh0aGlzLm1pbGxpc2Vjb25kcygpLCAzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBaICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gdGhpcy51dGNPZmZzZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgYiA9ICcrJztcbiAgICAgICAgICAgICAgICBpZiAoYSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYSA9IC1hO1xuICAgICAgICAgICAgICAgICAgICBiID0gJy0nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYiArIGxlZnRaZXJvRmlsbCh0b0ludChhIC8gNjApLCAyKSArICc6JyArIGxlZnRaZXJvRmlsbCh0b0ludChhKSAlIDYwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBaWiAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gdGhpcy51dGNPZmZzZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgYiA9ICcrJztcbiAgICAgICAgICAgICAgICBpZiAoYSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYSA9IC1hO1xuICAgICAgICAgICAgICAgICAgICBiID0gJy0nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYiArIGxlZnRaZXJvRmlsbCh0b0ludChhIC8gNjApLCAyKSArIGxlZnRaZXJvRmlsbCh0b0ludChhKSAlIDYwLCAyKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB6IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnpvbmVBYmJyKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgenogOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuem9uZU5hbWUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB4ICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBYICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnVuaXgoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBRIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1YXJ0ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBkZXByZWNhdGlvbnMgPSB7fSxcblxuICAgICAgICBsaXN0cyA9IFsnbW9udGhzJywgJ21vbnRoc1Nob3J0JywgJ3dlZWtkYXlzJywgJ3dlZWtkYXlzU2hvcnQnLCAnd2Vla2RheXNNaW4nXSxcblxuICAgICAgICB1cGRhdGVJblByb2dyZXNzID0gZmFsc2U7XG5cbiAgICAvLyBQaWNrIHRoZSBmaXJzdCBkZWZpbmVkIG9mIHR3byBvciB0aHJlZSBhcmd1bWVudHMuIGRmbCBjb21lcyBmcm9tXG4gICAgLy8gZGVmYXVsdC5cbiAgICBmdW5jdGlvbiBkZmwoYSwgYiwgYykge1xuICAgICAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMjogcmV0dXJuIGEgIT0gbnVsbCA/IGEgOiBiO1xuICAgICAgICAgICAgY2FzZSAzOiByZXR1cm4gYSAhPSBudWxsID8gYSA6IGIgIT0gbnVsbCA/IGIgOiBjO1xuICAgICAgICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCdJbXBsZW1lbnQgbWUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhc093blByb3AoYSwgYikge1xuICAgICAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChhLCBiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWZhdWx0UGFyc2luZ0ZsYWdzKCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGRlZXAgY2xvbmUgdGhpcyBvYmplY3QsIGFuZCBlczUgc3RhbmRhcmQgaXMgbm90IHZlcnlcbiAgICAgICAgLy8gaGVscGZ1bC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVtcHR5IDogZmFsc2UsXG4gICAgICAgICAgICB1bnVzZWRUb2tlbnMgOiBbXSxcbiAgICAgICAgICAgIHVudXNlZElucHV0IDogW10sXG4gICAgICAgICAgICBvdmVyZmxvdyA6IC0yLFxuICAgICAgICAgICAgY2hhcnNMZWZ0T3ZlciA6IDAsXG4gICAgICAgICAgICBudWxsSW5wdXQgOiBmYWxzZSxcbiAgICAgICAgICAgIGludmFsaWRNb250aCA6IG51bGwsXG4gICAgICAgICAgICBpbnZhbGlkRm9ybWF0IDogZmFsc2UsXG4gICAgICAgICAgICB1c2VySW52YWxpZGF0ZWQgOiBmYWxzZSxcbiAgICAgICAgICAgIGlzbzogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmludE1zZyhtc2cpIHtcbiAgICAgICAgaWYgKG1vbWVudC5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MgPT09IGZhbHNlICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdEZXByZWNhdGlvbiB3YXJuaW5nOiAnICsgbXNnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlcHJlY2F0ZShtc2csIGZuKSB7XG4gICAgICAgIHZhciBmaXJzdFRpbWUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChmaXJzdFRpbWUpIHtcbiAgICAgICAgICAgICAgICBwcmludE1zZyhtc2cpO1xuICAgICAgICAgICAgICAgIGZpcnN0VGltZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sIGZuKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXByZWNhdGVTaW1wbGUobmFtZSwgbXNnKSB7XG4gICAgICAgIGlmICghZGVwcmVjYXRpb25zW25hbWVdKSB7XG4gICAgICAgICAgICBwcmludE1zZyhtc2cpO1xuICAgICAgICAgICAgZGVwcmVjYXRpb25zW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhZFRva2VuKGZ1bmMsIGNvdW50KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgcmV0dXJuIGxlZnRaZXJvRmlsbChmdW5jLmNhbGwodGhpcywgYSksIGNvdW50KTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gb3JkaW5hbGl6ZVRva2VuKGZ1bmMsIHBlcmlvZCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2FsZURhdGEoKS5vcmRpbmFsKGZ1bmMuY2FsbCh0aGlzLCBhKSwgcGVyaW9kKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb250aERpZmYoYSwgYikge1xuICAgICAgICAvLyBkaWZmZXJlbmNlIGluIG1vbnRoc1xuICAgICAgICB2YXIgd2hvbGVNb250aERpZmYgPSAoKGIueWVhcigpIC0gYS55ZWFyKCkpICogMTIpICsgKGIubW9udGgoKSAtIGEubW9udGgoKSksXG4gICAgICAgICAgICAvLyBiIGlzIGluIChhbmNob3IgLSAxIG1vbnRoLCBhbmNob3IgKyAxIG1vbnRoKVxuICAgICAgICAgICAgYW5jaG9yID0gYS5jbG9uZSgpLmFkZCh3aG9sZU1vbnRoRGlmZiwgJ21vbnRocycpLFxuICAgICAgICAgICAgYW5jaG9yMiwgYWRqdXN0O1xuXG4gICAgICAgIGlmIChiIC0gYW5jaG9yIDwgMCkge1xuICAgICAgICAgICAgYW5jaG9yMiA9IGEuY2xvbmUoKS5hZGQod2hvbGVNb250aERpZmYgLSAxLCAnbW9udGhzJyk7XG4gICAgICAgICAgICAvLyBsaW5lYXIgYWNyb3NzIHRoZSBtb250aFxuICAgICAgICAgICAgYWRqdXN0ID0gKGIgLSBhbmNob3IpIC8gKGFuY2hvciAtIGFuY2hvcjIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYW5jaG9yMiA9IGEuY2xvbmUoKS5hZGQod2hvbGVNb250aERpZmYgKyAxLCAnbW9udGhzJyk7XG4gICAgICAgICAgICAvLyBsaW5lYXIgYWNyb3NzIHRoZSBtb250aFxuICAgICAgICAgICAgYWRqdXN0ID0gKGIgLSBhbmNob3IpIC8gKGFuY2hvcjIgLSBhbmNob3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0od2hvbGVNb250aERpZmYgKyBhZGp1c3QpO1xuICAgIH1cblxuICAgIHdoaWxlIChvcmRpbmFsaXplVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICBpID0gb3JkaW5hbGl6ZVRva2Vucy5wb3AoKTtcbiAgICAgICAgZm9ybWF0VG9rZW5GdW5jdGlvbnNbaSArICdvJ10gPSBvcmRpbmFsaXplVG9rZW4oZm9ybWF0VG9rZW5GdW5jdGlvbnNbaV0sIGkpO1xuICAgIH1cbiAgICB3aGlsZSAocGFkZGVkVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICBpID0gcGFkZGVkVG9rZW5zLnBvcCgpO1xuICAgICAgICBmb3JtYXRUb2tlbkZ1bmN0aW9uc1tpICsgaV0gPSBwYWRUb2tlbihmb3JtYXRUb2tlbkZ1bmN0aW9uc1tpXSwgMik7XG4gICAgfVxuICAgIGZvcm1hdFRva2VuRnVuY3Rpb25zLkREREQgPSBwYWRUb2tlbihmb3JtYXRUb2tlbkZ1bmN0aW9ucy5EREQsIDMpO1xuXG5cbiAgICBmdW5jdGlvbiBtZXJpZGllbUZpeFdyYXAobG9jYWxlLCBob3VyLCBtZXJpZGllbSkge1xuICAgICAgICB2YXIgaXNQbTtcblxuICAgICAgICBpZiAobWVyaWRpZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gbm90aGluZyB0byBkb1xuICAgICAgICAgICAgcmV0dXJuIGhvdXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvY2FsZS5tZXJpZGllbUhvdXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsZS5tZXJpZGllbUhvdXIoaG91ciwgbWVyaWRpZW0pO1xuICAgICAgICB9IGVsc2UgaWYgKGxvY2FsZS5pc1BNICE9IG51bGwpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrXG4gICAgICAgICAgICBpc1BtID0gbG9jYWxlLmlzUE0obWVyaWRpZW0pO1xuICAgICAgICAgICAgaWYgKGlzUG0gJiYgaG91ciA8IDEyKSB7XG4gICAgICAgICAgICAgICAgaG91ciArPSAxMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaXNQbSAmJiBob3VyID09PSAxMikge1xuICAgICAgICAgICAgICAgIGhvdXIgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGhvdXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGllIGlzIG5vdCBzdXBwb3NlZCB0byBoYXBwZW5cbiAgICAgICAgICAgIHJldHVybiBob3VyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDb25zdHJ1Y3RvcnNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBmdW5jdGlvbiBMb2NhbGUoKSB7XG4gICAgfVxuXG4gICAgLy8gTW9tZW50IHByb3RvdHlwZSBvYmplY3RcbiAgICBmdW5jdGlvbiBNb21lbnQoY29uZmlnLCBza2lwT3ZlcmZsb3cpIHtcbiAgICAgICAgaWYgKHNraXBPdmVyZmxvdyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNoZWNrT3ZlcmZsb3coY29uZmlnKTtcbiAgICAgICAgfVxuICAgICAgICBjb3B5Q29uZmlnKHRoaXMsIGNvbmZpZyk7XG4gICAgICAgIHRoaXMuX2QgPSBuZXcgRGF0ZSgrY29uZmlnLl9kKTtcbiAgICAgICAgLy8gUHJldmVudCBpbmZpbml0ZSBsb29wIGluIGNhc2UgdXBkYXRlT2Zmc2V0IGNyZWF0ZXMgbmV3IG1vbWVudFxuICAgICAgICAvLyBvYmplY3RzLlxuICAgICAgICBpZiAodXBkYXRlSW5Qcm9ncmVzcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHVwZGF0ZUluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldCh0aGlzKTtcbiAgICAgICAgICAgIHVwZGF0ZUluUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIER1cmF0aW9uIENvbnN0cnVjdG9yXG4gICAgZnVuY3Rpb24gRHVyYXRpb24oZHVyYXRpb24pIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWRJbnB1dCA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGR1cmF0aW9uKSxcbiAgICAgICAgICAgIHllYXJzID0gbm9ybWFsaXplZElucHV0LnllYXIgfHwgMCxcbiAgICAgICAgICAgIHF1YXJ0ZXJzID0gbm9ybWFsaXplZElucHV0LnF1YXJ0ZXIgfHwgMCxcbiAgICAgICAgICAgIG1vbnRocyA9IG5vcm1hbGl6ZWRJbnB1dC5tb250aCB8fCAwLFxuICAgICAgICAgICAgd2Vla3MgPSBub3JtYWxpemVkSW5wdXQud2VlayB8fCAwLFxuICAgICAgICAgICAgZGF5cyA9IG5vcm1hbGl6ZWRJbnB1dC5kYXkgfHwgMCxcbiAgICAgICAgICAgIGhvdXJzID0gbm9ybWFsaXplZElucHV0LmhvdXIgfHwgMCxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSBub3JtYWxpemVkSW5wdXQubWludXRlIHx8IDAsXG4gICAgICAgICAgICBzZWNvbmRzID0gbm9ybWFsaXplZElucHV0LnNlY29uZCB8fCAwLFxuICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gbm9ybWFsaXplZElucHV0Lm1pbGxpc2Vjb25kIHx8IDA7XG5cbiAgICAgICAgLy8gcmVwcmVzZW50YXRpb24gZm9yIGRhdGVBZGRSZW1vdmVcbiAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzID0gK21pbGxpc2Vjb25kcyArXG4gICAgICAgICAgICBzZWNvbmRzICogMWUzICsgLy8gMTAwMFxuICAgICAgICAgICAgbWludXRlcyAqIDZlNCArIC8vIDEwMDAgKiA2MFxuICAgICAgICAgICAgaG91cnMgKiAzNmU1OyAvLyAxMDAwICogNjAgKiA2MFxuICAgICAgICAvLyBCZWNhdXNlIG9mIGRhdGVBZGRSZW1vdmUgdHJlYXRzIDI0IGhvdXJzIGFzIGRpZmZlcmVudCBmcm9tIGFcbiAgICAgICAgLy8gZGF5IHdoZW4gd29ya2luZyBhcm91bmQgRFNULCB3ZSBuZWVkIHRvIHN0b3JlIHRoZW0gc2VwYXJhdGVseVxuICAgICAgICB0aGlzLl9kYXlzID0gK2RheXMgK1xuICAgICAgICAgICAgd2Vla3MgKiA3O1xuICAgICAgICAvLyBJdCBpcyBpbXBvc3NpYmxlIHRyYW5zbGF0ZSBtb250aHMgaW50byBkYXlzIHdpdGhvdXQga25vd2luZ1xuICAgICAgICAvLyB3aGljaCBtb250aHMgeW91IGFyZSBhcmUgdGFsa2luZyBhYm91dCwgc28gd2UgaGF2ZSB0byBzdG9yZVxuICAgICAgICAvLyBpdCBzZXBhcmF0ZWx5LlxuICAgICAgICB0aGlzLl9tb250aHMgPSArbW9udGhzICtcbiAgICAgICAgICAgIHF1YXJ0ZXJzICogMyArXG4gICAgICAgICAgICB5ZWFycyAqIDEyO1xuXG4gICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcblxuICAgICAgICB0aGlzLl9sb2NhbGUgPSBtb21lbnQubG9jYWxlRGF0YSgpO1xuXG4gICAgICAgIHRoaXMuX2J1YmJsZSgpO1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgSGVscGVyc1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGEsIGIpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBiKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcChiLCBpKSkge1xuICAgICAgICAgICAgICAgIGFbaV0gPSBiW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhc093blByb3AoYiwgJ3RvU3RyaW5nJykpIHtcbiAgICAgICAgICAgIGEudG9TdHJpbmcgPSBiLnRvU3RyaW5nO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhc093blByb3AoYiwgJ3ZhbHVlT2YnKSkge1xuICAgICAgICAgICAgYS52YWx1ZU9mID0gYi52YWx1ZU9mO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29weUNvbmZpZyh0bywgZnJvbSkge1xuICAgICAgICB2YXIgaSwgcHJvcCwgdmFsO1xuXG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5faXNBTW9tZW50T2JqZWN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2lzQU1vbWVudE9iamVjdCA9IGZyb20uX2lzQU1vbWVudE9iamVjdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX2kgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5faSA9IGZyb20uX2k7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9mICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2YgPSBmcm9tLl9mO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9sID0gZnJvbS5fbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX3N0cmljdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9zdHJpY3QgPSBmcm9tLl9zdHJpY3Q7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl90em0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5fdHptID0gZnJvbS5fdHptO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5faXNVVEMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0by5faXNVVEMgPSBmcm9tLl9pc1VUQztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGZyb20uX29mZnNldCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9vZmZzZXQgPSBmcm9tLl9vZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBmcm9tLl9wZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRvLl9wZiA9IGZyb20uX3BmO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZnJvbS5fbG9jYWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG8uX2xvY2FsZSA9IGZyb20uX2xvY2FsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb21lbnRQcm9wZXJ0aWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZvciAoaSBpbiBtb21lbnRQcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IG1vbWVudFByb3BlcnRpZXNbaV07XG4gICAgICAgICAgICAgICAgdmFsID0gZnJvbVtwcm9wXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9bcHJvcF0gPSB2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRvO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFic1JvdW5kKG51bWJlcikge1xuICAgICAgICBpZiAobnVtYmVyIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguY2VpbChudW1iZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IobnVtYmVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxlZnQgemVybyBmaWxsIGEgbnVtYmVyXG4gICAgLy8gc2VlIGh0dHA6Ly9qc3BlcmYuY29tL2xlZnQtemVyby1maWxsaW5nIGZvciBwZXJmb3JtYW5jZSBjb21wYXJpc29uXG4gICAgZnVuY3Rpb24gbGVmdFplcm9GaWxsKG51bWJlciwgdGFyZ2V0TGVuZ3RoLCBmb3JjZVNpZ24pIHtcbiAgICAgICAgdmFyIG91dHB1dCA9ICcnICsgTWF0aC5hYnMobnVtYmVyKSxcbiAgICAgICAgICAgIHNpZ24gPSBudW1iZXIgPj0gMDtcblxuICAgICAgICB3aGlsZSAob3V0cHV0Lmxlbmd0aCA8IHRhcmdldExlbmd0aCkge1xuICAgICAgICAgICAgb3V0cHV0ID0gJzAnICsgb3V0cHV0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoc2lnbiA/IChmb3JjZVNpZ24gPyAnKycgOiAnJykgOiAnLScpICsgb3V0cHV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvc2l0aXZlTW9tZW50c0RpZmZlcmVuY2UoYmFzZSwgb3RoZXIpIHtcbiAgICAgICAgdmFyIHJlcyA9IHttaWxsaXNlY29uZHM6IDAsIG1vbnRoczogMH07XG5cbiAgICAgICAgcmVzLm1vbnRocyA9IG90aGVyLm1vbnRoKCkgLSBiYXNlLm1vbnRoKCkgK1xuICAgICAgICAgICAgKG90aGVyLnllYXIoKSAtIGJhc2UueWVhcigpKSAqIDEyO1xuICAgICAgICBpZiAoYmFzZS5jbG9uZSgpLmFkZChyZXMubW9udGhzLCAnTScpLmlzQWZ0ZXIob3RoZXIpKSB7XG4gICAgICAgICAgICAtLXJlcy5tb250aHM7XG4gICAgICAgIH1cblxuICAgICAgICByZXMubWlsbGlzZWNvbmRzID0gK290aGVyIC0gKyhiYXNlLmNsb25lKCkuYWRkKHJlcy5tb250aHMsICdNJykpO1xuXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9tZW50c0RpZmZlcmVuY2UoYmFzZSwgb3RoZXIpIHtcbiAgICAgICAgdmFyIHJlcztcbiAgICAgICAgb3RoZXIgPSBtYWtlQXMob3RoZXIsIGJhc2UpO1xuICAgICAgICBpZiAoYmFzZS5pc0JlZm9yZShvdGhlcikpIHtcbiAgICAgICAgICAgIHJlcyA9IHBvc2l0aXZlTW9tZW50c0RpZmZlcmVuY2UoYmFzZSwgb3RoZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzID0gcG9zaXRpdmVNb21lbnRzRGlmZmVyZW5jZShvdGhlciwgYmFzZSk7XG4gICAgICAgICAgICByZXMubWlsbGlzZWNvbmRzID0gLXJlcy5taWxsaXNlY29uZHM7XG4gICAgICAgICAgICByZXMubW9udGhzID0gLXJlcy5tb250aHM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIC8vIFRPRE86IHJlbW92ZSAnbmFtZScgYXJnIGFmdGVyIGRlcHJlY2F0aW9uIGlzIHJlbW92ZWRcbiAgICBmdW5jdGlvbiBjcmVhdGVBZGRlcihkaXJlY3Rpb24sIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWwsIHBlcmlvZCkge1xuICAgICAgICAgICAgdmFyIGR1ciwgdG1wO1xuICAgICAgICAgICAgLy9pbnZlcnQgdGhlIGFyZ3VtZW50cywgYnV0IGNvbXBsYWluIGFib3V0IGl0XG4gICAgICAgICAgICBpZiAocGVyaW9kICE9PSBudWxsICYmICFpc05hTigrcGVyaW9kKSkge1xuICAgICAgICAgICAgICAgIGRlcHJlY2F0ZVNpbXBsZShuYW1lLCAnbW9tZW50KCkuJyArIG5hbWUgICsgJyhwZXJpb2QsIG51bWJlcikgaXMgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBtb21lbnQoKS4nICsgbmFtZSArICcobnVtYmVyLCBwZXJpb2QpLicpO1xuICAgICAgICAgICAgICAgIHRtcCA9IHZhbDsgdmFsID0gcGVyaW9kOyBwZXJpb2QgPSB0bXA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhbCA9IHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnID8gK3ZhbCA6IHZhbDtcbiAgICAgICAgICAgIGR1ciA9IG1vbWVudC5kdXJhdGlvbih2YWwsIHBlcmlvZCk7XG4gICAgICAgICAgICBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KHRoaXMsIGR1ciwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZE9yU3VidHJhY3REdXJhdGlvbkZyb21Nb21lbnQobW9tLCBkdXJhdGlvbiwgaXNBZGRpbmcsIHVwZGF0ZU9mZnNldCkge1xuICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gZHVyYXRpb24uX21pbGxpc2Vjb25kcyxcbiAgICAgICAgICAgIGRheXMgPSBkdXJhdGlvbi5fZGF5cyxcbiAgICAgICAgICAgIG1vbnRocyA9IGR1cmF0aW9uLl9tb250aHM7XG4gICAgICAgIHVwZGF0ZU9mZnNldCA9IHVwZGF0ZU9mZnNldCA9PSBudWxsID8gdHJ1ZSA6IHVwZGF0ZU9mZnNldDtcblxuICAgICAgICBpZiAobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgICAgICBtb20uX2Quc2V0VGltZSgrbW9tLl9kICsgbWlsbGlzZWNvbmRzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXlzKSB7XG4gICAgICAgICAgICByYXdTZXR0ZXIobW9tLCAnRGF0ZScsIHJhd0dldHRlcihtb20sICdEYXRlJykgKyBkYXlzICogaXNBZGRpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb250aHMpIHtcbiAgICAgICAgICAgIHJhd01vbnRoU2V0dGVyKG1vbSwgcmF3R2V0dGVyKG1vbSwgJ01vbnRoJykgKyBtb250aHMgKiBpc0FkZGluZyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVwZGF0ZU9mZnNldCkge1xuICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldChtb20sIGRheXMgfHwgbW9udGhzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNoZWNrIGlmIGlzIGFuIGFycmF5XG4gICAgZnVuY3Rpb24gaXNBcnJheShpbnB1dCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGlucHV0KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RhdGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpbnB1dCkgPT09ICdbb2JqZWN0IERhdGVdJyB8fFxuICAgICAgICAgICAgaW5wdXQgaW5zdGFuY2VvZiBEYXRlO1xuICAgIH1cblxuICAgIC8vIGNvbXBhcmUgdHdvIGFycmF5cywgcmV0dXJuIHRoZSBudW1iZXIgb2YgZGlmZmVyZW5jZXNcbiAgICBmdW5jdGlvbiBjb21wYXJlQXJyYXlzKGFycmF5MSwgYXJyYXkyLCBkb250Q29udmVydCkge1xuICAgICAgICB2YXIgbGVuID0gTWF0aC5taW4oYXJyYXkxLmxlbmd0aCwgYXJyYXkyLmxlbmd0aCksXG4gICAgICAgICAgICBsZW5ndGhEaWZmID0gTWF0aC5hYnMoYXJyYXkxLmxlbmd0aCAtIGFycmF5Mi5sZW5ndGgpLFxuICAgICAgICAgICAgZGlmZnMgPSAwLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKGRvbnRDb252ZXJ0ICYmIGFycmF5MVtpXSAhPT0gYXJyYXkyW2ldKSB8fFxuICAgICAgICAgICAgICAgICghZG9udENvbnZlcnQgJiYgdG9JbnQoYXJyYXkxW2ldKSAhPT0gdG9JbnQoYXJyYXkyW2ldKSkpIHtcbiAgICAgICAgICAgICAgICBkaWZmcysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWZmcyArIGxlbmd0aERpZmY7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbm9ybWFsaXplVW5pdHModW5pdHMpIHtcbiAgICAgICAgaWYgKHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgbG93ZXJlZCA9IHVuaXRzLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvKC4pcyQvLCAnJDEnKTtcbiAgICAgICAgICAgIHVuaXRzID0gdW5pdEFsaWFzZXNbdW5pdHNdIHx8IGNhbWVsRnVuY3Rpb25zW2xvd2VyZWRdIHx8IGxvd2VyZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuaXRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZU9iamVjdFVuaXRzKGlucHV0T2JqZWN0KSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkSW5wdXQgPSB7fSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wLFxuICAgICAgICAgICAgcHJvcDtcblxuICAgICAgICBmb3IgKHByb3AgaW4gaW5wdXRPYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wKGlucHV0T2JqZWN0LCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRQcm9wID0gbm9ybWFsaXplVW5pdHMocHJvcCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dFtub3JtYWxpemVkUHJvcF0gPSBpbnB1dE9iamVjdFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9ybWFsaXplZElucHV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VMaXN0KGZpZWxkKSB7XG4gICAgICAgIHZhciBjb3VudCwgc2V0dGVyO1xuXG4gICAgICAgIGlmIChmaWVsZC5pbmRleE9mKCd3ZWVrJykgPT09IDApIHtcbiAgICAgICAgICAgIGNvdW50ID0gNztcbiAgICAgICAgICAgIHNldHRlciA9ICdkYXknO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGZpZWxkLmluZGV4T2YoJ21vbnRoJykgPT09IDApIHtcbiAgICAgICAgICAgIGNvdW50ID0gMTI7XG4gICAgICAgICAgICBzZXR0ZXIgPSAnbW9udGgnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbW9tZW50W2ZpZWxkXSA9IGZ1bmN0aW9uIChmb3JtYXQsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaSwgZ2V0dGVyLFxuICAgICAgICAgICAgICAgIG1ldGhvZCA9IG1vbWVudC5fbG9jYWxlW2ZpZWxkXSxcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gW107XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm9ybWF0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gZm9ybWF0O1xuICAgICAgICAgICAgICAgIGZvcm1hdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ2V0dGVyID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbSA9IG1vbWVudCgpLnV0YygpLnNldChzZXR0ZXIsIGkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBtZXRob2QuY2FsbChtb21lbnQuX2xvY2FsZSwgbSwgZm9ybWF0IHx8ICcnKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChpbmRleCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldHRlcihpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZ2V0dGVyKGkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9JbnQoYXJndW1lbnRGb3JDb2VyY2lvbikge1xuICAgICAgICB2YXIgY29lcmNlZE51bWJlciA9ICthcmd1bWVudEZvckNvZXJjaW9uLFxuICAgICAgICAgICAgdmFsdWUgPSAwO1xuXG4gICAgICAgIGlmIChjb2VyY2VkTnVtYmVyICE9PSAwICYmIGlzRmluaXRlKGNvZXJjZWROdW1iZXIpKSB7XG4gICAgICAgICAgICBpZiAoY29lcmNlZE51bWJlciA+PSAwKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLmZsb29yKGNvZXJjZWROdW1iZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGguY2VpbChjb2VyY2VkTnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5Nb250aCh5ZWFyLCBtb250aCkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGggKyAxLCAwKSkuZ2V0VVRDRGF0ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdlZWtzSW5ZZWFyKHllYXIsIGRvdywgZG95KSB7XG4gICAgICAgIHJldHVybiB3ZWVrT2ZZZWFyKG1vbWVudChbeWVhciwgMTEsIDMxICsgZG93IC0gZG95XSksIGRvdywgZG95KS53ZWVrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheXNJblllYXIoeWVhcikge1xuICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih5ZWFyKSA/IDM2NiA6IDM2NTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0xlYXBZZWFyKHllYXIpIHtcbiAgICAgICAgcmV0dXJuICh5ZWFyICUgNCA9PT0gMCAmJiB5ZWFyICUgMTAwICE9PSAwKSB8fCB5ZWFyICUgNDAwID09PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNoZWNrT3ZlcmZsb3cobSkge1xuICAgICAgICB2YXIgb3ZlcmZsb3c7XG4gICAgICAgIGlmIChtLl9hICYmIG0uX3BmLm92ZXJmbG93ID09PSAtMikge1xuICAgICAgICAgICAgb3ZlcmZsb3cgPVxuICAgICAgICAgICAgICAgIG0uX2FbTU9OVEhdIDwgMCB8fCBtLl9hW01PTlRIXSA+IDExID8gTU9OVEggOlxuICAgICAgICAgICAgICAgIG0uX2FbREFURV0gPCAxIHx8IG0uX2FbREFURV0gPiBkYXlzSW5Nb250aChtLl9hW1lFQVJdLCBtLl9hW01PTlRIXSkgPyBEQVRFIDpcbiAgICAgICAgICAgICAgICBtLl9hW0hPVVJdIDwgMCB8fCBtLl9hW0hPVVJdID4gMjQgfHxcbiAgICAgICAgICAgICAgICAgICAgKG0uX2FbSE9VUl0gPT09IDI0ICYmIChtLl9hW01JTlVURV0gIT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLl9hW1NFQ09ORF0gIT09IDAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLl9hW01JTExJU0VDT05EXSAhPT0gMCkpID8gSE9VUiA6XG4gICAgICAgICAgICAgICAgbS5fYVtNSU5VVEVdIDwgMCB8fCBtLl9hW01JTlVURV0gPiA1OSA/IE1JTlVURSA6XG4gICAgICAgICAgICAgICAgbS5fYVtTRUNPTkRdIDwgMCB8fCBtLl9hW1NFQ09ORF0gPiA1OSA/IFNFQ09ORCA6XG4gICAgICAgICAgICAgICAgbS5fYVtNSUxMSVNFQ09ORF0gPCAwIHx8IG0uX2FbTUlMTElTRUNPTkRdID4gOTk5ID8gTUlMTElTRUNPTkQgOlxuICAgICAgICAgICAgICAgIC0xO1xuXG4gICAgICAgICAgICBpZiAobS5fcGYuX292ZXJmbG93RGF5T2ZZZWFyICYmIChvdmVyZmxvdyA8IFlFQVIgfHwgb3ZlcmZsb3cgPiBEQVRFKSkge1xuICAgICAgICAgICAgICAgIG92ZXJmbG93ID0gREFURTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbS5fcGYub3ZlcmZsb3cgPSBvdmVyZmxvdztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVmFsaWQobSkge1xuICAgICAgICBpZiAobS5faXNWYWxpZCA9PSBudWxsKSB7XG4gICAgICAgICAgICBtLl9pc1ZhbGlkID0gIWlzTmFOKG0uX2QuZ2V0VGltZSgpKSAmJlxuICAgICAgICAgICAgICAgIG0uX3BmLm92ZXJmbG93IDwgMCAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5lbXB0eSAmJlxuICAgICAgICAgICAgICAgICFtLl9wZi5pbnZhbGlkTW9udGggJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYubnVsbElucHV0ICYmXG4gICAgICAgICAgICAgICAgIW0uX3BmLmludmFsaWRGb3JtYXQgJiZcbiAgICAgICAgICAgICAgICAhbS5fcGYudXNlckludmFsaWRhdGVkO1xuXG4gICAgICAgICAgICBpZiAobS5fc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgbS5faXNWYWxpZCA9IG0uX2lzVmFsaWQgJiZcbiAgICAgICAgICAgICAgICAgICAgbS5fcGYuY2hhcnNMZWZ0T3ZlciA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICBtLl9wZi51bnVzZWRUb2tlbnMubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgICAgICAgICAgIG0uX3BmLmJpZ0hvdXIgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbS5faXNWYWxpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBub3JtYWxpemVMb2NhbGUoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkgPyBrZXkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKCdfJywgJy0nKSA6IGtleTtcbiAgICB9XG5cbiAgICAvLyBwaWNrIHRoZSBsb2NhbGUgZnJvbSB0aGUgYXJyYXlcbiAgICAvLyB0cnkgWydlbi1hdScsICdlbi1nYiddIGFzICdlbi1hdScsICdlbi1nYicsICdlbicsIGFzIGluIG1vdmUgdGhyb3VnaCB0aGUgbGlzdCB0cnlpbmcgZWFjaFxuICAgIC8vIHN1YnN0cmluZyBmcm9tIG1vc3Qgc3BlY2lmaWMgdG8gbGVhc3QsIGJ1dCBtb3ZlIHRvIHRoZSBuZXh0IGFycmF5IGl0ZW0gaWYgaXQncyBhIG1vcmUgc3BlY2lmaWMgdmFyaWFudCB0aGFuIHRoZSBjdXJyZW50IHJvb3RcbiAgICBmdW5jdGlvbiBjaG9vc2VMb2NhbGUobmFtZXMpIHtcbiAgICAgICAgdmFyIGkgPSAwLCBqLCBuZXh0LCBsb2NhbGUsIHNwbGl0O1xuXG4gICAgICAgIHdoaWxlIChpIDwgbmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBzcGxpdCA9IG5vcm1hbGl6ZUxvY2FsZShuYW1lc1tpXSkuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgIGogPSBzcGxpdC5sZW5ndGg7XG4gICAgICAgICAgICBuZXh0ID0gbm9ybWFsaXplTG9jYWxlKG5hbWVzW2kgKyAxXSk7XG4gICAgICAgICAgICBuZXh0ID0gbmV4dCA/IG5leHQuc3BsaXQoJy0nKSA6IG51bGw7XG4gICAgICAgICAgICB3aGlsZSAoaiA+IDApIHtcbiAgICAgICAgICAgICAgICBsb2NhbGUgPSBsb2FkTG9jYWxlKHNwbGl0LnNsaWNlKDAsIGopLmpvaW4oJy0nKSk7XG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYWxlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmV4dCAmJiBuZXh0Lmxlbmd0aCA+PSBqICYmIGNvbXBhcmVBcnJheXMoc3BsaXQsIG5leHQsIHRydWUpID49IGogLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhlIG5leHQgYXJyYXkgaXRlbSBpcyBiZXR0ZXIgdGhhbiBhIHNoYWxsb3dlciBzdWJzdHJpbmcgb2YgdGhpcyBvbmVcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGotLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2FkTG9jYWxlKG5hbWUpIHtcbiAgICAgICAgdmFyIG9sZExvY2FsZSA9IG51bGw7XG4gICAgICAgIGlmICghbG9jYWxlc1tuYW1lXSAmJiBoYXNNb2R1bGUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgb2xkTG9jYWxlID0gbW9tZW50LmxvY2FsZSgpO1xuICAgICAgICAgICAgICAgIHJlcXVpcmUoJy4vbG9jYWxlLycgKyBuYW1lKTtcbiAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIGRlZmluZUxvY2FsZSBjdXJyZW50bHkgYWxzbyBzZXRzIHRoZSBnbG9iYWwgbG9jYWxlLCB3ZSB3YW50IHRvIHVuZG8gdGhhdCBmb3IgbGF6eSBsb2FkZWQgbG9jYWxlc1xuICAgICAgICAgICAgICAgIG1vbWVudC5sb2NhbGUob2xkTG9jYWxlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsb2NhbGVzW25hbWVdO1xuICAgIH1cblxuICAgIC8vIFJldHVybiBhIG1vbWVudCBmcm9tIGlucHV0LCB0aGF0IGlzIGxvY2FsL3V0Yy91dGNPZmZzZXQgZXF1aXZhbGVudCB0b1xuICAgIC8vIG1vZGVsLlxuICAgIGZ1bmN0aW9uIG1ha2VBcyhpbnB1dCwgbW9kZWwpIHtcbiAgICAgICAgdmFyIHJlcywgZGlmZjtcbiAgICAgICAgaWYgKG1vZGVsLl9pc1VUQykge1xuICAgICAgICAgICAgcmVzID0gbW9kZWwuY2xvbmUoKTtcbiAgICAgICAgICAgIGRpZmYgPSAobW9tZW50LmlzTW9tZW50KGlucHV0KSB8fCBpc0RhdGUoaW5wdXQpID9cbiAgICAgICAgICAgICAgICAgICAgK2lucHV0IDogK21vbWVudChpbnB1dCkpIC0gKCtyZXMpO1xuICAgICAgICAgICAgLy8gVXNlIGxvdy1sZXZlbCBhcGksIGJlY2F1c2UgdGhpcyBmbiBpcyBsb3ctbGV2ZWwgYXBpLlxuICAgICAgICAgICAgcmVzLl9kLnNldFRpbWUoK3Jlcy5fZCArIGRpZmYpO1xuICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldChyZXMsIGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KGlucHV0KS5sb2NhbCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBMb2NhbGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGV4dGVuZChMb2NhbGUucHJvdG90eXBlLCB7XG5cbiAgICAgICAgc2V0IDogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgdmFyIHByb3AsIGk7XG4gICAgICAgICAgICBmb3IgKGkgaW4gY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgcHJvcCA9IGNvbmZpZ1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3AgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1snXycgKyBpXSA9IHByb3A7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTGVuaWVudCBvcmRpbmFsIHBhcnNpbmcgYWNjZXB0cyBqdXN0IGEgbnVtYmVyIGluIGFkZGl0aW9uIHRvXG4gICAgICAgICAgICAvLyBudW1iZXIgKyAocG9zc2libHkpIHN0dWZmIGNvbWluZyBmcm9tIF9vcmRpbmFsUGFyc2VMZW5pZW50LlxuICAgICAgICAgICAgdGhpcy5fb3JkaW5hbFBhcnNlTGVuaWVudCA9IG5ldyBSZWdFeHAodGhpcy5fb3JkaW5hbFBhcnNlLnNvdXJjZSArICd8JyArIC9cXGR7MSwyfS8uc291cmNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfbW9udGhzIDogJ0phbnVhcnlfRmVicnVhcnlfTWFyY2hfQXByaWxfTWF5X0p1bmVfSnVseV9BdWd1c3RfU2VwdGVtYmVyX09jdG9iZXJfTm92ZW1iZXJfRGVjZW1iZXInLnNwbGl0KCdfJyksXG4gICAgICAgIG1vbnRocyA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzW20ubW9udGgoKV07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX21vbnRoc1Nob3J0IDogJ0phbl9GZWJfTWFyX0Fwcl9NYXlfSnVuX0p1bF9BdWdfU2VwX09jdF9Ob3ZfRGVjJy5zcGxpdCgnXycpLFxuICAgICAgICBtb250aHNTaG9ydCA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbW9udGhzU2hvcnRbbS5tb250aCgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBtb250aHNQYXJzZSA6IGZ1bmN0aW9uIChtb250aE5hbWUsIGZvcm1hdCwgc3RyaWN0KSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl9tb250aHNQYXJzZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5fc2hvcnRNb250aHNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIG1ha2UgdGhlIHJlZ2V4IGlmIHdlIGRvbid0IGhhdmUgaXQgYWxyZWFkeVxuICAgICAgICAgICAgICAgIG1vbSA9IG1vbWVudC51dGMoWzIwMDAsIGldKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0ICYmICF0aGlzLl9sb25nTW9udGhzUGFyc2VbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRocyhtb20sICcnKS5yZXBsYWNlKCcuJywgJycpICsgJyQnLCAnaScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zaG9ydE1vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLm1vbnRoc1Nob3J0KG1vbSwgJycpLnJlcGxhY2UoJy4nLCAnJykgKyAnJCcsICdpJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3RyaWN0ICYmICF0aGlzLl9tb250aHNQYXJzZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICByZWdleCA9ICdeJyArIHRoaXMubW9udGhzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMubW9udGhzU2hvcnQobW9tLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21vbnRoc1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZm9ybWF0ID09PSAnTU1NTScgJiYgdGhpcy5fbG9uZ01vbnRoc1BhcnNlW2ldLnRlc3QobW9udGhOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBmb3JtYXQgPT09ICdNTU0nICYmIHRoaXMuX3Nob3J0TW9udGhzUGFyc2VbaV0udGVzdChtb250aE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCAmJiB0aGlzLl9tb250aHNQYXJzZVtpXS50ZXN0KG1vbnRoTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5cyA6ICdTdW5kYXlfTW9uZGF5X1R1ZXNkYXlfV2VkbmVzZGF5X1RodXJzZGF5X0ZyaWRheV9TYXR1cmRheScuc3BsaXQoJ18nKSxcbiAgICAgICAgd2Vla2RheXMgOiBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dlZWtkYXlzW20uZGF5KCldO1xuICAgICAgICB9LFxuXG4gICAgICAgIF93ZWVrZGF5c1Nob3J0IDogJ1N1bl9Nb25fVHVlX1dlZF9UaHVfRnJpX1NhdCcuc3BsaXQoJ18nKSxcbiAgICAgICAgd2Vla2RheXNTaG9ydCA6IGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd2Vla2RheXNTaG9ydFttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICBfd2Vla2RheXNNaW4gOiAnU3VfTW9fVHVfV2VfVGhfRnJfU2EnLnNwbGl0KCdfJyksXG4gICAgICAgIHdlZWtkYXlzTWluIDogZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrZGF5c01pblttLmRheSgpXTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrZGF5c1BhcnNlIDogZnVuY3Rpb24gKHdlZWtkYXlOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaSwgbW9tLCByZWdleDtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2Vla2RheXNQYXJzZSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFrZSB0aGUgcmVnZXggaWYgd2UgZG9uJ3QgaGF2ZSBpdCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWVrZGF5c1BhcnNlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vbSA9IG1vbWVudChbMjAwMCwgMV0pLmRheShpKTtcbiAgICAgICAgICAgICAgICAgICAgcmVnZXggPSAnXicgKyB0aGlzLndlZWtkYXlzKG1vbSwgJycpICsgJ3xeJyArIHRoaXMud2Vla2RheXNTaG9ydChtb20sICcnKSArICd8XicgKyB0aGlzLndlZWtkYXlzTWluKG1vbSwgJycpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93ZWVrZGF5c1BhcnNlW2ldID0gbmV3IFJlZ0V4cChyZWdleC5yZXBsYWNlKCcuJywgJycpLCAnaScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IHRoZSByZWdleFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl93ZWVrZGF5c1BhcnNlW2ldLnRlc3Qod2Vla2RheU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBfbG9uZ0RhdGVGb3JtYXQgOiB7XG4gICAgICAgICAgICBMVFMgOiAnaDptbTpzcyBBJyxcbiAgICAgICAgICAgIExUIDogJ2g6bW0gQScsXG4gICAgICAgICAgICBMIDogJ01NL0REL1lZWVknLFxuICAgICAgICAgICAgTEwgOiAnTU1NTSBELCBZWVlZJyxcbiAgICAgICAgICAgIExMTCA6ICdNTU1NIEQsIFlZWVkgTFQnLFxuICAgICAgICAgICAgTExMTCA6ICdkZGRkLCBNTU1NIEQsIFlZWVkgTFQnXG4gICAgICAgIH0sXG4gICAgICAgIGxvbmdEYXRlRm9ybWF0IDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX2xvbmdEYXRlRm9ybWF0W2tleV07XG4gICAgICAgICAgICBpZiAoIW91dHB1dCAmJiB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXkudG9VcHBlckNhc2UoKV0pIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXkudG9VcHBlckNhc2UoKV0ucmVwbGFjZSgvTU1NTXxNTXxERHxkZGRkL2csIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb25nRGF0ZUZvcm1hdFtrZXldID0gb3V0cHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgfSxcblxuICAgICAgICBpc1BNIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICAvLyBJRTggUXVpcmtzIE1vZGUgJiBJRTcgU3RhbmRhcmRzIE1vZGUgZG8gbm90IGFsbG93IGFjY2Vzc2luZyBzdHJpbmdzIGxpa2UgYXJyYXlzXG4gICAgICAgICAgICAvLyBVc2luZyBjaGFyQXQgc2hvdWxkIGJlIG1vcmUgY29tcGF0aWJsZS5cbiAgICAgICAgICAgIHJldHVybiAoKGlucHV0ICsgJycpLnRvTG93ZXJDYXNlKCkuY2hhckF0KDApID09PSAncCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9tZXJpZGllbVBhcnNlIDogL1thcF1cXC4/bT9cXC4/L2ksXG4gICAgICAgIG1lcmlkaWVtIDogZnVuY3Rpb24gKGhvdXJzLCBtaW51dGVzLCBpc0xvd2VyKSB7XG4gICAgICAgICAgICBpZiAoaG91cnMgPiAxMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc0xvd2VyID8gJ3BtJyA6ICdQTSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc0xvd2VyID8gJ2FtJyA6ICdBTSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cblxuICAgICAgICBfY2FsZW5kYXIgOiB7XG4gICAgICAgICAgICBzYW1lRGF5IDogJ1tUb2RheSBhdF0gTFQnLFxuICAgICAgICAgICAgbmV4dERheSA6ICdbVG9tb3Jyb3cgYXRdIExUJyxcbiAgICAgICAgICAgIG5leHRXZWVrIDogJ2RkZGQgW2F0XSBMVCcsXG4gICAgICAgICAgICBsYXN0RGF5IDogJ1tZZXN0ZXJkYXkgYXRdIExUJyxcbiAgICAgICAgICAgIGxhc3RXZWVrIDogJ1tMYXN0XSBkZGRkIFthdF0gTFQnLFxuICAgICAgICAgICAgc2FtZUVsc2UgOiAnTCdcbiAgICAgICAgfSxcbiAgICAgICAgY2FsZW5kYXIgOiBmdW5jdGlvbiAoa2V5LCBtb20sIG5vdykge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IHRoaXMuX2NhbGVuZGFyW2tleV07XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIG91dHB1dCA9PT0gJ2Z1bmN0aW9uJyA/IG91dHB1dC5hcHBseShtb20sIFtub3ddKSA6IG91dHB1dDtcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVsYXRpdmVUaW1lIDoge1xuICAgICAgICAgICAgZnV0dXJlIDogJ2luICVzJyxcbiAgICAgICAgICAgIHBhc3QgOiAnJXMgYWdvJyxcbiAgICAgICAgICAgIHMgOiAnYSBmZXcgc2Vjb25kcycsXG4gICAgICAgICAgICBtIDogJ2EgbWludXRlJyxcbiAgICAgICAgICAgIG1tIDogJyVkIG1pbnV0ZXMnLFxuICAgICAgICAgICAgaCA6ICdhbiBob3VyJyxcbiAgICAgICAgICAgIGhoIDogJyVkIGhvdXJzJyxcbiAgICAgICAgICAgIGQgOiAnYSBkYXknLFxuICAgICAgICAgICAgZGQgOiAnJWQgZGF5cycsXG4gICAgICAgICAgICBNIDogJ2EgbW9udGgnLFxuICAgICAgICAgICAgTU0gOiAnJWQgbW9udGhzJyxcbiAgICAgICAgICAgIHkgOiAnYSB5ZWFyJyxcbiAgICAgICAgICAgIHl5IDogJyVkIHllYXJzJ1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbGF0aXZlVGltZSA6IGZ1bmN0aW9uIChudW1iZXIsIHdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSB0aGlzLl9yZWxhdGl2ZVRpbWVbc3RyaW5nXTtcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIG91dHB1dCA9PT0gJ2Z1bmN0aW9uJykgP1xuICAgICAgICAgICAgICAgIG91dHB1dChudW1iZXIsIHdpdGhvdXRTdWZmaXgsIHN0cmluZywgaXNGdXR1cmUpIDpcbiAgICAgICAgICAgICAgICBvdXRwdXQucmVwbGFjZSgvJWQvaSwgbnVtYmVyKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXN0RnV0dXJlIDogZnVuY3Rpb24gKGRpZmYsIG91dHB1dCkge1xuICAgICAgICAgICAgdmFyIGZvcm1hdCA9IHRoaXMuX3JlbGF0aXZlVGltZVtkaWZmID4gMCA/ICdmdXR1cmUnIDogJ3Bhc3QnXTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgZm9ybWF0ID09PSAnZnVuY3Rpb24nID8gZm9ybWF0KG91dHB1dCkgOiBmb3JtYXQucmVwbGFjZSgvJXMvaSwgb3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBvcmRpbmFsIDogZnVuY3Rpb24gKG51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29yZGluYWwucmVwbGFjZSgnJWQnLCBudW1iZXIpO1xuICAgICAgICB9LFxuICAgICAgICBfb3JkaW5hbCA6ICclZCcsXG4gICAgICAgIF9vcmRpbmFsUGFyc2UgOiAvXFxkezEsMn0vLFxuXG4gICAgICAgIHByZXBhcnNlIDogZnVuY3Rpb24gKHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgfSxcblxuICAgICAgICBwb3N0Zm9ybWF0IDogZnVuY3Rpb24gKHN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrIDogZnVuY3Rpb24gKG1vbSkge1xuICAgICAgICAgICAgcmV0dXJuIHdlZWtPZlllYXIobW9tLCB0aGlzLl93ZWVrLmRvdywgdGhpcy5fd2Vlay5kb3kpLndlZWs7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3dlZWsgOiB7XG4gICAgICAgICAgICBkb3cgOiAwLCAvLyBTdW5kYXkgaXMgdGhlIGZpcnN0IGRheSBvZiB0aGUgd2Vlay5cbiAgICAgICAgICAgIGRveSA6IDYgIC8vIFRoZSB3ZWVrIHRoYXQgY29udGFpbnMgSmFuIDFzdCBpcyB0aGUgZmlyc3Qgd2VlayBvZiB0aGUgeWVhci5cbiAgICAgICAgfSxcblxuICAgICAgICBmaXJzdERheU9mV2VlayA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrLmRvdztcbiAgICAgICAgfSxcblxuICAgICAgICBmaXJzdERheU9mWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93ZWVrLmRveTtcbiAgICAgICAgfSxcblxuICAgICAgICBfaW52YWxpZERhdGU6ICdJbnZhbGlkIGRhdGUnLFxuICAgICAgICBpbnZhbGlkRGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ludmFsaWREYXRlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIEZvcm1hdHRpbmdcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUZvcm1hdHRpbmdUb2tlbnMoaW5wdXQpIHtcbiAgICAgICAgaWYgKGlucHV0Lm1hdGNoKC9cXFtbXFxzXFxTXS8pKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5wdXQucmVwbGFjZSgvXFxcXC9nLCAnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZUZvcm1hdEZ1bmN0aW9uKGZvcm1hdCkge1xuICAgICAgICB2YXIgYXJyYXkgPSBmb3JtYXQubWF0Y2goZm9ybWF0dGluZ1Rva2VucyksIGksIGxlbmd0aDtcblxuICAgICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGZvcm1hdFRva2VuRnVuY3Rpb25zW2FycmF5W2ldXSkge1xuICAgICAgICAgICAgICAgIGFycmF5W2ldID0gZm9ybWF0VG9rZW5GdW5jdGlvbnNbYXJyYXlbaV1dO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcnJheVtpXSA9IHJlbW92ZUZvcm1hdHRpbmdUb2tlbnMoYXJyYXlbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChtb20pIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSAnJztcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG91dHB1dCArPSBhcnJheVtpXSBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gYXJyYXlbaV0uY2FsbChtb20sIGZvcm1hdCkgOiBhcnJheVtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gZm9ybWF0IGRhdGUgdXNpbmcgbmF0aXZlIGRhdGUgb2JqZWN0XG4gICAgZnVuY3Rpb24gZm9ybWF0TW9tZW50KG0sIGZvcm1hdCkge1xuICAgICAgICBpZiAoIW0uaXNWYWxpZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbS5sb2NhbGVEYXRhKCkuaW52YWxpZERhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvcm1hdCA9IGV4cGFuZEZvcm1hdChmb3JtYXQsIG0ubG9jYWxlRGF0YSgpKTtcblxuICAgICAgICBpZiAoIWZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKSB7XG4gICAgICAgICAgICBmb3JtYXRGdW5jdGlvbnNbZm9ybWF0XSA9IG1ha2VGb3JtYXRGdW5jdGlvbihmb3JtYXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdEZ1bmN0aW9uc1tmb3JtYXRdKG0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cGFuZEZvcm1hdChmb3JtYXQsIGxvY2FsZSkge1xuICAgICAgICB2YXIgaSA9IDU7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gbG9jYWxlLmxvbmdEYXRlRm9ybWF0KGlucHV0KSB8fCBpbnB1dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy5sYXN0SW5kZXggPSAwO1xuICAgICAgICB3aGlsZSAoaSA+PSAwICYmIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy50ZXN0KGZvcm1hdCkpIHtcbiAgICAgICAgICAgIGZvcm1hdCA9IGZvcm1hdC5yZXBsYWNlKGxvY2FsRm9ybWF0dGluZ1Rva2VucywgcmVwbGFjZUxvbmdEYXRlRm9ybWF0VG9rZW5zKTtcbiAgICAgICAgICAgIGxvY2FsRm9ybWF0dGluZ1Rva2Vucy5sYXN0SW5kZXggPSAwO1xuICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgUGFyc2luZ1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gZ2V0IHRoZSByZWdleCB0byBmaW5kIHRoZSBuZXh0IHRva2VuXG4gICAgZnVuY3Rpb24gZ2V0UGFyc2VSZWdleEZvclRva2VuKHRva2VuLCBjb25maWcpIHtcbiAgICAgICAgdmFyIGEsIHN0cmljdCA9IGNvbmZpZy5fc3RyaWN0O1xuICAgICAgICBzd2l0Y2ggKHRva2VuKSB7XG4gICAgICAgIGNhc2UgJ1EnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVEaWdpdDtcbiAgICAgICAgY2FzZSAnRERERCc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRocmVlRGlnaXRzO1xuICAgICAgICBjYXNlICdZWVlZJzpcbiAgICAgICAgY2FzZSAnR0dHRyc6XG4gICAgICAgIGNhc2UgJ2dnZ2cnOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IHBhcnNlVG9rZW5Gb3VyRGlnaXRzIDogcGFyc2VUb2tlbk9uZVRvRm91ckRpZ2l0cztcbiAgICAgICAgY2FzZSAnWSc6XG4gICAgICAgIGNhc2UgJ0cnOlxuICAgICAgICBjYXNlICdnJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuU2lnbmVkTnVtYmVyO1xuICAgICAgICBjYXNlICdZWVlZWVknOlxuICAgICAgICBjYXNlICdZWVlZWSc6XG4gICAgICAgIGNhc2UgJ0dHR0dHJzpcbiAgICAgICAgY2FzZSAnZ2dnZ2cnOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmljdCA/IHBhcnNlVG9rZW5TaXhEaWdpdHMgOiBwYXJzZVRva2VuT25lVG9TaXhEaWdpdHM7XG4gICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT25lRGlnaXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ1NTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblR3b0RpZ2l0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgY2FzZSAnU1NTJzpcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlblRocmVlRGlnaXRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdEREQnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5PbmVUb1RocmVlRGlnaXRzO1xuICAgICAgICBjYXNlICdNTU0nOlxuICAgICAgICBjYXNlICdNTU1NJzpcbiAgICAgICAgY2FzZSAnZGQnOlxuICAgICAgICBjYXNlICdkZGQnOlxuICAgICAgICBjYXNlICdkZGRkJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuV29yZDtcbiAgICAgICAgY2FzZSAnYSc6XG4gICAgICAgIGNhc2UgJ0EnOlxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5fbG9jYWxlLl9tZXJpZGllbVBhcnNlO1xuICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuT2Zmc2V0TXM7XG4gICAgICAgIGNhc2UgJ1gnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UaW1lc3RhbXBNcztcbiAgICAgICAgY2FzZSAnWic6XG4gICAgICAgIGNhc2UgJ1paJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuVGltZXpvbmU7XG4gICAgICAgIGNhc2UgJ1QnOlxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5UO1xuICAgICAgICBjYXNlICdTU1NTJzpcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVRva2VuRGlnaXRzO1xuICAgICAgICBjYXNlICdNTSc6XG4gICAgICAgIGNhc2UgJ0REJzpcbiAgICAgICAgY2FzZSAnWVknOlxuICAgICAgICBjYXNlICdHRyc6XG4gICAgICAgIGNhc2UgJ2dnJzpcbiAgICAgICAgY2FzZSAnSEgnOlxuICAgICAgICBjYXNlICdoaCc6XG4gICAgICAgIGNhc2UgJ21tJzpcbiAgICAgICAgY2FzZSAnc3MnOlxuICAgICAgICBjYXNlICd3dyc6XG4gICAgICAgIGNhc2UgJ1dXJzpcbiAgICAgICAgICAgIHJldHVybiBzdHJpY3QgPyBwYXJzZVRva2VuVHdvRGlnaXRzIDogcGFyc2VUb2tlbk9uZU9yVHdvRGlnaXRzO1xuICAgICAgICBjYXNlICdNJzpcbiAgICAgICAgY2FzZSAnRCc6XG4gICAgICAgIGNhc2UgJ2QnOlxuICAgICAgICBjYXNlICdIJzpcbiAgICAgICAgY2FzZSAnaCc6XG4gICAgICAgIGNhc2UgJ20nOlxuICAgICAgICBjYXNlICdzJzpcbiAgICAgICAgY2FzZSAndyc6XG4gICAgICAgIGNhc2UgJ1cnOlxuICAgICAgICBjYXNlICdlJzpcbiAgICAgICAgY2FzZSAnRSc6XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VUb2tlbk9uZU9yVHdvRGlnaXRzO1xuICAgICAgICBjYXNlICdEbyc6XG4gICAgICAgICAgICByZXR1cm4gc3RyaWN0ID8gY29uZmlnLl9sb2NhbGUuX29yZGluYWxQYXJzZSA6IGNvbmZpZy5fbG9jYWxlLl9vcmRpbmFsUGFyc2VMZW5pZW50O1xuICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgIGEgPSBuZXcgUmVnRXhwKHJlZ2V4cEVzY2FwZSh1bmVzY2FwZUZvcm1hdCh0b2tlbi5yZXBsYWNlKCdcXFxcJywgJycpKSwgJ2knKSk7XG4gICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHV0Y09mZnNldEZyb21TdHJpbmcoc3RyaW5nKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZyB8fCAnJztcbiAgICAgICAgdmFyIHBvc3NpYmxlVHpNYXRjaGVzID0gKHN0cmluZy5tYXRjaChwYXJzZVRva2VuVGltZXpvbmUpIHx8IFtdKSxcbiAgICAgICAgICAgIHR6Q2h1bmsgPSBwb3NzaWJsZVR6TWF0Y2hlc1twb3NzaWJsZVR6TWF0Y2hlcy5sZW5ndGggLSAxXSB8fCBbXSxcbiAgICAgICAgICAgIHBhcnRzID0gKHR6Q2h1bmsgKyAnJykubWF0Y2gocGFyc2VUaW1lem9uZUNodW5rZXIpIHx8IFsnLScsIDAsIDBdLFxuICAgICAgICAgICAgbWludXRlcyA9ICsocGFydHNbMV0gKiA2MCkgKyB0b0ludChwYXJ0c1syXSk7XG5cbiAgICAgICAgcmV0dXJuIHBhcnRzWzBdID09PSAnKycgPyBtaW51dGVzIDogLW1pbnV0ZXM7XG4gICAgfVxuXG4gICAgLy8gZnVuY3Rpb24gdG8gY29udmVydCBzdHJpbmcgaW5wdXQgdG8gZGF0ZVxuICAgIGZ1bmN0aW9uIGFkZFRpbWVUb0FycmF5RnJvbVRva2VuKHRva2VuLCBpbnB1dCwgY29uZmlnKSB7XG4gICAgICAgIHZhciBhLCBkYXRlUGFydEFycmF5ID0gY29uZmlnLl9hO1xuXG4gICAgICAgIHN3aXRjaCAodG9rZW4pIHtcbiAgICAgICAgLy8gUVVBUlRFUlxuICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNT05USF0gPSAodG9JbnQoaW5wdXQpIC0gMSkgKiAzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIE1PTlRIXG4gICAgICAgIGNhc2UgJ00nIDogLy8gZmFsbCB0aHJvdWdoIHRvIE1NXG4gICAgICAgIGNhc2UgJ01NJyA6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTU9OVEhdID0gdG9JbnQoaW5wdXQpIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdNTU0nIDogLy8gZmFsbCB0aHJvdWdoIHRvIE1NTU1cbiAgICAgICAgY2FzZSAnTU1NTScgOlxuICAgICAgICAgICAgYSA9IGNvbmZpZy5fbG9jYWxlLm1vbnRoc1BhcnNlKGlucHV0LCB0b2tlbiwgY29uZmlnLl9zdHJpY3QpO1xuICAgICAgICAgICAgLy8gaWYgd2UgZGlkbid0IGZpbmQgYSBtb250aCBuYW1lLCBtYXJrIHRoZSBkYXRlIGFzIGludmFsaWQuXG4gICAgICAgICAgICBpZiAoYSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtNT05USF0gPSBhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3BmLmludmFsaWRNb250aCA9IGlucHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIERBWSBPRiBNT05USFxuICAgICAgICBjYXNlICdEJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBERFxuICAgICAgICBjYXNlICdERCcgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRlUGFydEFycmF5W0RBVEVdID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ0RvJyA6XG4gICAgICAgICAgICBpZiAoaW5wdXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbREFURV0gPSB0b0ludChwYXJzZUludChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5tYXRjaCgvXFxkezEsMn0vKVswXSwgMTApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBEQVkgT0YgWUVBUlxuICAgICAgICBjYXNlICdEREQnIDogLy8gZmFsbCB0aHJvdWdoIHRvIERERERcbiAgICAgICAgY2FzZSAnRERERCcgOlxuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX2RheU9mWWVhciA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFlFQVJcbiAgICAgICAgY2FzZSAnWVknIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbWUVBUl0gPSBtb21lbnQucGFyc2VUd29EaWdpdFllYXIoaW5wdXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1lZWVknIDpcbiAgICAgICAgY2FzZSAnWVlZWVknIDpcbiAgICAgICAgY2FzZSAnWVlZWVlZJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W1lFQVJdID0gdG9JbnQoaW5wdXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIEFNIC8gUE1cbiAgICAgICAgY2FzZSAnYScgOiAvLyBmYWxsIHRocm91Z2ggdG8gQVxuICAgICAgICBjYXNlICdBJyA6XG4gICAgICAgICAgICBjb25maWcuX21lcmlkaWVtID0gaW5wdXQ7XG4gICAgICAgICAgICAvLyBjb25maWcuX2lzUG0gPSBjb25maWcuX2xvY2FsZS5pc1BNKGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBIT1VSXG4gICAgICAgIGNhc2UgJ2gnIDogLy8gZmFsbCB0aHJvdWdoIHRvIGhoXG4gICAgICAgIGNhc2UgJ2hoJyA6XG4gICAgICAgICAgICBjb25maWcuX3BmLmJpZ0hvdXIgPSB0cnVlO1xuICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICBjYXNlICdIJyA6IC8vIGZhbGwgdGhyb3VnaCB0byBISFxuICAgICAgICBjYXNlICdISCcgOlxuICAgICAgICAgICAgZGF0ZVBhcnRBcnJheVtIT1VSXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNSU5VVEVcbiAgICAgICAgY2FzZSAnbScgOiAvLyBmYWxsIHRocm91Z2ggdG8gbW1cbiAgICAgICAgY2FzZSAnbW0nIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbTUlOVVRFXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBTRUNPTkRcbiAgICAgICAgY2FzZSAncycgOiAvLyBmYWxsIHRocm91Z2ggdG8gc3NcbiAgICAgICAgY2FzZSAnc3MnIDpcbiAgICAgICAgICAgIGRhdGVQYXJ0QXJyYXlbU0VDT05EXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBNSUxMSVNFQ09ORFxuICAgICAgICBjYXNlICdTJyA6XG4gICAgICAgIGNhc2UgJ1NTJyA6XG4gICAgICAgIGNhc2UgJ1NTUycgOlxuICAgICAgICBjYXNlICdTU1NTJyA6XG4gICAgICAgICAgICBkYXRlUGFydEFycmF5W01JTExJU0VDT05EXSA9IHRvSW50KCgnMC4nICsgaW5wdXQpICogMTAwMCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gVU5JWCBPRkZTRVQgKE1JTExJU0VDT05EUylcbiAgICAgICAgY2FzZSAneCc6XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZSh0b0ludChpbnB1dCkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFVOSVggVElNRVNUQU1QIFdJVEggTVNcbiAgICAgICAgY2FzZSAnWCc6XG4gICAgICAgICAgICBjb25maWcuX2QgPSBuZXcgRGF0ZShwYXJzZUZsb2F0KGlucHV0KSAqIDEwMDApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFRJTUVaT05FXG4gICAgICAgIGNhc2UgJ1onIDogLy8gZmFsbCB0aHJvdWdoIHRvIFpaXG4gICAgICAgIGNhc2UgJ1paJyA6XG4gICAgICAgICAgICBjb25maWcuX3VzZVVUQyA9IHRydWU7XG4gICAgICAgICAgICBjb25maWcuX3R6bSA9IHV0Y09mZnNldEZyb21TdHJpbmcoaW5wdXQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFdFRUtEQVkgLSBodW1hblxuICAgICAgICBjYXNlICdkZCc6XG4gICAgICAgIGNhc2UgJ2RkZCc6XG4gICAgICAgIGNhc2UgJ2RkZGQnOlxuICAgICAgICAgICAgYSA9IGNvbmZpZy5fbG9jYWxlLndlZWtkYXlzUGFyc2UoaW5wdXQpO1xuICAgICAgICAgICAgLy8gaWYgd2UgZGlkbid0IGdldCBhIHdlZWtkYXkgbmFtZSwgbWFyayB0aGUgZGF0ZSBhcyBpbnZhbGlkXG4gICAgICAgICAgICBpZiAoYSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl93ID0gY29uZmlnLl93IHx8IHt9O1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fd1snZCddID0gYTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkV2Vla2RheSA9IGlucHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIFdFRUssIFdFRUsgREFZIC0gbnVtZXJpY1xuICAgICAgICBjYXNlICd3JzpcbiAgICAgICAgY2FzZSAnd3cnOlxuICAgICAgICBjYXNlICdXJzpcbiAgICAgICAgY2FzZSAnV1cnOlxuICAgICAgICBjYXNlICdkJzpcbiAgICAgICAgY2FzZSAnZSc6XG4gICAgICAgIGNhc2UgJ0UnOlxuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbi5zdWJzdHIoMCwgMSk7XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgIGNhc2UgJ2dnZ2cnOlxuICAgICAgICBjYXNlICdHR0dHJzpcbiAgICAgICAgY2FzZSAnR0dHR0cnOlxuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbi5zdWJzdHIoMCwgMik7XG4gICAgICAgICAgICBpZiAoaW5wdXQpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3cgPSBjb25maWcuX3cgfHwge307XG4gICAgICAgICAgICAgICAgY29uZmlnLl93W3Rva2VuXSA9IHRvSW50KGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdnZyc6XG4gICAgICAgIGNhc2UgJ0dHJzpcbiAgICAgICAgICAgIGNvbmZpZy5fdyA9IGNvbmZpZy5fdyB8fCB7fTtcbiAgICAgICAgICAgIGNvbmZpZy5fd1t0b2tlbl0gPSBtb21lbnQucGFyc2VUd29EaWdpdFllYXIoaW5wdXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF5T2ZZZWFyRnJvbVdlZWtJbmZvKGNvbmZpZykge1xuICAgICAgICB2YXIgdywgd2Vla1llYXIsIHdlZWssIHdlZWtkYXksIGRvdywgZG95LCB0ZW1wO1xuXG4gICAgICAgIHcgPSBjb25maWcuX3c7XG4gICAgICAgIGlmICh3LkdHICE9IG51bGwgfHwgdy5XICE9IG51bGwgfHwgdy5FICE9IG51bGwpIHtcbiAgICAgICAgICAgIGRvdyA9IDE7XG4gICAgICAgICAgICBkb3kgPSA0O1xuXG4gICAgICAgICAgICAvLyBUT0RPOiBXZSBuZWVkIHRvIHRha2UgdGhlIGN1cnJlbnQgaXNvV2Vla1llYXIsIGJ1dCB0aGF0IGRlcGVuZHMgb25cbiAgICAgICAgICAgIC8vIGhvdyB3ZSBpbnRlcnByZXQgbm93IChsb2NhbCwgdXRjLCBmaXhlZCBvZmZzZXQpLiBTbyBjcmVhdGVcbiAgICAgICAgICAgIC8vIGEgbm93IHZlcnNpb24gb2YgY3VycmVudCBjb25maWcgKHRha2UgbG9jYWwvdXRjL29mZnNldCBmbGFncywgYW5kXG4gICAgICAgICAgICAvLyBjcmVhdGUgbm93KS5cbiAgICAgICAgICAgIHdlZWtZZWFyID0gZGZsKHcuR0csIGNvbmZpZy5fYVtZRUFSXSwgd2Vla09mWWVhcihtb21lbnQoKSwgMSwgNCkueWVhcik7XG4gICAgICAgICAgICB3ZWVrID0gZGZsKHcuVywgMSk7XG4gICAgICAgICAgICB3ZWVrZGF5ID0gZGZsKHcuRSwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb3cgPSBjb25maWcuX2xvY2FsZS5fd2Vlay5kb3c7XG4gICAgICAgICAgICBkb3kgPSBjb25maWcuX2xvY2FsZS5fd2Vlay5kb3k7XG5cbiAgICAgICAgICAgIHdlZWtZZWFyID0gZGZsKHcuZ2csIGNvbmZpZy5fYVtZRUFSXSwgd2Vla09mWWVhcihtb21lbnQoKSwgZG93LCBkb3kpLnllYXIpO1xuICAgICAgICAgICAgd2VlayA9IGRmbCh3LncsIDEpO1xuXG4gICAgICAgICAgICBpZiAody5kICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyB3ZWVrZGF5IC0tIGxvdyBkYXkgbnVtYmVycyBhcmUgY29uc2lkZXJlZCBuZXh0IHdlZWtcbiAgICAgICAgICAgICAgICB3ZWVrZGF5ID0gdy5kO1xuICAgICAgICAgICAgICAgIGlmICh3ZWVrZGF5IDwgZG93KSB7XG4gICAgICAgICAgICAgICAgICAgICsrd2VlaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHcuZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gbG9jYWwgd2Vla2RheSAtLSBjb3VudGluZyBzdGFydHMgZnJvbSBiZWdpbmluZyBvZiB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IHcuZSArIGRvdztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZGVmYXVsdCB0byBiZWdpbmluZyBvZiB3ZWVrXG4gICAgICAgICAgICAgICAgd2Vla2RheSA9IGRvdztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0ZW1wID0gZGF5T2ZZZWFyRnJvbVdlZWtzKHdlZWtZZWFyLCB3ZWVrLCB3ZWVrZGF5LCBkb3ksIGRvdyk7XG5cbiAgICAgICAgY29uZmlnLl9hW1lFQVJdID0gdGVtcC55ZWFyO1xuICAgICAgICBjb25maWcuX2RheU9mWWVhciA9IHRlbXAuZGF5T2ZZZWFyO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnQgYW4gYXJyYXkgdG8gYSBkYXRlLlxuICAgIC8vIHRoZSBhcnJheSBzaG91bGQgbWlycm9yIHRoZSBwYXJhbWV0ZXJzIGJlbG93XG4gICAgLy8gbm90ZTogYWxsIHZhbHVlcyBwYXN0IHRoZSB5ZWFyIGFyZSBvcHRpb25hbCBhbmQgd2lsbCBkZWZhdWx0IHRvIHRoZSBsb3dlc3QgcG9zc2libGUgdmFsdWUuXG4gICAgLy8gW3llYXIsIG1vbnRoLCBkYXkgLCBob3VyLCBtaW51dGUsIHNlY29uZCwgbWlsbGlzZWNvbmRdXG4gICAgZnVuY3Rpb24gZGF0ZUZyb21Db25maWcoY29uZmlnKSB7XG4gICAgICAgIHZhciBpLCBkYXRlLCBpbnB1dCA9IFtdLCBjdXJyZW50RGF0ZSwgeWVhclRvVXNlO1xuXG4gICAgICAgIGlmIChjb25maWcuX2QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnREYXRlID0gY3VycmVudERhdGVBcnJheShjb25maWcpO1xuXG4gICAgICAgIC8vY29tcHV0ZSBkYXkgb2YgdGhlIHllYXIgZnJvbSB3ZWVrcyBhbmQgd2Vla2RheXNcbiAgICAgICAgaWYgKGNvbmZpZy5fdyAmJiBjb25maWcuX2FbREFURV0gPT0gbnVsbCAmJiBjb25maWcuX2FbTU9OVEhdID09IG51bGwpIHtcbiAgICAgICAgICAgIGRheU9mWWVhckZyb21XZWVrSW5mbyhjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9pZiB0aGUgZGF5IG9mIHRoZSB5ZWFyIGlzIHNldCwgZmlndXJlIG91dCB3aGF0IGl0IGlzXG4gICAgICAgIGlmIChjb25maWcuX2RheU9mWWVhcikge1xuICAgICAgICAgICAgeWVhclRvVXNlID0gZGZsKGNvbmZpZy5fYVtZRUFSXSwgY3VycmVudERhdGVbWUVBUl0pO1xuXG4gICAgICAgICAgICBpZiAoY29uZmlnLl9kYXlPZlllYXIgPiBkYXlzSW5ZZWFyKHllYXJUb1VzZSkpIHtcbiAgICAgICAgICAgICAgICBjb25maWcuX3BmLl9vdmVyZmxvd0RheU9mWWVhciA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRhdGUgPSBtYWtlVVRDRGF0ZSh5ZWFyVG9Vc2UsIDAsIGNvbmZpZy5fZGF5T2ZZZWFyKTtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtNT05USF0gPSBkYXRlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICBjb25maWcuX2FbREFURV0gPSBkYXRlLmdldFVUQ0RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gY3VycmVudCBkYXRlLlxuICAgICAgICAvLyAqIGlmIG5vIHllYXIsIG1vbnRoLCBkYXkgb2YgbW9udGggYXJlIGdpdmVuLCBkZWZhdWx0IHRvIHRvZGF5XG4gICAgICAgIC8vICogaWYgZGF5IG9mIG1vbnRoIGlzIGdpdmVuLCBkZWZhdWx0IG1vbnRoIGFuZCB5ZWFyXG4gICAgICAgIC8vICogaWYgbW9udGggaXMgZ2l2ZW4sIGRlZmF1bHQgb25seSB5ZWFyXG4gICAgICAgIC8vICogaWYgeWVhciBpcyBnaXZlbiwgZG9uJ3QgZGVmYXVsdCBhbnl0aGluZ1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMyAmJiBjb25maWcuX2FbaV0gPT0gbnVsbDsgKytpKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbaV0gPSBpbnB1dFtpXSA9IGN1cnJlbnREYXRlW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gWmVybyBvdXQgd2hhdGV2ZXIgd2FzIG5vdCBkZWZhdWx0ZWQsIGluY2x1ZGluZyB0aW1lXG4gICAgICAgIGZvciAoOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICBjb25maWcuX2FbaV0gPSBpbnB1dFtpXSA9IChjb25maWcuX2FbaV0gPT0gbnVsbCkgPyAoaSA9PT0gMiA/IDEgOiAwKSA6IGNvbmZpZy5fYVtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciAyNDowMDowMC4wMDBcbiAgICAgICAgaWYgKGNvbmZpZy5fYVtIT1VSXSA9PT0gMjQgJiZcbiAgICAgICAgICAgICAgICBjb25maWcuX2FbTUlOVVRFXSA9PT0gMCAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5fYVtTRUNPTkRdID09PSAwICYmXG4gICAgICAgICAgICAgICAgY29uZmlnLl9hW01JTExJU0VDT05EXSA9PT0gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9uZXh0RGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbmZpZy5fYVtIT1VSXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcuX2QgPSAoY29uZmlnLl91c2VVVEMgPyBtYWtlVVRDRGF0ZSA6IG1ha2VEYXRlKS5hcHBseShudWxsLCBpbnB1dCk7XG4gICAgICAgIC8vIEFwcGx5IHRpbWV6b25lIG9mZnNldCBmcm9tIGlucHV0LiBUaGUgYWN0dWFsIHV0Y09mZnNldCBjYW4gYmUgY2hhbmdlZFxuICAgICAgICAvLyB3aXRoIHBhcnNlWm9uZS5cbiAgICAgICAgaWYgKGNvbmZpZy5fdHptICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZC5zZXRVVENNaW51dGVzKGNvbmZpZy5fZC5nZXRVVENNaW51dGVzKCkgLSBjb25maWcuX3R6bSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLl9uZXh0RGF5KSB7XG4gICAgICAgICAgICBjb25maWcuX2FbSE9VUl0gPSAyNDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRhdGVGcm9tT2JqZWN0KGNvbmZpZykge1xuICAgICAgICB2YXIgbm9ybWFsaXplZElucHV0O1xuXG4gICAgICAgIGlmIChjb25maWcuX2QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vcm1hbGl6ZWRJbnB1dCA9IG5vcm1hbGl6ZU9iamVjdFVuaXRzKGNvbmZpZy5faSk7XG4gICAgICAgIGNvbmZpZy5fYSA9IFtcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC55ZWFyLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0Lm1vbnRoLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0LmRheSB8fCBub3JtYWxpemVkSW5wdXQuZGF0ZSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5ob3VyLFxuICAgICAgICAgICAgbm9ybWFsaXplZElucHV0Lm1pbnV0ZSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRJbnB1dC5zZWNvbmQsXG4gICAgICAgICAgICBub3JtYWxpemVkSW5wdXQubWlsbGlzZWNvbmRcbiAgICAgICAgXTtcblxuICAgICAgICBkYXRlRnJvbUNvbmZpZyhjb25maWcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGN1cnJlbnREYXRlQXJyYXkoY29uZmlnKSB7XG4gICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBpZiAoY29uZmlnLl91c2VVVEMpIHtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgbm93LmdldFVUQ0Z1bGxZZWFyKCksXG4gICAgICAgICAgICAgICAgbm93LmdldFVUQ01vbnRoKCksXG4gICAgICAgICAgICAgICAgbm93LmdldFVUQ0RhdGUoKVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbbm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpLCBub3cuZ2V0RGF0ZSgpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBzdHJpbmcgYW5kIGZvcm1hdCBzdHJpbmdcbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKSB7XG4gICAgICAgIGlmIChjb25maWcuX2YgPT09IG1vbWVudC5JU09fODYwMSkge1xuICAgICAgICAgICAgcGFyc2VJU08oY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbmZpZy5fYSA9IFtdO1xuICAgICAgICBjb25maWcuX3BmLmVtcHR5ID0gdHJ1ZTtcblxuICAgICAgICAvLyBUaGlzIGFycmF5IGlzIHVzZWQgdG8gbWFrZSBhIERhdGUsIGVpdGhlciB3aXRoIGBuZXcgRGF0ZWAgb3IgYERhdGUuVVRDYFxuICAgICAgICB2YXIgc3RyaW5nID0gJycgKyBjb25maWcuX2ksXG4gICAgICAgICAgICBpLCBwYXJzZWRJbnB1dCwgdG9rZW5zLCB0b2tlbiwgc2tpcHBlZCxcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG4gICAgICAgICAgICB0b3RhbFBhcnNlZElucHV0TGVuZ3RoID0gMDtcblxuICAgICAgICB0b2tlbnMgPSBleHBhbmRGb3JtYXQoY29uZmlnLl9mLCBjb25maWcuX2xvY2FsZSkubWF0Y2goZm9ybWF0dGluZ1Rva2VucykgfHwgW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbnNbaV07XG4gICAgICAgICAgICBwYXJzZWRJbnB1dCA9IChzdHJpbmcubWF0Y2goZ2V0UGFyc2VSZWdleEZvclRva2VuKHRva2VuLCBjb25maWcpKSB8fCBbXSlbMF07XG4gICAgICAgICAgICBpZiAocGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBza2lwcGVkID0gc3RyaW5nLnN1YnN0cigwLCBzdHJpbmcuaW5kZXhPZihwYXJzZWRJbnB1dCkpO1xuICAgICAgICAgICAgICAgIGlmIChza2lwcGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRJbnB1dC5wdXNoKHNraXBwZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdHJpbmcgPSBzdHJpbmcuc2xpY2Uoc3RyaW5nLmluZGV4T2YocGFyc2VkSW5wdXQpICsgcGFyc2VkSW5wdXQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB0b3RhbFBhcnNlZElucHV0TGVuZ3RoICs9IHBhcnNlZElucHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGRvbid0IHBhcnNlIGlmIGl0J3Mgbm90IGEga25vd24gdG9rZW5cbiAgICAgICAgICAgIGlmIChmb3JtYXRUb2tlbkZ1bmN0aW9uc1t0b2tlbl0pIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VkSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9wZi5lbXB0eSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLl9wZi51bnVzZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFkZFRpbWVUb0FycmF5RnJvbVRva2VuKHRva2VuLCBwYXJzZWRJbnB1dCwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNvbmZpZy5fc3RyaWN0ICYmICFwYXJzZWRJbnB1dCkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIHJlbWFpbmluZyB1bnBhcnNlZCBpbnB1dCBsZW5ndGggdG8gdGhlIHN0cmluZ1xuICAgICAgICBjb25maWcuX3BmLmNoYXJzTGVmdE92ZXIgPSBzdHJpbmdMZW5ndGggLSB0b3RhbFBhcnNlZElucHV0TGVuZ3RoO1xuICAgICAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbmZpZy5fcGYudW51c2VkSW5wdXQucHVzaChzdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2xlYXIgXzEyaCBmbGFnIGlmIGhvdXIgaXMgPD0gMTJcbiAgICAgICAgaWYgKGNvbmZpZy5fcGYuYmlnSG91ciA9PT0gdHJ1ZSAmJiBjb25maWcuX2FbSE9VUl0gPD0gMTIpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fcGYuYmlnSG91ciA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBoYW5kbGUgbWVyaWRpZW1cbiAgICAgICAgY29uZmlnLl9hW0hPVVJdID0gbWVyaWRpZW1GaXhXcmFwKGNvbmZpZy5fbG9jYWxlLCBjb25maWcuX2FbSE9VUl0sXG4gICAgICAgICAgICAgICAgY29uZmlnLl9tZXJpZGllbSk7XG4gICAgICAgIGRhdGVGcm9tQ29uZmlnKGNvbmZpZyk7XG4gICAgICAgIGNoZWNrT3ZlcmZsb3coY29uZmlnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bmVzY2FwZUZvcm1hdChzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1xcXFwoXFxbKXxcXFxcKFxcXSl8XFxbKFteXFxdXFxbXSopXFxdfFxcXFwoLikvZywgZnVuY3Rpb24gKG1hdGNoZWQsIHAxLCBwMiwgcDMsIHA0KSB7XG4gICAgICAgICAgICByZXR1cm4gcDEgfHwgcDIgfHwgcDMgfHwgcDQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENvZGUgZnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1NjE0OTMvaXMtdGhlcmUtYS1yZWdleHAtZXNjYXBlLWZ1bmN0aW9uLWluLWphdmFzY3JpcHRcbiAgICBmdW5jdGlvbiByZWdleHBFc2NhcGUocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcbiAgICB9XG5cbiAgICAvLyBkYXRlIGZyb20gc3RyaW5nIGFuZCBhcnJheSBvZiBmb3JtYXQgc3RyaW5nc1xuICAgIGZ1bmN0aW9uIG1ha2VEYXRlRnJvbVN0cmluZ0FuZEFycmF5KGNvbmZpZykge1xuICAgICAgICB2YXIgdGVtcENvbmZpZyxcbiAgICAgICAgICAgIGJlc3RNb21lbnQsXG5cbiAgICAgICAgICAgIHNjb3JlVG9CZWF0LFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZTtcblxuICAgICAgICBpZiAoY29uZmlnLl9mLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uZmlnLl9wZi5pbnZhbGlkRm9ybWF0ID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKE5hTik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29uZmlnLl9mLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjdXJyZW50U2NvcmUgPSAwO1xuICAgICAgICAgICAgdGVtcENvbmZpZyA9IGNvcHlDb25maWcoe30sIGNvbmZpZyk7XG4gICAgICAgICAgICBpZiAoY29uZmlnLl91c2VVVEMgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRlbXBDb25maWcuX3VzZVVUQyA9IGNvbmZpZy5fdXNlVVRDO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGVtcENvbmZpZy5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG4gICAgICAgICAgICB0ZW1wQ29uZmlnLl9mID0gY29uZmlnLl9mW2ldO1xuICAgICAgICAgICAgbWFrZURhdGVGcm9tU3RyaW5nQW5kRm9ybWF0KHRlbXBDb25maWcpO1xuXG4gICAgICAgICAgICBpZiAoIWlzVmFsaWQodGVtcENvbmZpZykpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYW55IGlucHV0IHRoYXQgd2FzIG5vdCBwYXJzZWQgYWRkIGEgcGVuYWx0eSBmb3IgdGhhdCBmb3JtYXRcbiAgICAgICAgICAgIGN1cnJlbnRTY29yZSArPSB0ZW1wQ29uZmlnLl9wZi5jaGFyc0xlZnRPdmVyO1xuXG4gICAgICAgICAgICAvL29yIHRva2Vuc1xuICAgICAgICAgICAgY3VycmVudFNjb3JlICs9IHRlbXBDb25maWcuX3BmLnVudXNlZFRva2Vucy5sZW5ndGggKiAxMDtcblxuICAgICAgICAgICAgdGVtcENvbmZpZy5fcGYuc2NvcmUgPSBjdXJyZW50U2NvcmU7XG5cbiAgICAgICAgICAgIGlmIChzY29yZVRvQmVhdCA9PSBudWxsIHx8IGN1cnJlbnRTY29yZSA8IHNjb3JlVG9CZWF0KSB7XG4gICAgICAgICAgICAgICAgc2NvcmVUb0JlYXQgPSBjdXJyZW50U2NvcmU7XG4gICAgICAgICAgICAgICAgYmVzdE1vbWVudCA9IHRlbXBDb25maWc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRlbmQoY29uZmlnLCBiZXN0TW9tZW50IHx8IHRlbXBDb25maWcpO1xuICAgIH1cblxuICAgIC8vIGRhdGUgZnJvbSBpc28gZm9ybWF0XG4gICAgZnVuY3Rpb24gcGFyc2VJU08oY29uZmlnKSB7XG4gICAgICAgIHZhciBpLCBsLFxuICAgICAgICAgICAgc3RyaW5nID0gY29uZmlnLl9pLFxuICAgICAgICAgICAgbWF0Y2ggPSBpc29SZWdleC5leGVjKHN0cmluZyk7XG5cbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBjb25maWcuX3BmLmlzbyA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXNvRGF0ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzb0RhdGVzW2ldWzFdLmV4ZWMoc3RyaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaFs1XSBzaG91bGQgYmUgJ1QnIG9yIHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICBjb25maWcuX2YgPSBpc29EYXRlc1tpXVswXSArIChtYXRjaFs2XSB8fCAnICcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0gaXNvVGltZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzb1RpbWVzW2ldWzFdLmV4ZWMoc3RyaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuX2YgKz0gaXNvVGltZXNbaV1bMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdHJpbmcubWF0Y2gocGFyc2VUb2tlblRpbWV6b25lKSkge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5fZiArPSAnWic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbmZpZy5faXNWYWxpZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGF0ZSBmcm9tIGlzbyBmb3JtYXQgb3IgZmFsbGJhY2tcbiAgICBmdW5jdGlvbiBtYWtlRGF0ZUZyb21TdHJpbmcoY29uZmlnKSB7XG4gICAgICAgIHBhcnNlSVNPKGNvbmZpZyk7XG4gICAgICAgIGlmIChjb25maWcuX2lzVmFsaWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkZWxldGUgY29uZmlnLl9pc1ZhbGlkO1xuICAgICAgICAgICAgbW9tZW50LmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrKGNvbmZpZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXAoYXJyLCBmbikge1xuICAgICAgICB2YXIgcmVzID0gW10sIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKGZuKGFycltpXSwgaSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZURhdGVGcm9tSW5wdXQoY29uZmlnKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IGNvbmZpZy5faSwgbWF0Y2hlZDtcbiAgICAgICAgaWYgKGlucHV0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEYXRlKGlucHV0KSkge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoK2lucHV0KTtcbiAgICAgICAgfSBlbHNlIGlmICgobWF0Y2hlZCA9IGFzcE5ldEpzb25SZWdleC5leGVjKGlucHV0KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbmZpZy5fZCA9IG5ldyBEYXRlKCttYXRjaGVkWzFdKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmcoY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgICAgICAgY29uZmlnLl9hID0gbWFwKGlucHV0LnNsaWNlKDApLCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KG9iaiwgMTApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkYXRlRnJvbUNvbmZpZyhjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZihpbnB1dCkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBkYXRlRnJvbU9iamVjdChjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZihpbnB1dCkgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAvLyBmcm9tIG1pbGxpc2Vjb25kc1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoaW5wdXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbW9tZW50LmNyZWF0ZUZyb21JbnB1dEZhbGxiYWNrKGNvbmZpZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWtlRGF0ZSh5LCBtLCBkLCBoLCBNLCBzLCBtcykge1xuICAgICAgICAvL2Nhbid0IGp1c3QgYXBwbHkoKSB0byBjcmVhdGUgYSBkYXRlOlxuICAgICAgICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTgxMzQ4L2luc3RhbnRpYXRpbmctYS1qYXZhc2NyaXB0LW9iamVjdC1ieS1jYWxsaW5nLXByb3RvdHlwZS1jb25zdHJ1Y3Rvci1hcHBseVxuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHksIG0sIGQsIGgsIE0sIHMsIG1zKTtcblxuICAgICAgICAvL3RoZSBkYXRlIGNvbnN0cnVjdG9yIGRvZXNuJ3QgYWNjZXB0IHllYXJzIDwgMTk3MFxuICAgICAgICBpZiAoeSA8IDE5NzApIHtcbiAgICAgICAgICAgIGRhdGUuc2V0RnVsbFllYXIoeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFrZVVUQ0RhdGUoeSkge1xuICAgICAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xuICAgICAgICBpZiAoeSA8IDE5NzApIHtcbiAgICAgICAgICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VXZWVrZGF5KGlucHV0LCBsb2NhbGUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmICghaXNOYU4oaW5wdXQpKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBwYXJzZUludChpbnB1dCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5wdXQgPSBsb2NhbGUud2Vla2RheXNQYXJzZShpbnB1dCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnB1dDtcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFJlbGF0aXZlIFRpbWVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIC8vIGhlbHBlciBmdW5jdGlvbiBmb3IgbW9tZW50LmZuLmZyb20sIG1vbWVudC5mbi5mcm9tTm93LCBhbmQgbW9tZW50LmR1cmF0aW9uLmZuLmh1bWFuaXplXG4gICAgZnVuY3Rpb24gc3Vic3RpdHV0ZVRpbWVBZ28oc3RyaW5nLCBudW1iZXIsIHdpdGhvdXRTdWZmaXgsIGlzRnV0dXJlLCBsb2NhbGUpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsZS5yZWxhdGl2ZVRpbWUobnVtYmVyIHx8IDEsICEhd2l0aG91dFN1ZmZpeCwgc3RyaW5nLCBpc0Z1dHVyZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVsYXRpdmVUaW1lKHBvc05lZ0R1cmF0aW9uLCB3aXRob3V0U3VmZml4LCBsb2NhbGUpIHtcbiAgICAgICAgdmFyIGR1cmF0aW9uID0gbW9tZW50LmR1cmF0aW9uKHBvc05lZ0R1cmF0aW9uKS5hYnMoKSxcbiAgICAgICAgICAgIHNlY29uZHMgPSByb3VuZChkdXJhdGlvbi5hcygncycpKSxcbiAgICAgICAgICAgIG1pbnV0ZXMgPSByb3VuZChkdXJhdGlvbi5hcygnbScpKSxcbiAgICAgICAgICAgIGhvdXJzID0gcm91bmQoZHVyYXRpb24uYXMoJ2gnKSksXG4gICAgICAgICAgICBkYXlzID0gcm91bmQoZHVyYXRpb24uYXMoJ2QnKSksXG4gICAgICAgICAgICBtb250aHMgPSByb3VuZChkdXJhdGlvbi5hcygnTScpKSxcbiAgICAgICAgICAgIHllYXJzID0gcm91bmQoZHVyYXRpb24uYXMoJ3knKSksXG5cbiAgICAgICAgICAgIGFyZ3MgPSBzZWNvbmRzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5zICYmIFsncycsIHNlY29uZHNdIHx8XG4gICAgICAgICAgICAgICAgbWludXRlcyA9PT0gMSAmJiBbJ20nXSB8fFxuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLm0gJiYgWydtbScsIG1pbnV0ZXNdIHx8XG4gICAgICAgICAgICAgICAgaG91cnMgPT09IDEgJiYgWydoJ10gfHxcbiAgICAgICAgICAgICAgICBob3VycyA8IHJlbGF0aXZlVGltZVRocmVzaG9sZHMuaCAmJiBbJ2hoJywgaG91cnNdIHx8XG4gICAgICAgICAgICAgICAgZGF5cyA9PT0gMSAmJiBbJ2QnXSB8fFxuICAgICAgICAgICAgICAgIGRheXMgPCByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzLmQgJiYgWydkZCcsIGRheXNdIHx8XG4gICAgICAgICAgICAgICAgbW9udGhzID09PSAxICYmIFsnTSddIHx8XG4gICAgICAgICAgICAgICAgbW9udGhzIDwgcmVsYXRpdmVUaW1lVGhyZXNob2xkcy5NICYmIFsnTU0nLCBtb250aHNdIHx8XG4gICAgICAgICAgICAgICAgeWVhcnMgPT09IDEgJiYgWyd5J10gfHwgWyd5eScsIHllYXJzXTtcblxuICAgICAgICBhcmdzWzJdID0gd2l0aG91dFN1ZmZpeDtcbiAgICAgICAgYXJnc1szXSA9ICtwb3NOZWdEdXJhdGlvbiA+IDA7XG4gICAgICAgIGFyZ3NbNF0gPSBsb2NhbGU7XG4gICAgICAgIHJldHVybiBzdWJzdGl0dXRlVGltZUFnby5hcHBseSh7fSwgYXJncyk7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFdlZWsgb2YgWWVhclxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gZmlyc3REYXlPZldlZWsgICAgICAgMCA9IHN1biwgNiA9IHNhdFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBkYXkgb2YgdGhlIHdlZWsgdGhhdCBzdGFydHMgdGhlIHdlZWtcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAodXN1YWxseSBzdW5kYXkgb3IgbW9uZGF5KVxuICAgIC8vIGZpcnN0RGF5T2ZXZWVrT2ZZZWFyIDAgPSBzdW4sIDYgPSBzYXRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICB0aGUgZmlyc3Qgd2VlayBpcyB0aGUgd2VlayB0aGF0IGNvbnRhaW5zIHRoZSBmaXJzdFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIG9mIHRoaXMgZGF5IG9mIHRoZSB3ZWVrXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgKGVnLiBJU08gd2Vla3MgdXNlIHRodXJzZGF5ICg0KSlcbiAgICBmdW5jdGlvbiB3ZWVrT2ZZZWFyKG1vbSwgZmlyc3REYXlPZldlZWssIGZpcnN0RGF5T2ZXZWVrT2ZZZWFyKSB7XG4gICAgICAgIHZhciBlbmQgPSBmaXJzdERheU9mV2Vla09mWWVhciAtIGZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgZGF5c1RvRGF5T2ZXZWVrID0gZmlyc3REYXlPZldlZWtPZlllYXIgLSBtb20uZGF5KCksXG4gICAgICAgICAgICBhZGp1c3RlZE1vbWVudDtcblxuXG4gICAgICAgIGlmIChkYXlzVG9EYXlPZldlZWsgPiBlbmQpIHtcbiAgICAgICAgICAgIGRheXNUb0RheU9mV2VlayAtPSA3O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRheXNUb0RheU9mV2VlayA8IGVuZCAtIDcpIHtcbiAgICAgICAgICAgIGRheXNUb0RheU9mV2VlayArPSA3O1xuICAgICAgICB9XG5cbiAgICAgICAgYWRqdXN0ZWRNb21lbnQgPSBtb21lbnQobW9tKS5hZGQoZGF5c1RvRGF5T2ZXZWVrLCAnZCcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgd2VlazogTWF0aC5jZWlsKGFkanVzdGVkTW9tZW50LmRheU9mWWVhcigpIC8gNyksXG4gICAgICAgICAgICB5ZWFyOiBhZGp1c3RlZE1vbWVudC55ZWFyKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvL2h0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSVNPX3dlZWtfZGF0ZSNDYWxjdWxhdGluZ19hX2RhdGVfZ2l2ZW5fdGhlX3llYXIuMkNfd2Vla19udW1iZXJfYW5kX3dlZWtkYXlcbiAgICBmdW5jdGlvbiBkYXlPZlllYXJGcm9tV2Vla3MoeWVhciwgd2Vlaywgd2Vla2RheSwgZmlyc3REYXlPZldlZWtPZlllYXIsIGZpcnN0RGF5T2ZXZWVrKSB7XG4gICAgICAgIHZhciBkID0gbWFrZVVUQ0RhdGUoeWVhciwgMCwgMSkuZ2V0VVRDRGF5KCksIGRheXNUb0FkZCwgZGF5T2ZZZWFyO1xuXG4gICAgICAgIGQgPSBkID09PSAwID8gNyA6IGQ7XG4gICAgICAgIHdlZWtkYXkgPSB3ZWVrZGF5ICE9IG51bGwgPyB3ZWVrZGF5IDogZmlyc3REYXlPZldlZWs7XG4gICAgICAgIGRheXNUb0FkZCA9IGZpcnN0RGF5T2ZXZWVrIC0gZCArIChkID4gZmlyc3REYXlPZldlZWtPZlllYXIgPyA3IDogMCkgLSAoZCA8IGZpcnN0RGF5T2ZXZWVrID8gNyA6IDApO1xuICAgICAgICBkYXlPZlllYXIgPSA3ICogKHdlZWsgLSAxKSArICh3ZWVrZGF5IC0gZmlyc3REYXlPZldlZWspICsgZGF5c1RvQWRkICsgMTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeWVhcjogZGF5T2ZZZWFyID4gMCA/IHllYXIgOiB5ZWFyIC0gMSxcbiAgICAgICAgICAgIGRheU9mWWVhcjogZGF5T2ZZZWFyID4gMCA/ICBkYXlPZlllYXIgOiBkYXlzSW5ZZWFyKHllYXIgLSAxKSArIGRheU9mWWVhclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgVG9wIExldmVsIEZ1bmN0aW9uc1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIGZ1bmN0aW9uIG1ha2VNb21lbnQoY29uZmlnKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IGNvbmZpZy5faSxcbiAgICAgICAgICAgIGZvcm1hdCA9IGNvbmZpZy5fZixcbiAgICAgICAgICAgIHJlcztcblxuICAgICAgICBjb25maWcuX2xvY2FsZSA9IGNvbmZpZy5fbG9jYWxlIHx8IG1vbWVudC5sb2NhbGVEYXRhKGNvbmZpZy5fbCk7XG5cbiAgICAgICAgaWYgKGlucHV0ID09PSBudWxsIHx8IChmb3JtYXQgPT09IHVuZGVmaW5lZCAmJiBpbnB1dCA9PT0gJycpKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50LmludmFsaWQoe251bGxJbnB1dDogdHJ1ZX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbmZpZy5faSA9IGlucHV0ID0gY29uZmlnLl9sb2NhbGUucHJlcGFyc2UoaW5wdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1vbWVudC5pc01vbWVudChpbnB1dCkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTW9tZW50KGlucHV0LCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChmb3JtYXQpIHtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KGZvcm1hdCkpIHtcbiAgICAgICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRBcnJheShjb25maWcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYWtlRGF0ZUZyb21TdHJpbmdBbmRGb3JtYXQoY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1ha2VEYXRlRnJvbUlucHV0KGNvbmZpZyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXMgPSBuZXcgTW9tZW50KGNvbmZpZyk7XG4gICAgICAgIGlmIChyZXMuX25leHREYXkpIHtcbiAgICAgICAgICAgIC8vIEFkZGluZyBpcyBzbWFydCBlbm91Z2ggYXJvdW5kIERTVFxuICAgICAgICAgICAgcmVzLmFkZCgxLCAnZCcpO1xuICAgICAgICAgICAgcmVzLl9uZXh0RGF5ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBtb21lbnQgPSBmdW5jdGlvbiAoaW5wdXQsIGZvcm1hdCwgbG9jYWxlLCBzdHJpY3QpIHtcbiAgICAgICAgdmFyIGM7XG5cbiAgICAgICAgaWYgKHR5cGVvZihsb2NhbGUpID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHN0cmljdCA9IGxvY2FsZTtcbiAgICAgICAgICAgIGxvY2FsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBvYmplY3QgY29uc3RydWN0aW9uIG11c3QgYmUgZG9uZSB0aGlzIHdheS5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vbWVudC9tb21lbnQvaXNzdWVzLzE0MjNcbiAgICAgICAgYyA9IHt9O1xuICAgICAgICBjLl9pc0FNb21lbnRPYmplY3QgPSB0cnVlO1xuICAgICAgICBjLl9pID0gaW5wdXQ7XG4gICAgICAgIGMuX2YgPSBmb3JtYXQ7XG4gICAgICAgIGMuX2wgPSBsb2NhbGU7XG4gICAgICAgIGMuX3N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYy5faXNVVEMgPSBmYWxzZTtcbiAgICAgICAgYy5fcGYgPSBkZWZhdWx0UGFyc2luZ0ZsYWdzKCk7XG5cbiAgICAgICAgcmV0dXJuIG1ha2VNb21lbnQoYyk7XG4gICAgfTtcblxuICAgIG1vbWVudC5zdXBwcmVzc0RlcHJlY2F0aW9uV2FybmluZ3MgPSBmYWxzZTtcblxuICAgIG1vbWVudC5jcmVhdGVGcm9tSW5wdXRGYWxsYmFjayA9IGRlcHJlY2F0ZShcbiAgICAgICAgJ21vbWVudCBjb25zdHJ1Y3Rpb24gZmFsbHMgYmFjayB0byBqcyBEYXRlLiBUaGlzIGlzICcgK1xuICAgICAgICAnZGlzY291cmFnZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB1cGNvbWluZyBtYWpvciAnICtcbiAgICAgICAgJ3JlbGVhc2UuIFBsZWFzZSByZWZlciB0byAnICtcbiAgICAgICAgJ2h0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNDA3IGZvciBtb3JlIGluZm8uJyxcbiAgICAgICAgZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgY29uZmlnLl9kID0gbmV3IERhdGUoY29uZmlnLl9pICsgKGNvbmZpZy5fdXNlVVRDID8gJyBVVEMnIDogJycpKTtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBQaWNrIGEgbW9tZW50IG0gZnJvbSBtb21lbnRzIHNvIHRoYXQgbVtmbl0ob3RoZXIpIGlzIHRydWUgZm9yIGFsbFxuICAgIC8vIG90aGVyLiBUaGlzIHJlbGllcyBvbiB0aGUgZnVuY3Rpb24gZm4gdG8gYmUgdHJhbnNpdGl2ZS5cbiAgICAvL1xuICAgIC8vIG1vbWVudHMgc2hvdWxkIGVpdGhlciBiZSBhbiBhcnJheSBvZiBtb21lbnQgb2JqZWN0cyBvciBhbiBhcnJheSwgd2hvc2VcbiAgICAvLyBmaXJzdCBlbGVtZW50IGlzIGFuIGFycmF5IG9mIG1vbWVudCBvYmplY3RzLlxuICAgIGZ1bmN0aW9uIHBpY2tCeShmbiwgbW9tZW50cykge1xuICAgICAgICB2YXIgcmVzLCBpO1xuICAgICAgICBpZiAobW9tZW50cy5sZW5ndGggPT09IDEgJiYgaXNBcnJheShtb21lbnRzWzBdKSkge1xuICAgICAgICAgICAgbW9tZW50cyA9IG1vbWVudHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtb21lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHJlcyA9IG1vbWVudHNbMF07XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBtb21lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAobW9tZW50c1tpXVtmbl0ocmVzKSkge1xuICAgICAgICAgICAgICAgIHJlcyA9IG1vbWVudHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBtb21lbnQubWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblxuICAgICAgICByZXR1cm4gcGlja0J5KCdpc0JlZm9yZScsIGFyZ3MpO1xuICAgIH07XG5cbiAgICBtb21lbnQubWF4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcblxuICAgICAgICByZXR1cm4gcGlja0J5KCdpc0FmdGVyJywgYXJncyk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0aW5nIHdpdGggdXRjXG4gICAgbW9tZW50LnV0YyA9IGZ1bmN0aW9uIChpbnB1dCwgZm9ybWF0LCBsb2NhbGUsIHN0cmljdCkge1xuICAgICAgICB2YXIgYztcblxuICAgICAgICBpZiAodHlwZW9mKGxvY2FsZSkgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgc3RyaWN0ID0gbG9jYWxlO1xuICAgICAgICAgICAgbG9jYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIG9iamVjdCBjb25zdHJ1Y3Rpb24gbXVzdCBiZSBkb25lIHRoaXMgd2F5LlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTQyM1xuICAgICAgICBjID0ge307XG4gICAgICAgIGMuX2lzQU1vbWVudE9iamVjdCA9IHRydWU7XG4gICAgICAgIGMuX3VzZVVUQyA9IHRydWU7XG4gICAgICAgIGMuX2lzVVRDID0gdHJ1ZTtcbiAgICAgICAgYy5fbCA9IGxvY2FsZTtcbiAgICAgICAgYy5faSA9IGlucHV0O1xuICAgICAgICBjLl9mID0gZm9ybWF0O1xuICAgICAgICBjLl9zdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGMuX3BmID0gZGVmYXVsdFBhcnNpbmdGbGFncygpO1xuXG4gICAgICAgIHJldHVybiBtYWtlTW9tZW50KGMpLnV0YygpO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGluZyB3aXRoIHVuaXggdGltZXN0YW1wIChpbiBzZWNvbmRzKVxuICAgIG1vbWVudC51bml4ID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBtb21lbnQoaW5wdXQgKiAxMDAwKTtcbiAgICB9O1xuXG4gICAgLy8gZHVyYXRpb25cbiAgICBtb21lbnQuZHVyYXRpb24gPSBmdW5jdGlvbiAoaW5wdXQsIGtleSkge1xuICAgICAgICB2YXIgZHVyYXRpb24gPSBpbnB1dCxcbiAgICAgICAgICAgIC8vIG1hdGNoaW5nIGFnYWluc3QgcmVnZXhwIGlzIGV4cGVuc2l2ZSwgZG8gaXQgb24gZGVtYW5kXG4gICAgICAgICAgICBtYXRjaCA9IG51bGwsXG4gICAgICAgICAgICBzaWduLFxuICAgICAgICAgICAgcmV0LFxuICAgICAgICAgICAgcGFyc2VJc28sXG4gICAgICAgICAgICBkaWZmUmVzO1xuXG4gICAgICAgIGlmIChtb21lbnQuaXNEdXJhdGlvbihpbnB1dCkpIHtcbiAgICAgICAgICAgIGR1cmF0aW9uID0ge1xuICAgICAgICAgICAgICAgIG1zOiBpbnB1dC5fbWlsbGlzZWNvbmRzLFxuICAgICAgICAgICAgICAgIGQ6IGlucHV0Ll9kYXlzLFxuICAgICAgICAgICAgICAgIE06IGlucHV0Ll9tb250aHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7fTtcbiAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbltrZXldID0gaW5wdXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uLm1pbGxpc2Vjb25kcyA9IGlucHV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCEhKG1hdGNoID0gYXNwTmV0VGltZVNwYW5Kc29uUmVnZXguZXhlYyhpbnB1dCkpKSB7XG4gICAgICAgICAgICBzaWduID0gKG1hdGNoWzFdID09PSAnLScpID8gLTEgOiAxO1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgICAgICBkOiB0b0ludChtYXRjaFtEQVRFXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIGg6IHRvSW50KG1hdGNoW0hPVVJdKSAqIHNpZ24sXG4gICAgICAgICAgICAgICAgbTogdG9JbnQobWF0Y2hbTUlOVVRFXSkgKiBzaWduLFxuICAgICAgICAgICAgICAgIHM6IHRvSW50KG1hdGNoW1NFQ09ORF0pICogc2lnbixcbiAgICAgICAgICAgICAgICBtczogdG9JbnQobWF0Y2hbTUlMTElTRUNPTkRdKSAqIHNpZ25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoISEobWF0Y2ggPSBpc29EdXJhdGlvblJlZ2V4LmV4ZWMoaW5wdXQpKSkge1xuICAgICAgICAgICAgc2lnbiA9IChtYXRjaFsxXSA9PT0gJy0nKSA/IC0xIDogMTtcbiAgICAgICAgICAgIHBhcnNlSXNvID0gZnVuY3Rpb24gKGlucCkge1xuICAgICAgICAgICAgICAgIC8vIFdlJ2Qgbm9ybWFsbHkgdXNlIH5+aW5wIGZvciB0aGlzLCBidXQgdW5mb3J0dW5hdGVseSBpdCBhbHNvXG4gICAgICAgICAgICAgICAgLy8gY29udmVydHMgZmxvYXRzIHRvIGludHMuXG4gICAgICAgICAgICAgICAgLy8gaW5wIG1heSBiZSB1bmRlZmluZWQsIHNvIGNhcmVmdWwgY2FsbGluZyByZXBsYWNlIG9uIGl0LlxuICAgICAgICAgICAgICAgIHZhciByZXMgPSBpbnAgJiYgcGFyc2VGbG9hdChpbnAucmVwbGFjZSgnLCcsICcuJykpO1xuICAgICAgICAgICAgICAgIC8vIGFwcGx5IHNpZ24gd2hpbGUgd2UncmUgYXQgaXRcbiAgICAgICAgICAgICAgICByZXR1cm4gKGlzTmFOKHJlcykgPyAwIDogcmVzKSAqIHNpZ247XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZHVyYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgeTogcGFyc2VJc28obWF0Y2hbMl0pLFxuICAgICAgICAgICAgICAgIE06IHBhcnNlSXNvKG1hdGNoWzNdKSxcbiAgICAgICAgICAgICAgICBkOiBwYXJzZUlzbyhtYXRjaFs0XSksXG4gICAgICAgICAgICAgICAgaDogcGFyc2VJc28obWF0Y2hbNV0pLFxuICAgICAgICAgICAgICAgIG06IHBhcnNlSXNvKG1hdGNoWzZdKSxcbiAgICAgICAgICAgICAgICBzOiBwYXJzZUlzbyhtYXRjaFs3XSksXG4gICAgICAgICAgICAgICAgdzogcGFyc2VJc28obWF0Y2hbOF0pXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKGR1cmF0aW9uID09IG51bGwpIHsvLyBjaGVja3MgZm9yIG51bGwgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICBkdXJhdGlvbiA9IHt9O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkdXJhdGlvbiA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICAoJ2Zyb20nIGluIGR1cmF0aW9uIHx8ICd0bycgaW4gZHVyYXRpb24pKSB7XG4gICAgICAgICAgICBkaWZmUmVzID0gbW9tZW50c0RpZmZlcmVuY2UobW9tZW50KGR1cmF0aW9uLmZyb20pLCBtb21lbnQoZHVyYXRpb24udG8pKTtcblxuICAgICAgICAgICAgZHVyYXRpb24gPSB7fTtcbiAgICAgICAgICAgIGR1cmF0aW9uLm1zID0gZGlmZlJlcy5taWxsaXNlY29uZHM7XG4gICAgICAgICAgICBkdXJhdGlvbi5NID0gZGlmZlJlcy5tb250aHM7XG4gICAgICAgIH1cblxuICAgICAgICByZXQgPSBuZXcgRHVyYXRpb24oZHVyYXRpb24pO1xuXG4gICAgICAgIGlmIChtb21lbnQuaXNEdXJhdGlvbihpbnB1dCkgJiYgaGFzT3duUHJvcChpbnB1dCwgJ19sb2NhbGUnKSkge1xuICAgICAgICAgICAgcmV0Ll9sb2NhbGUgPSBpbnB1dC5fbG9jYWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuXG4gICAgLy8gdmVyc2lvbiBudW1iZXJcbiAgICBtb21lbnQudmVyc2lvbiA9IFZFUlNJT047XG5cbiAgICAvLyBkZWZhdWx0IGZvcm1hdFxuICAgIG1vbWVudC5kZWZhdWx0Rm9ybWF0ID0gaXNvRm9ybWF0O1xuXG4gICAgLy8gY29uc3RhbnQgdGhhdCByZWZlcnMgdG8gdGhlIElTTyBzdGFuZGFyZFxuICAgIG1vbWVudC5JU09fODYwMSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgLy8gUGx1Z2lucyB0aGF0IGFkZCBwcm9wZXJ0aWVzIHNob3VsZCBhbHNvIGFkZCB0aGUga2V5IGhlcmUgKG51bGwgdmFsdWUpLFxuICAgIC8vIHNvIHdlIGNhbiBwcm9wZXJseSBjbG9uZSBvdXJzZWx2ZXMuXG4gICAgbW9tZW50Lm1vbWVudFByb3BlcnRpZXMgPSBtb21lbnRQcm9wZXJ0aWVzO1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aGVuZXZlciBhIG1vbWVudCBpcyBtdXRhdGVkLlxuICAgIC8vIEl0IGlzIGludGVuZGVkIHRvIGtlZXAgdGhlIG9mZnNldCBpbiBzeW5jIHdpdGggdGhlIHRpbWV6b25lLlxuICAgIG1vbWVudC51cGRhdGVPZmZzZXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIC8vIFRoaXMgZnVuY3Rpb24gYWxsb3dzIHlvdSB0byBzZXQgYSB0aHJlc2hvbGQgZm9yIHJlbGF0aXZlIHRpbWUgc3RyaW5nc1xuICAgIG1vbWVudC5yZWxhdGl2ZVRpbWVUaHJlc2hvbGQgPSBmdW5jdGlvbiAodGhyZXNob2xkLCBsaW1pdCkge1xuICAgICAgICBpZiAocmVsYXRpdmVUaW1lVGhyZXNob2xkc1t0aHJlc2hvbGRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGltaXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aXZlVGltZVRocmVzaG9sZHNbdGhyZXNob2xkXTtcbiAgICAgICAgfVxuICAgICAgICByZWxhdGl2ZVRpbWVUaHJlc2hvbGRzW3RocmVzaG9sZF0gPSBsaW1pdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG1vbWVudC5sYW5nID0gZGVwcmVjYXRlKFxuICAgICAgICAnbW9tZW50LmxhbmcgaXMgZGVwcmVjYXRlZC4gVXNlIG1vbWVudC5sb2NhbGUgaW5zdGVhZC4nLFxuICAgICAgICBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudC5sb2NhbGUoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGxvYWQgbG9jYWxlIGFuZCB0aGVuIHNldCB0aGUgZ2xvYmFsIGxvY2FsZS4gIElmXG4gICAgLy8gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWQgaW4sIGl0IHdpbGwgc2ltcGx5IHJldHVybiB0aGUgY3VycmVudCBnbG9iYWxcbiAgICAvLyBsb2NhbGUga2V5LlxuICAgIG1vbWVudC5sb2NhbGUgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZXMpIHtcbiAgICAgICAgdmFyIGRhdGE7XG4gICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YodmFsdWVzKSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gbW9tZW50LmRlZmluZUxvY2FsZShrZXksIHZhbHVlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gbW9tZW50LmxvY2FsZURhdGEoa2V5KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBtb21lbnQuZHVyYXRpb24uX2xvY2FsZSA9IG1vbWVudC5fbG9jYWxlID0gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb21lbnQuX2xvY2FsZS5fYWJicjtcbiAgICB9O1xuXG4gICAgbW9tZW50LmRlZmluZUxvY2FsZSA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHZhbHVlcyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWVzLmFiYnIgPSBuYW1lO1xuICAgICAgICAgICAgaWYgKCFsb2NhbGVzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxlc1tuYW1lXSA9IG5ldyBMb2NhbGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvY2FsZXNbbmFtZV0uc2V0KHZhbHVlcyk7XG5cbiAgICAgICAgICAgIC8vIGJhY2t3YXJkcyBjb21wYXQgZm9yIG5vdzogYWxzbyBzZXQgdGhlIGxvY2FsZVxuICAgICAgICAgICAgbW9tZW50LmxvY2FsZShuYW1lKTtcblxuICAgICAgICAgICAgcmV0dXJuIGxvY2FsZXNbbmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB1c2VmdWwgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbGVzW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbW9tZW50LmxhbmdEYXRhID0gZGVwcmVjYXRlKFxuICAgICAgICAnbW9tZW50LmxhbmdEYXRhIGlzIGRlcHJlY2F0ZWQuIFVzZSBtb21lbnQubG9jYWxlRGF0YSBpbnN0ZWFkLicsXG4gICAgICAgIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQubG9jYWxlRGF0YShrZXkpO1xuICAgICAgICB9XG4gICAgKTtcblxuICAgIC8vIHJldHVybnMgbG9jYWxlIGRhdGFcbiAgICBtb21lbnQubG9jYWxlRGF0YSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgdmFyIGxvY2FsZTtcblxuICAgICAgICBpZiAoa2V5ICYmIGtleS5fbG9jYWxlICYmIGtleS5fbG9jYWxlLl9hYmJyKSB7XG4gICAgICAgICAgICBrZXkgPSBrZXkuX2xvY2FsZS5fYWJicjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50Ll9sb2NhbGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkoa2V5KSkge1xuICAgICAgICAgICAgLy9zaG9ydC1jaXJjdWl0IGV2ZXJ5dGhpbmcgZWxzZVxuICAgICAgICAgICAgbG9jYWxlID0gbG9hZExvY2FsZShrZXkpO1xuICAgICAgICAgICAgaWYgKGxvY2FsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsb2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBrZXkgPSBba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaG9vc2VMb2NhbGUoa2V5KTtcbiAgICB9O1xuXG4gICAgLy8gY29tcGFyZSBtb21lbnQgb2JqZWN0XG4gICAgbW9tZW50LmlzTW9tZW50ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgTW9tZW50IHx8XG4gICAgICAgICAgICAob2JqICE9IG51bGwgJiYgaGFzT3duUHJvcChvYmosICdfaXNBTW9tZW50T2JqZWN0JykpO1xuICAgIH07XG5cbiAgICAvLyBmb3IgdHlwZWNoZWNraW5nIER1cmF0aW9uIG9iamVjdHNcbiAgICBtb21lbnQuaXNEdXJhdGlvbiA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIER1cmF0aW9uO1xuICAgIH07XG5cbiAgICBmb3IgKGkgPSBsaXN0cy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICBtYWtlTGlzdChsaXN0c1tpXSk7XG4gICAgfVxuXG4gICAgbW9tZW50Lm5vcm1hbGl6ZVVuaXRzID0gZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgfTtcblxuICAgIG1vbWVudC5pbnZhbGlkID0gZnVuY3Rpb24gKGZsYWdzKSB7XG4gICAgICAgIHZhciBtID0gbW9tZW50LnV0YyhOYU4pO1xuICAgICAgICBpZiAoZmxhZ3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgZXh0ZW5kKG0uX3BmLCBmbGFncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBtLl9wZi51c2VySW52YWxpZGF0ZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG07XG4gICAgfTtcblxuICAgIG1vbWVudC5wYXJzZVpvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBtb21lbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKS5wYXJzZVpvbmUoKTtcbiAgICB9O1xuXG4gICAgbW9tZW50LnBhcnNlVHdvRGlnaXRZZWFyID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0b0ludChpbnB1dCkgKyAodG9JbnQoaW5wdXQpID4gNjggPyAxOTAwIDogMjAwMCk7XG4gICAgfTtcblxuICAgIG1vbWVudC5pc0RhdGUgPSBpc0RhdGU7XG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIE1vbWVudCBQcm90b3R5cGVcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuICAgIGV4dGVuZChtb21lbnQuZm4gPSBNb21lbnQucHJvdG90eXBlLCB7XG5cbiAgICAgICAgY2xvbmUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHZhbHVlT2YgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXMuX2QgLSAoKHRoaXMuX29mZnNldCB8fCAwKSAqIDYwMDAwKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1bml4IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoK3RoaXMgLyAxMDAwKTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb25lKCkubG9jYWxlKCdlbicpLmZvcm1hdCgnZGRkIE1NTSBERCBZWVlZIEhIOm1tOnNzIFtHTVRdWlonKTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b0RhdGUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb2Zmc2V0ID8gbmV3IERhdGUoK3RoaXMpIDogdGhpcy5fZDtcbiAgICAgICAgfSxcblxuICAgICAgICB0b0lTT1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBtID0gbW9tZW50KHRoaXMpLnV0YygpO1xuICAgICAgICAgICAgaWYgKDAgPCBtLnllYXIoKSAmJiBtLnllYXIoKSA8PSA5OTk5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb24gaXMgfjUweCBmYXN0ZXIsIHVzZSBpdCB3aGVuIHdlIGNhblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b0RhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXRNb21lbnQobSwgJ1lZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl0nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXRNb21lbnQobSwgJ1lZWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1taXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHRvQXJyYXkgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbSA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIG0ueWVhcigpLFxuICAgICAgICAgICAgICAgIG0ubW9udGgoKSxcbiAgICAgICAgICAgICAgICBtLmRhdGUoKSxcbiAgICAgICAgICAgICAgICBtLmhvdXJzKCksXG4gICAgICAgICAgICAgICAgbS5taW51dGVzKCksXG4gICAgICAgICAgICAgICAgbS5zZWNvbmRzKCksXG4gICAgICAgICAgICAgICAgbS5taWxsaXNlY29uZHMoKVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc1ZhbGlkIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGlzVmFsaWQodGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNEU1RTaGlmdGVkIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2EpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc1ZhbGlkKCkgJiYgY29tcGFyZUFycmF5cyh0aGlzLl9hLCAodGhpcy5faXNVVEMgPyBtb21lbnQudXRjKHRoaXMuX2EpIDogbW9tZW50KHRoaXMuX2EpKS50b0FycmF5KCkpID4gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBhcnNpbmdGbGFncyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBleHRlbmQoe30sIHRoaXMuX3BmKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbnZhbGlkQXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZi5vdmVyZmxvdztcbiAgICAgICAgfSxcblxuICAgICAgICB1dGMgOiBmdW5jdGlvbiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudXRjT2Zmc2V0KDAsIGtlZXBMb2NhbFRpbWUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvY2FsIDogZnVuY3Rpb24gKGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc1VUQykge1xuICAgICAgICAgICAgICAgIHRoaXMudXRjT2Zmc2V0KDAsIGtlZXBMb2NhbFRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2lzVVRDID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoa2VlcExvY2FsVGltZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YnRyYWN0KHRoaXMuX2RhdGVVdGNPZmZzZXQoKSwgJ20nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBmb3JtYXQgOiBmdW5jdGlvbiAoaW5wdXRTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBmb3JtYXRNb21lbnQodGhpcywgaW5wdXRTdHJpbmcgfHwgbW9tZW50LmRlZmF1bHRGb3JtYXQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlRGF0YSgpLnBvc3Rmb3JtYXQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhZGQgOiBjcmVhdGVBZGRlcigxLCAnYWRkJyksXG5cbiAgICAgICAgc3VidHJhY3QgOiBjcmVhdGVBZGRlcigtMSwgJ3N1YnRyYWN0JyksXG5cbiAgICAgICAgZGlmZiA6IGZ1bmN0aW9uIChpbnB1dCwgdW5pdHMsIGFzRmxvYXQpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gbWFrZUFzKGlucHV0LCB0aGlzKSxcbiAgICAgICAgICAgICAgICB6b25lRGlmZiA9ICh0aGF0LnV0Y09mZnNldCgpIC0gdGhpcy51dGNPZmZzZXQoKSkgKiA2ZTQsXG4gICAgICAgICAgICAgICAgYW5jaG9yLCBkaWZmLCBvdXRwdXQsIGRheXNBZGp1c3Q7XG5cbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICd5ZWFyJyB8fCB1bml0cyA9PT0gJ21vbnRoJyB8fCB1bml0cyA9PT0gJ3F1YXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gbW9udGhEaWZmKHRoaXMsIHRoYXQpO1xuICAgICAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3F1YXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCAvIDM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1bml0cyA9PT0gJ3llYXInKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCA9IG91dHB1dCAvIDEyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IHRoaXMgLSB0aGF0O1xuICAgICAgICAgICAgICAgIG91dHB1dCA9IHVuaXRzID09PSAnc2Vjb25kJyA/IGRpZmYgLyAxZTMgOiAvLyAxMDAwXG4gICAgICAgICAgICAgICAgICAgIHVuaXRzID09PSAnbWludXRlJyA/IGRpZmYgLyA2ZTQgOiAvLyAxMDAwICogNjBcbiAgICAgICAgICAgICAgICAgICAgdW5pdHMgPT09ICdob3VyJyA/IGRpZmYgLyAzNmU1IDogLy8gMTAwMCAqIDYwICogNjBcbiAgICAgICAgICAgICAgICAgICAgdW5pdHMgPT09ICdkYXknID8gKGRpZmYgLSB6b25lRGlmZikgLyA4NjRlNSA6IC8vIDEwMDAgKiA2MCAqIDYwICogMjQsIG5lZ2F0ZSBkc3RcbiAgICAgICAgICAgICAgICAgICAgdW5pdHMgPT09ICd3ZWVrJyA/IChkaWZmIC0gem9uZURpZmYpIC8gNjA0OGU1IDogLy8gMTAwMCAqIDYwICogNjAgKiAyNCAqIDcsIG5lZ2F0ZSBkc3RcbiAgICAgICAgICAgICAgICAgICAgZGlmZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhc0Zsb2F0ID8gb3V0cHV0IDogYWJzUm91bmQob3V0cHV0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBmcm9tIDogZnVuY3Rpb24gKHRpbWUsIHdpdGhvdXRTdWZmaXgpIHtcbiAgICAgICAgICAgIHJldHVybiBtb21lbnQuZHVyYXRpb24oe3RvOiB0aGlzLCBmcm9tOiB0aW1lfSkubG9jYWxlKHRoaXMubG9jYWxlKCkpLmh1bWFuaXplKCF3aXRob3V0U3VmZml4KTtcbiAgICAgICAgfSxcblxuICAgICAgICBmcm9tTm93IDogZnVuY3Rpb24gKHdpdGhvdXRTdWZmaXgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZyb20obW9tZW50KCksIHdpdGhvdXRTdWZmaXgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGVuZGFyIDogZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAgICAgICAgIC8vIFdlIHdhbnQgdG8gY29tcGFyZSB0aGUgc3RhcnQgb2YgdG9kYXksIHZzIHRoaXMuXG4gICAgICAgICAgICAvLyBHZXR0aW5nIHN0YXJ0LW9mLXRvZGF5IGRlcGVuZHMgb24gd2hldGhlciB3ZSdyZSBsb2NhdC91dGMvb2Zmc2V0XG4gICAgICAgICAgICAvLyBvciBub3QuXG4gICAgICAgICAgICB2YXIgbm93ID0gdGltZSB8fCBtb21lbnQoKSxcbiAgICAgICAgICAgICAgICBzb2QgPSBtYWtlQXMobm93LCB0aGlzKS5zdGFydE9mKCdkYXknKSxcbiAgICAgICAgICAgICAgICBkaWZmID0gdGhpcy5kaWZmKHNvZCwgJ2RheXMnLCB0cnVlKSxcbiAgICAgICAgICAgICAgICBmb3JtYXQgPSBkaWZmIDwgLTYgPyAnc2FtZUVsc2UnIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IC0xID8gJ2xhc3RXZWVrJyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCAwID8gJ2xhc3REYXknIDpcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA8IDEgPyAnc2FtZURheScgOlxuICAgICAgICAgICAgICAgICAgICBkaWZmIDwgMiA/ICduZXh0RGF5JyA6XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPCA3ID8gJ25leHRXZWVrJyA6ICdzYW1lRWxzZSc7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQodGhpcy5sb2NhbGVEYXRhKCkuY2FsZW5kYXIoZm9ybWF0LCB0aGlzLCBtb21lbnQobm93KSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzTGVhcFllYXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaXNMZWFwWWVhcih0aGlzLnllYXIoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNEU1QgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHRoaXMudXRjT2Zmc2V0KCkgPiB0aGlzLmNsb25lKCkubW9udGgoMCkudXRjT2Zmc2V0KCkgfHxcbiAgICAgICAgICAgICAgICB0aGlzLnV0Y09mZnNldCgpID4gdGhpcy5jbG9uZSgpLm1vbnRoKDUpLnV0Y09mZnNldCgpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciBkYXkgPSB0aGlzLl9pc1VUQyA/IHRoaXMuX2QuZ2V0VVRDRGF5KCkgOiB0aGlzLl9kLmdldERheSgpO1xuICAgICAgICAgICAgaWYgKGlucHV0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IHBhcnNlV2Vla2RheShpbnB1dCwgdGhpcy5sb2NhbGVEYXRhKCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZChpbnB1dCAtIGRheSwgJ2QnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBtb250aCA6IG1ha2VBY2Nlc3NvcignTW9udGgnLCB0cnVlKSxcblxuICAgICAgICBzdGFydE9mIDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIC8vIHRoZSBmb2xsb3dpbmcgc3dpdGNoIGludGVudGlvbmFsbHkgb21pdHMgYnJlYWsga2V5d29yZHNcbiAgICAgICAgICAgIC8vIHRvIHV0aWxpemUgZmFsbGluZyB0aHJvdWdoIHRoZSBjYXNlcy5cbiAgICAgICAgICAgIHN3aXRjaCAodW5pdHMpIHtcbiAgICAgICAgICAgIGNhc2UgJ3llYXInOlxuICAgICAgICAgICAgICAgIHRoaXMubW9udGgoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAncXVhcnRlcic6XG4gICAgICAgICAgICBjYXNlICdtb250aCc6XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRlKDEpO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3dlZWsnOlxuICAgICAgICAgICAgY2FzZSAnaXNvV2Vlayc6XG4gICAgICAgICAgICBjYXNlICdkYXknOlxuICAgICAgICAgICAgICAgIHRoaXMuaG91cnMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgY2FzZSAnaG91cic6XG4gICAgICAgICAgICAgICAgdGhpcy5taW51dGVzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRzKDApO1xuICAgICAgICAgICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgICAgICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgICAgICAgICAgICAgdGhpcy5taWxsaXNlY29uZHMoMCk7XG4gICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB3ZWVrcyBhcmUgYSBzcGVjaWFsIGNhc2VcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrZGF5KDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1bml0cyA9PT0gJ2lzb1dlZWsnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc29XZWVrZGF5KDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBxdWFydGVycyBhcmUgYWxzbyBzcGVjaWFsXG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgIHRoaXMubW9udGgoTWF0aC5mbG9vcih0aGlzLm1vbnRoKCkgLyAzKSAqIDMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBlbmRPZjogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gdW5kZWZpbmVkIHx8IHVuaXRzID09PSAnbWlsbGlzZWNvbmQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGFydE9mKHVuaXRzKS5hZGQoMSwgKHVuaXRzID09PSAnaXNvV2VlaycgPyAnd2VlaycgOiB1bml0cykpLnN1YnRyYWN0KDEsICdtcycpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzQWZ0ZXI6IGZ1bmN0aW9uIChpbnB1dCwgdW5pdHMpIHtcbiAgICAgICAgICAgIHZhciBpbnB1dE1zO1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh0eXBlb2YgdW5pdHMgIT09ICd1bmRlZmluZWQnID8gdW5pdHMgOiAnbWlsbGlzZWNvbmQnKTtcbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ21pbGxpc2Vjb25kJykge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gbW9tZW50LmlzTW9tZW50KGlucHV0KSA/IGlucHV0IDogbW9tZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gK3RoaXMgPiAraW5wdXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0TXMgPSBtb21lbnQuaXNNb21lbnQoaW5wdXQpID8gK2lucHV0IDogK21vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0TXMgPCArdGhpcy5jbG9uZSgpLnN0YXJ0T2YodW5pdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzQmVmb3JlOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModHlwZW9mIHVuaXRzICE9PSAndW5kZWZpbmVkJyA/IHVuaXRzIDogJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IG1vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICt0aGlzIDwgK2lucHV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnB1dE1zID0gbW9tZW50LmlzTW9tZW50KGlucHV0KSA/ICtpbnB1dCA6ICttb21lbnQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHJldHVybiArdGhpcy5jbG9uZSgpLmVuZE9mKHVuaXRzKSA8IGlucHV0TXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNCZXR3ZWVuOiBmdW5jdGlvbiAoZnJvbSwgdG8sIHVuaXRzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc0FmdGVyKGZyb20sIHVuaXRzKSAmJiB0aGlzLmlzQmVmb3JlKHRvLCB1bml0cyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNTYW1lOiBmdW5jdGlvbiAoaW5wdXQsIHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgaW5wdXRNcztcbiAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMgfHwgJ21pbGxpc2Vjb25kJyk7XG4gICAgICAgICAgICBpZiAodW5pdHMgPT09ICdtaWxsaXNlY29uZCcpIHtcbiAgICAgICAgICAgICAgICBpbnB1dCA9IG1vbWVudC5pc01vbWVudChpbnB1dCkgPyBpbnB1dCA6IG1vbWVudChpbnB1dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICt0aGlzID09PSAraW5wdXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0TXMgPSArbW9tZW50KGlucHV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKyh0aGlzLmNsb25lKCkuc3RhcnRPZih1bml0cykpIDw9IGlucHV0TXMgJiYgaW5wdXRNcyA8PSArKHRoaXMuY2xvbmUoKS5lbmRPZih1bml0cykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG1pbjogZGVwcmVjYXRlKFxuICAgICAgICAgICAgICAgICAnbW9tZW50KCkubWluIGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWluIGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNTQ4JyxcbiAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICBvdGhlciA9IG1vbWVudC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyIDwgdGhpcyA/IHRoaXMgOiBvdGhlcjtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgKSxcblxuICAgICAgICBtYXg6IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAnbW9tZW50KCkubWF4IGlzIGRlcHJlY2F0ZWQsIHVzZSBtb21lbnQubWF4IGluc3RlYWQuIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L2lzc3Vlcy8xNTQ4JyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3RoZXIgPSBtb21lbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyID4gdGhpcyA/IHRoaXMgOiBvdGhlcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICksXG5cbiAgICAgICAgem9uZSA6IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAnbW9tZW50KCkuem9uZSBpcyBkZXByZWNhdGVkLCB1c2UgbW9tZW50KCkudXRjT2Zmc2V0IGluc3RlYWQuICcgK1xuICAgICAgICAgICAgICAgICdodHRwczovL2dpdGh1Yi5jb20vbW9tZW50L21vbWVudC9pc3N1ZXMvMTc3OScsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGlucHV0LCBrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0ID0gLWlucHV0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnV0Y09mZnNldChpbnB1dCwga2VlcExvY2FsVGltZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC10aGlzLnV0Y09mZnNldCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIC8vIGtlZXBMb2NhbFRpbWUgPSB0cnVlIG1lYW5zIG9ubHkgY2hhbmdlIHRoZSB0aW1lem9uZSwgd2l0aG91dFxuICAgICAgICAvLyBhZmZlY3RpbmcgdGhlIGxvY2FsIGhvdXIuIFNvIDU6MzE6MjYgKzAzMDAgLS1bdXRjT2Zmc2V0KDIsIHRydWUpXS0tPlxuICAgICAgICAvLyA1OjMxOjI2ICswMjAwIEl0IGlzIHBvc3NpYmxlIHRoYXQgNTozMToyNiBkb2Vzbid0IGV4aXN0IHdpdGggb2Zmc2V0XG4gICAgICAgIC8vICswMjAwLCBzbyB3ZSBhZGp1c3QgdGhlIHRpbWUgYXMgbmVlZGVkLCB0byBiZSB2YWxpZC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gS2VlcGluZyB0aGUgdGltZSBhY3R1YWxseSBhZGRzL3N1YnRyYWN0cyAob25lIGhvdXIpXG4gICAgICAgIC8vIGZyb20gdGhlIGFjdHVhbCByZXByZXNlbnRlZCB0aW1lLiBUaGF0IGlzIHdoeSB3ZSBjYWxsIHVwZGF0ZU9mZnNldFxuICAgICAgICAvLyBhIHNlY29uZCB0aW1lLiBJbiBjYXNlIGl0IHdhbnRzIHVzIHRvIGNoYW5nZSB0aGUgb2Zmc2V0IGFnYWluXG4gICAgICAgIC8vIF9jaGFuZ2VJblByb2dyZXNzID09IHRydWUgY2FzZSwgdGhlbiB3ZSBoYXZlIHRvIGFkanVzdCwgYmVjYXVzZVxuICAgICAgICAvLyB0aGVyZSBpcyBubyBzdWNoIHRpbWUgaW4gdGhlIGdpdmVuIHRpbWV6b25lLlxuICAgICAgICB1dGNPZmZzZXQgOiBmdW5jdGlvbiAoaW5wdXQsIGtlZXBMb2NhbFRpbWUpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLl9vZmZzZXQgfHwgMCxcbiAgICAgICAgICAgICAgICBsb2NhbEFkanVzdDtcbiAgICAgICAgICAgIGlmIChpbnB1dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQgPSB1dGNPZmZzZXRGcm9tU3RyaW5nKGlucHV0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKGlucHV0KSA8IDE2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0ID0gaW5wdXQgKiA2MDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1VUQyAmJiBrZWVwTG9jYWxUaW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsQWRqdXN0ID0gdGhpcy5fZGF0ZVV0Y09mZnNldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9vZmZzZXQgPSBpbnB1dDtcbiAgICAgICAgICAgICAgICB0aGlzLl9pc1VUQyA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsQWRqdXN0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGQobG9jYWxBZGp1c3QsICdtJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgIT09IGlucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgha2VlcExvY2FsVGltZSB8fCB0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRPclN1YnRyYWN0RHVyYXRpb25Gcm9tTW9tZW50KHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudC5kdXJhdGlvbihpbnB1dCAtIG9mZnNldCwgJ20nKSwgMSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLl9jaGFuZ2VJblByb2dyZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFuZ2VJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vbWVudC51cGRhdGVPZmZzZXQodGhpcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jaGFuZ2VJblByb2dyZXNzID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgPyBvZmZzZXQgOiB0aGlzLl9kYXRlVXRjT2Zmc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNMb2NhbCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5faXNVVEM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNVdGNPZmZzZXQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNVdGMgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNVVEMgJiYgdGhpcy5fb2Zmc2V0ID09PSAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIHpvbmVBYmJyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzVVRDID8gJ1VUQycgOiAnJztcbiAgICAgICAgfSxcblxuICAgICAgICB6b25lTmFtZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc1VUQyA/ICdDb29yZGluYXRlZCBVbml2ZXJzYWwgVGltZScgOiAnJztcbiAgICAgICAgfSxcblxuICAgICAgICBwYXJzZVpvbmUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fdHptKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQodGhpcy5fdHptKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuX2kgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51dGNPZmZzZXQodXRjT2Zmc2V0RnJvbVN0cmluZyh0aGlzLl9pKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBoYXNBbGlnbmVkSG91ck9mZnNldCA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgICAgICAgaWYgKCFpbnB1dCkge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlucHV0ID0gbW9tZW50KGlucHV0KS51dGNPZmZzZXQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnV0Y09mZnNldCgpIC0gaW5wdXQpICUgNjAgPT09IDA7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5c0luTW9udGggOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF5c0luTW9udGgodGhpcy55ZWFyKCksIHRoaXMubW9udGgoKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGF5T2ZZZWFyIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgZGF5T2ZZZWFyID0gcm91bmQoKG1vbWVudCh0aGlzKS5zdGFydE9mKCdkYXknKSAtIG1vbWVudCh0aGlzKS5zdGFydE9mKCd5ZWFyJykpIC8gODY0ZTUpICsgMTtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gZGF5T2ZZZWFyIDogdGhpcy5hZGQoKGlucHV0IC0gZGF5T2ZZZWFyKSwgJ2QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBxdWFydGVyIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IE1hdGguY2VpbCgodGhpcy5tb250aCgpICsgMSkgLyAzKSA6IHRoaXMubW9udGgoKGlucHV0IC0gMSkgKiAzICsgdGhpcy5tb250aCgpICUgMyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla1llYXIgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB5ZWFyID0gd2Vla09mWWVhcih0aGlzLCB0aGlzLmxvY2FsZURhdGEoKS5fd2Vlay5kb3csIHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRveSkueWVhcjtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8geWVhciA6IHRoaXMuYWRkKChpbnB1dCAtIHllYXIpLCAneScpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWtZZWFyIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgeWVhciA9IHdlZWtPZlllYXIodGhpcywgMSwgNCkueWVhcjtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8geWVhciA6IHRoaXMuYWRkKChpbnB1dCAtIHllYXIpLCAneScpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdlZWsgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrID0gdGhpcy5sb2NhbGVEYXRhKCkud2Vlayh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2VlayA6IHRoaXMuYWRkKChpbnB1dCAtIHdlZWspICogNywgJ2QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc29XZWVrIDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgd2VlayA9IHdlZWtPZlllYXIodGhpcywgMSwgNCkud2VlaztcbiAgICAgICAgICAgIHJldHVybiBpbnB1dCA9PSBudWxsID8gd2VlayA6IHRoaXMuYWRkKChpbnB1dCAtIHdlZWspICogNywgJ2QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrZGF5IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICAgICAgICB2YXIgd2Vla2RheSA9ICh0aGlzLmRheSgpICsgNyAtIHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrLmRvdykgJSA3O1xuICAgICAgICAgICAgcmV0dXJuIGlucHV0ID09IG51bGwgPyB3ZWVrZGF5IDogdGhpcy5hZGQoaW5wdXQgLSB3ZWVrZGF5LCAnZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWtkYXkgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgICAgIC8vIGJlaGF2ZXMgdGhlIHNhbWUgYXMgbW9tZW50I2RheSBleGNlcHRcbiAgICAgICAgICAgIC8vIGFzIGEgZ2V0dGVyLCByZXR1cm5zIDcgaW5zdGVhZCBvZiAwICgxLTcgcmFuZ2UgaW5zdGVhZCBvZiAwLTYpXG4gICAgICAgICAgICAvLyBhcyBhIHNldHRlciwgc3VuZGF5IHNob3VsZCBiZWxvbmcgdG8gdGhlIHByZXZpb3VzIHdlZWsuXG4gICAgICAgICAgICByZXR1cm4gaW5wdXQgPT0gbnVsbCA/IHRoaXMuZGF5KCkgfHwgNyA6IHRoaXMuZGF5KHRoaXMuZGF5KCkgJSA3ID8gaW5wdXQgOiBpbnB1dCAtIDcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzb1dlZWtzSW5ZZWFyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHdlZWtzSW5ZZWFyKHRoaXMueWVhcigpLCAxLCA0KTtcbiAgICAgICAgfSxcblxuICAgICAgICB3ZWVrc0luWWVhciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB3ZWVrSW5mbyA9IHRoaXMubG9jYWxlRGF0YSgpLl93ZWVrO1xuICAgICAgICAgICAgcmV0dXJuIHdlZWtzSW5ZZWFyKHRoaXMueWVhcigpLCB3ZWVrSW5mby5kb3csIHdlZWtJbmZvLmRveSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0IDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB1bml0cyA9IG5vcm1hbGl6ZVVuaXRzKHVuaXRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW3VuaXRzXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldCA6IGZ1bmN0aW9uICh1bml0cywgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciB1bml0O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB1bml0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHVuaXQgaW4gdW5pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQodW5pdCwgdW5pdHNbdW5pdF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHVuaXRzID0gbm9ybWFsaXplVW5pdHModW5pdHMpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpc1t1bml0c10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1t1bml0c10odmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIElmIHBhc3NlZCBhIGxvY2FsZSBrZXksIGl0IHdpbGwgc2V0IHRoZSBsb2NhbGUgZm9yIHRoaXNcbiAgICAgICAgLy8gaW5zdGFuY2UuICBPdGhlcndpc2UsIGl0IHdpbGwgcmV0dXJuIHRoZSBsb2NhbGUgY29uZmlndXJhdGlvblxuICAgICAgICAvLyB2YXJpYWJsZXMgZm9yIHRoaXMgaW5zdGFuY2UuXG4gICAgICAgIGxvY2FsZSA6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHZhciBuZXdMb2NhbGVEYXRhO1xuXG4gICAgICAgICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9jYWxlLl9hYmJyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdMb2NhbGVEYXRhID0gbW9tZW50LmxvY2FsZURhdGEoa2V5KTtcbiAgICAgICAgICAgICAgICBpZiAobmV3TG9jYWxlRGF0YSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvY2FsZSA9IG5ld0xvY2FsZURhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGxhbmcgOiBkZXByZWNhdGUoXG4gICAgICAgICAgICAnbW9tZW50KCkubGFuZygpIGlzIGRlcHJlY2F0ZWQuIEluc3RlYWQsIHVzZSBtb21lbnQoKS5sb2NhbGVEYXRhKCkgdG8gZ2V0IHRoZSBsYW5ndWFnZSBjb25maWd1cmF0aW9uLiBVc2UgbW9tZW50KCkubG9jYWxlKCkgdG8gY2hhbmdlIGxhbmd1YWdlcy4nLFxuICAgICAgICAgICAgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9jYWxlKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApLFxuXG4gICAgICAgIGxvY2FsZURhdGEgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9jYWxlO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9kYXRlVXRjT2Zmc2V0IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gT24gRmlyZWZveC4yNCBEYXRlI2dldFRpbWV6b25lT2Zmc2V0IHJldHVybnMgYSBmbG9hdGluZyBwb2ludC5cbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tb21lbnQvbW9tZW50L3B1bGwvMTg3MVxuICAgICAgICAgICAgcmV0dXJuIC1NYXRoLnJvdW5kKHRoaXMuX2QuZ2V0VGltZXpvbmVPZmZzZXQoKSAvIDE1KSAqIDE1O1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHJhd01vbnRoU2V0dGVyKG1vbSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGRheU9mTW9udGg7XG5cbiAgICAgICAgLy8gVE9ETzogTW92ZSB0aGlzIG91dCBvZiBoZXJlIVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFsdWUgPSBtb20ubG9jYWxlRGF0YSgpLm1vbnRoc1BhcnNlKHZhbHVlKTtcbiAgICAgICAgICAgIC8vIFRPRE86IEFub3RoZXIgc2lsZW50IGZhaWx1cmU/XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb207XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBkYXlPZk1vbnRoID0gTWF0aC5taW4obW9tLmRhdGUoKSxcbiAgICAgICAgICAgICAgICBkYXlzSW5Nb250aChtb20ueWVhcigpLCB2YWx1ZSkpO1xuICAgICAgICBtb20uX2RbJ3NldCcgKyAobW9tLl9pc1VUQyA/ICdVVEMnIDogJycpICsgJ01vbnRoJ10odmFsdWUsIGRheU9mTW9udGgpO1xuICAgICAgICByZXR1cm4gbW9tO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJhd0dldHRlcihtb20sIHVuaXQpIHtcbiAgICAgICAgcmV0dXJuIG1vbS5fZFsnZ2V0JyArIChtb20uX2lzVVRDID8gJ1VUQycgOiAnJykgKyB1bml0XSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJhd1NldHRlcihtb20sIHVuaXQsIHZhbHVlKSB7XG4gICAgICAgIGlmICh1bml0ID09PSAnTW9udGgnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmF3TW9udGhTZXR0ZXIobW9tLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tLl9kWydzZXQnICsgKG1vbS5faXNVVEMgPyAnVVRDJyA6ICcnKSArIHVuaXRdKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1ha2VBY2Nlc3Nvcih1bml0LCBrZWVwVGltZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJhd1NldHRlcih0aGlzLCB1bml0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgbW9tZW50LnVwZGF0ZU9mZnNldCh0aGlzLCBrZWVwVGltZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiByYXdHZXR0ZXIodGhpcywgdW5pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgbW9tZW50LmZuLm1pbGxpc2Vjb25kID0gbW9tZW50LmZuLm1pbGxpc2Vjb25kcyA9IG1ha2VBY2Nlc3NvcignTWlsbGlzZWNvbmRzJywgZmFsc2UpO1xuICAgIG1vbWVudC5mbi5zZWNvbmQgPSBtb21lbnQuZm4uc2Vjb25kcyA9IG1ha2VBY2Nlc3NvcignU2Vjb25kcycsIGZhbHNlKTtcbiAgICBtb21lbnQuZm4ubWludXRlID0gbW9tZW50LmZuLm1pbnV0ZXMgPSBtYWtlQWNjZXNzb3IoJ01pbnV0ZXMnLCBmYWxzZSk7XG4gICAgLy8gU2V0dGluZyB0aGUgaG91ciBzaG91bGQga2VlcCB0aGUgdGltZSwgYmVjYXVzZSB0aGUgdXNlciBleHBsaWNpdGx5XG4gICAgLy8gc3BlY2lmaWVkIHdoaWNoIGhvdXIgaGUgd2FudHMuIFNvIHRyeWluZyB0byBtYWludGFpbiB0aGUgc2FtZSBob3VyIChpblxuICAgIC8vIGEgbmV3IHRpbWV6b25lKSBtYWtlcyBzZW5zZS4gQWRkaW5nL3N1YnRyYWN0aW5nIGhvdXJzIGRvZXMgbm90IGZvbGxvd1xuICAgIC8vIHRoaXMgcnVsZS5cbiAgICBtb21lbnQuZm4uaG91ciA9IG1vbWVudC5mbi5ob3VycyA9IG1ha2VBY2Nlc3NvcignSG91cnMnLCB0cnVlKTtcbiAgICAvLyBtb21lbnQuZm4ubW9udGggaXMgZGVmaW5lZCBzZXBhcmF0ZWx5XG4gICAgbW9tZW50LmZuLmRhdGUgPSBtYWtlQWNjZXNzb3IoJ0RhdGUnLCB0cnVlKTtcbiAgICBtb21lbnQuZm4uZGF0ZXMgPSBkZXByZWNhdGUoJ2RhdGVzIGFjY2Vzc29yIGlzIGRlcHJlY2F0ZWQuIFVzZSBkYXRlIGluc3RlYWQuJywgbWFrZUFjY2Vzc29yKCdEYXRlJywgdHJ1ZSkpO1xuICAgIG1vbWVudC5mbi55ZWFyID0gbWFrZUFjY2Vzc29yKCdGdWxsWWVhcicsIHRydWUpO1xuICAgIG1vbWVudC5mbi55ZWFycyA9IGRlcHJlY2F0ZSgneWVhcnMgYWNjZXNzb3IgaXMgZGVwcmVjYXRlZC4gVXNlIHllYXIgaW5zdGVhZC4nLCBtYWtlQWNjZXNzb3IoJ0Z1bGxZZWFyJywgdHJ1ZSkpO1xuXG4gICAgLy8gYWRkIHBsdXJhbCBtZXRob2RzXG4gICAgbW9tZW50LmZuLmRheXMgPSBtb21lbnQuZm4uZGF5O1xuICAgIG1vbWVudC5mbi5tb250aHMgPSBtb21lbnQuZm4ubW9udGg7XG4gICAgbW9tZW50LmZuLndlZWtzID0gbW9tZW50LmZuLndlZWs7XG4gICAgbW9tZW50LmZuLmlzb1dlZWtzID0gbW9tZW50LmZuLmlzb1dlZWs7XG4gICAgbW9tZW50LmZuLnF1YXJ0ZXJzID0gbW9tZW50LmZuLnF1YXJ0ZXI7XG5cbiAgICAvLyBhZGQgYWxpYXNlZCBmb3JtYXQgbWV0aG9kc1xuICAgIG1vbWVudC5mbi50b0pTT04gPSBtb21lbnQuZm4udG9JU09TdHJpbmc7XG5cbiAgICAvLyBhbGlhcyBpc1V0YyBmb3IgZGV2LWZyaWVuZGxpbmVzc1xuICAgIG1vbWVudC5mbi5pc1VUQyA9IG1vbWVudC5mbi5pc1V0YztcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRHVyYXRpb24gUHJvdG90eXBlXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICBmdW5jdGlvbiBkYXlzVG9ZZWFycyAoZGF5cykge1xuICAgICAgICAvLyA0MDAgeWVhcnMgaGF2ZSAxNDYwOTcgZGF5cyAodGFraW5nIGludG8gYWNjb3VudCBsZWFwIHllYXIgcnVsZXMpXG4gICAgICAgIHJldHVybiBkYXlzICogNDAwIC8gMTQ2MDk3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHllYXJzVG9EYXlzICh5ZWFycykge1xuICAgICAgICAvLyB5ZWFycyAqIDM2NSArIGFic1JvdW5kKHllYXJzIC8gNCkgLVxuICAgICAgICAvLyAgICAgYWJzUm91bmQoeWVhcnMgLyAxMDApICsgYWJzUm91bmQoeWVhcnMgLyA0MDApO1xuICAgICAgICByZXR1cm4geWVhcnMgKiAxNDYwOTcgLyA0MDA7XG4gICAgfVxuXG4gICAgZXh0ZW5kKG1vbWVudC5kdXJhdGlvbi5mbiA9IER1cmF0aW9uLnByb3RvdHlwZSwge1xuXG4gICAgICAgIF9idWJibGUgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbWlsbGlzZWNvbmRzID0gdGhpcy5fbWlsbGlzZWNvbmRzLFxuICAgICAgICAgICAgICAgIGRheXMgPSB0aGlzLl9kYXlzLFxuICAgICAgICAgICAgICAgIG1vbnRocyA9IHRoaXMuX21vbnRocyxcbiAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5fZGF0YSxcbiAgICAgICAgICAgICAgICBzZWNvbmRzLCBtaW51dGVzLCBob3VycywgeWVhcnMgPSAwO1xuXG4gICAgICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGNvZGUgYnViYmxlcyB1cCB2YWx1ZXMsIHNlZSB0aGUgdGVzdHMgZm9yXG4gICAgICAgICAgICAvLyBleGFtcGxlcyBvZiB3aGF0IHRoYXQgbWVhbnMuXG4gICAgICAgICAgICBkYXRhLm1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kcyAlIDEwMDA7XG5cbiAgICAgICAgICAgIHNlY29uZHMgPSBhYnNSb3VuZChtaWxsaXNlY29uZHMgLyAxMDAwKTtcbiAgICAgICAgICAgIGRhdGEuc2Vjb25kcyA9IHNlY29uZHMgJSA2MDtcblxuICAgICAgICAgICAgbWludXRlcyA9IGFic1JvdW5kKHNlY29uZHMgLyA2MCk7XG4gICAgICAgICAgICBkYXRhLm1pbnV0ZXMgPSBtaW51dGVzICUgNjA7XG5cbiAgICAgICAgICAgIGhvdXJzID0gYWJzUm91bmQobWludXRlcyAvIDYwKTtcbiAgICAgICAgICAgIGRhdGEuaG91cnMgPSBob3VycyAlIDI0O1xuXG4gICAgICAgICAgICBkYXlzICs9IGFic1JvdW5kKGhvdXJzIC8gMjQpO1xuXG4gICAgICAgICAgICAvLyBBY2N1cmF0ZWx5IGNvbnZlcnQgZGF5cyB0byB5ZWFycywgYXNzdW1lIHN0YXJ0IGZyb20geWVhciAwLlxuICAgICAgICAgICAgeWVhcnMgPSBhYnNSb3VuZChkYXlzVG9ZZWFycyhkYXlzKSk7XG4gICAgICAgICAgICBkYXlzIC09IGFic1JvdW5kKHllYXJzVG9EYXlzKHllYXJzKSk7XG5cbiAgICAgICAgICAgIC8vIDMwIGRheXMgdG8gYSBtb250aFxuICAgICAgICAgICAgLy8gVE9ETyAoaXNrcmVuKTogVXNlIGFuY2hvciBkYXRlIChsaWtlIDFzdCBKYW4pIHRvIGNvbXB1dGUgdGhpcy5cbiAgICAgICAgICAgIG1vbnRocyArPSBhYnNSb3VuZChkYXlzIC8gMzApO1xuICAgICAgICAgICAgZGF5cyAlPSAzMDtcblxuICAgICAgICAgICAgLy8gMTIgbW9udGhzIC0+IDEgeWVhclxuICAgICAgICAgICAgeWVhcnMgKz0gYWJzUm91bmQobW9udGhzIC8gMTIpO1xuICAgICAgICAgICAgbW9udGhzICU9IDEyO1xuXG4gICAgICAgICAgICBkYXRhLmRheXMgPSBkYXlzO1xuICAgICAgICAgICAgZGF0YS5tb250aHMgPSBtb250aHM7XG4gICAgICAgICAgICBkYXRhLnllYXJzID0geWVhcnM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWJzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzID0gTWF0aC5hYnModGhpcy5fbWlsbGlzZWNvbmRzKTtcbiAgICAgICAgICAgIHRoaXMuX2RheXMgPSBNYXRoLmFicyh0aGlzLl9kYXlzKTtcbiAgICAgICAgICAgIHRoaXMuX21vbnRocyA9IE1hdGguYWJzKHRoaXMuX21vbnRocyk7XG5cbiAgICAgICAgICAgIHRoaXMuX2RhdGEubWlsbGlzZWNvbmRzID0gTWF0aC5hYnModGhpcy5fZGF0YS5taWxsaXNlY29uZHMpO1xuICAgICAgICAgICAgdGhpcy5fZGF0YS5zZWNvbmRzID0gTWF0aC5hYnModGhpcy5fZGF0YS5zZWNvbmRzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEubWludXRlcyA9IE1hdGguYWJzKHRoaXMuX2RhdGEubWludXRlcyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLmhvdXJzID0gTWF0aC5hYnModGhpcy5fZGF0YS5ob3Vycyk7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLm1vbnRocyA9IE1hdGguYWJzKHRoaXMuX2RhdGEubW9udGhzKTtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEueWVhcnMgPSBNYXRoLmFicyh0aGlzLl9kYXRhLnllYXJzKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgd2Vla3MgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gYWJzUm91bmQodGhpcy5kYXlzKCkgLyA3KTtcbiAgICAgICAgfSxcblxuICAgICAgICB2YWx1ZU9mIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX21pbGxpc2Vjb25kcyArXG4gICAgICAgICAgICAgIHRoaXMuX2RheXMgKiA4NjRlNSArXG4gICAgICAgICAgICAgICh0aGlzLl9tb250aHMgJSAxMikgKiAyNTkyZTYgK1xuICAgICAgICAgICAgICB0b0ludCh0aGlzLl9tb250aHMgLyAxMikgKiAzMTUzNmU2O1xuICAgICAgICB9LFxuXG4gICAgICAgIGh1bWFuaXplIDogZnVuY3Rpb24gKHdpdGhTdWZmaXgpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSByZWxhdGl2ZVRpbWUodGhpcywgIXdpdGhTdWZmaXgsIHRoaXMubG9jYWxlRGF0YSgpKTtcblxuICAgICAgICAgICAgaWYgKHdpdGhTdWZmaXgpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSB0aGlzLmxvY2FsZURhdGEoKS5wYXN0RnV0dXJlKCt0aGlzLCBvdXRwdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhbGVEYXRhKCkucG9zdGZvcm1hdChvdXRwdXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFkZCA6IGZ1bmN0aW9uIChpbnB1dCwgdmFsKSB7XG4gICAgICAgICAgICAvLyBzdXBwb3J0cyBvbmx5IDIuMC1zdHlsZSBhZGQoMSwgJ3MnKSBvciBhZGQobW9tZW50KVxuICAgICAgICAgICAgdmFyIGR1ciA9IG1vbWVudC5kdXJhdGlvbihpbnB1dCwgdmFsKTtcblxuICAgICAgICAgICAgdGhpcy5fbWlsbGlzZWNvbmRzICs9IGR1ci5fbWlsbGlzZWNvbmRzO1xuICAgICAgICAgICAgdGhpcy5fZGF5cyArPSBkdXIuX2RheXM7XG4gICAgICAgICAgICB0aGlzLl9tb250aHMgKz0gZHVyLl9tb250aHM7XG5cbiAgICAgICAgICAgIHRoaXMuX2J1YmJsZSgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJ0cmFjdCA6IGZ1bmN0aW9uIChpbnB1dCwgdmFsKSB7XG4gICAgICAgICAgICB2YXIgZHVyID0gbW9tZW50LmR1cmF0aW9uKGlucHV0LCB2YWwpO1xuXG4gICAgICAgICAgICB0aGlzLl9taWxsaXNlY29uZHMgLT0gZHVyLl9taWxsaXNlY29uZHM7XG4gICAgICAgICAgICB0aGlzLl9kYXlzIC09IGR1ci5fZGF5cztcbiAgICAgICAgICAgIHRoaXMuX21vbnRocyAtPSBkdXIuX21vbnRocztcblxuICAgICAgICAgICAgdGhpcy5fYnViYmxlKCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldCA6IGZ1bmN0aW9uICh1bml0cykge1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1t1bml0cy50b0xvd2VyQ2FzZSgpICsgJ3MnXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFzIDogZnVuY3Rpb24gKHVuaXRzKSB7XG4gICAgICAgICAgICB2YXIgZGF5cywgbW9udGhzO1xuICAgICAgICAgICAgdW5pdHMgPSBub3JtYWxpemVVbml0cyh1bml0cyk7XG5cbiAgICAgICAgICAgIGlmICh1bml0cyA9PT0gJ21vbnRoJyB8fCB1bml0cyA9PT0gJ3llYXInKSB7XG4gICAgICAgICAgICAgICAgZGF5cyA9IHRoaXMuX2RheXMgKyB0aGlzLl9taWxsaXNlY29uZHMgLyA4NjRlNTtcbiAgICAgICAgICAgICAgICBtb250aHMgPSB0aGlzLl9tb250aHMgKyBkYXlzVG9ZZWFycyhkYXlzKSAqIDEyO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bml0cyA9PT0gJ21vbnRoJyA/IG1vbnRocyA6IG1vbnRocyAvIDEyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUgbWlsbGlzZWNvbmRzIHNlcGFyYXRlbHkgYmVjYXVzZSBvZiBmbG9hdGluZyBwb2ludCBtYXRoIGVycm9ycyAoaXNzdWUgIzE4NjcpXG4gICAgICAgICAgICAgICAgZGF5cyA9IHRoaXMuX2RheXMgKyBNYXRoLnJvdW5kKHllYXJzVG9EYXlzKHRoaXMuX21vbnRocyAvIDEyKSk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh1bml0cykge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd3ZWVrJzogcmV0dXJuIGRheXMgLyA3ICsgdGhpcy5fbWlsbGlzZWNvbmRzIC8gNjA0OGU1O1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkYXknOiByZXR1cm4gZGF5cyArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDg2NGU1O1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdob3VyJzogcmV0dXJuIGRheXMgKiAyNCArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDM2ZTU7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21pbnV0ZSc6IHJldHVybiBkYXlzICogMjQgKiA2MCArIHRoaXMuX21pbGxpc2Vjb25kcyAvIDZlNDtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2Vjb25kJzogcmV0dXJuIGRheXMgKiAyNCAqIDYwICogNjAgKyB0aGlzLl9taWxsaXNlY29uZHMgLyAxMDAwO1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXRoLmZsb29yIHByZXZlbnRzIGZsb2F0aW5nIHBvaW50IG1hdGggZXJyb3JzIGhlcmVcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbWlsbGlzZWNvbmQnOiByZXR1cm4gTWF0aC5mbG9vcihkYXlzICogMjQgKiA2MCAqIDYwICogMTAwMCkgKyB0aGlzLl9taWxsaXNlY29uZHM7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignVW5rbm93biB1bml0ICcgKyB1bml0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGxhbmcgOiBtb21lbnQuZm4ubGFuZyxcbiAgICAgICAgbG9jYWxlIDogbW9tZW50LmZuLmxvY2FsZSxcblxuICAgICAgICB0b0lzb1N0cmluZyA6IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICd0b0lzb1N0cmluZygpIGlzIGRlcHJlY2F0ZWQuIFBsZWFzZSB1c2UgdG9JU09TdHJpbmcoKSBpbnN0ZWFkICcgK1xuICAgICAgICAgICAgJyhub3RpY2UgdGhlIGNhcGl0YWxzKScsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKSxcblxuICAgICAgICB0b0lTT1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGluc3BpcmVkIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9kb3JkaWxsZS9tb21lbnQtaXNvZHVyYXRpb24vYmxvYi9tYXN0ZXIvbW9tZW50Lmlzb2R1cmF0aW9uLmpzXG4gICAgICAgICAgICB2YXIgeWVhcnMgPSBNYXRoLmFicyh0aGlzLnllYXJzKCkpLFxuICAgICAgICAgICAgICAgIG1vbnRocyA9IE1hdGguYWJzKHRoaXMubW9udGhzKCkpLFxuICAgICAgICAgICAgICAgIGRheXMgPSBNYXRoLmFicyh0aGlzLmRheXMoKSksXG4gICAgICAgICAgICAgICAgaG91cnMgPSBNYXRoLmFicyh0aGlzLmhvdXJzKCkpLFxuICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSBNYXRoLmFicyh0aGlzLm1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgICAgc2Vjb25kcyA9IE1hdGguYWJzKHRoaXMuc2Vjb25kcygpICsgdGhpcy5taWxsaXNlY29uZHMoKSAvIDEwMDApO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuYXNTZWNvbmRzKCkpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIHRoZSBzYW1lIGFzIEMjJ3MgKE5vZGEpIGFuZCBweXRob24gKGlzb2RhdGUpLi4uXG4gICAgICAgICAgICAgICAgLy8gYnV0IG5vdCBvdGhlciBKUyAoZ29vZy5kYXRlKVxuICAgICAgICAgICAgICAgIHJldHVybiAnUDBEJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLmFzU2Vjb25kcygpIDwgMCA/ICctJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgJ1AnICtcbiAgICAgICAgICAgICAgICAoeWVhcnMgPyB5ZWFycyArICdZJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKG1vbnRocyA/IG1vbnRocyArICdNJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgKGRheXMgPyBkYXlzICsgJ0QnIDogJycpICtcbiAgICAgICAgICAgICAgICAoKGhvdXJzIHx8IG1pbnV0ZXMgfHwgc2Vjb25kcykgPyAnVCcgOiAnJykgK1xuICAgICAgICAgICAgICAgIChob3VycyA/IGhvdXJzICsgJ0gnIDogJycpICtcbiAgICAgICAgICAgICAgICAobWludXRlcyA/IG1pbnV0ZXMgKyAnTScgOiAnJykgK1xuICAgICAgICAgICAgICAgIChzZWNvbmRzID8gc2Vjb25kcyArICdTJyA6ICcnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBsb2NhbGVEYXRhIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsZTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b0pTT04gOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0lTT1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBtb21lbnQuZHVyYXRpb24uZm4udG9TdHJpbmcgPSBtb21lbnQuZHVyYXRpb24uZm4udG9JU09TdHJpbmc7XG5cbiAgICBmdW5jdGlvbiBtYWtlRHVyYXRpb25HZXR0ZXIobmFtZSkge1xuICAgICAgICBtb21lbnQuZHVyYXRpb24uZm5bbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZGF0YVtuYW1lXTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmb3IgKGkgaW4gdW5pdE1pbGxpc2Vjb25kRmFjdG9ycykge1xuICAgICAgICBpZiAoaGFzT3duUHJvcCh1bml0TWlsbGlzZWNvbmRGYWN0b3JzLCBpKSkge1xuICAgICAgICAgICAgbWFrZUR1cmF0aW9uR2V0dGVyKGkudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNaWxsaXNlY29uZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdtcycpO1xuICAgIH07XG4gICAgbW9tZW50LmR1cmF0aW9uLmZuLmFzU2Vjb25kcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3MnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc01pbnV0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdtJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNIb3VycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ2gnKTtcbiAgICB9O1xuICAgIG1vbWVudC5kdXJhdGlvbi5mbi5hc0RheXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdkJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNXZWVrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3dlZWtzJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNNb250aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFzKCdNJyk7XG4gICAgfTtcbiAgICBtb21lbnQuZHVyYXRpb24uZm4uYXNZZWFycyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXMoJ3knKTtcbiAgICB9O1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBEZWZhdWx0IExvY2FsZVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLy8gU2V0IGRlZmF1bHQgbG9jYWxlLCBvdGhlciBsb2NhbGUgd2lsbCBpbmhlcml0IGZyb20gRW5nbGlzaC5cbiAgICBtb21lbnQubG9jYWxlKCdlbicsIHtcbiAgICAgICAgb3JkaW5hbFBhcnNlOiAvXFxkezEsMn0odGh8c3R8bmR8cmQpLyxcbiAgICAgICAgb3JkaW5hbCA6IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICAgICAgICAgIHZhciBiID0gbnVtYmVyICUgMTAsXG4gICAgICAgICAgICAgICAgb3V0cHV0ID0gKHRvSW50KG51bWJlciAlIDEwMCAvIDEwKSA9PT0gMSkgPyAndGgnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMSkgPyAnc3QnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMikgPyAnbmQnIDpcbiAgICAgICAgICAgICAgICAoYiA9PT0gMykgPyAncmQnIDogJ3RoJztcbiAgICAgICAgICAgIHJldHVybiBudW1iZXIgKyBvdXRwdXQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qIEVNQkVEX0xPQ0FMRVMgKi9cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRXhwb3NpbmcgTW9tZW50XG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgZnVuY3Rpb24gbWFrZUdsb2JhbChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgLypnbG9iYWwgZW5kZXI6ZmFsc2UgKi9cbiAgICAgICAgaWYgKHR5cGVvZiBlbmRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvbGRHbG9iYWxNb21lbnQgPSBnbG9iYWxTY29wZS5tb21lbnQ7XG4gICAgICAgIGlmIChzaG91bGREZXByZWNhdGUpIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IGRlcHJlY2F0ZShcbiAgICAgICAgICAgICAgICAgICAgJ0FjY2Vzc2luZyBNb21lbnQgdGhyb3VnaCB0aGUgZ2xvYmFsIHNjb3BlIGlzICcgK1xuICAgICAgICAgICAgICAgICAgICAnZGVwcmVjYXRlZCwgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiBhbiB1cGNvbWluZyAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3JlbGVhc2UuJyxcbiAgICAgICAgICAgICAgICAgICAgbW9tZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IG1vbWVudDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvbW1vbkpTIG1vZHVsZSBpcyBkZWZpbmVkXG4gICAgaWYgKGhhc01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1vbWVudDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkge1xuICAgICAgICAgICAgaWYgKG1vZHVsZS5jb25maWcgJiYgbW9kdWxlLmNvbmZpZygpICYmIG1vZHVsZS5jb25maWcoKS5ub0dsb2JhbCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgdGhlIGdsb2JhbCB2YXJpYWJsZVxuICAgICAgICAgICAgICAgIGdsb2JhbFNjb3BlLm1vbWVudCA9IG9sZEdsb2JhbE1vbWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG1vbWVudDtcbiAgICAgICAgfSk7XG4gICAgICAgIG1ha2VHbG9iYWwodHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWFrZUdsb2JhbCgpO1xuICAgIH1cbn0pLmNhbGwodGhpcyk7XG4iXX0=
