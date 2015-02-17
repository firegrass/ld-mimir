// all I want to do initially, as a test, is get a list of files... 

var request = require('browser-request');
var vfsRoot = window.location.protocol + "//" + window.location.host + "/vfs";
var sockRoot = window.location.protocol + "//" + window.location.host + "/comms"
var broker = new (require('events')).EventEmitter();
var domify = require('domify');
var marked = require('marked');
var Delegate = require('dom-delegate').Delegate;

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

function deleteChildren (node){
  var fn = function (){ this.remove(); this.onclick = null; };
  var fns = [];
  forEach.call( node.childNodes , function (node){ 
    fns.push(fn.bind(node))
  });
  forEach.call(fns, function(fn){fn()});
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
  /*
    POST is used for various adhoc commands that are useful but don't fit well into the RESTful paradigm. The client sends a JSON body containing the request information.

    Currently this includes:

    {"renameFrom": from} - rename a file from from to target.
    {"copyFrom": from} - copy a file from from to target.
    {"linkTo": data} - create a symlink at target containing data.
  */

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

    /*

     editor.renderer.scroller.getBoundingClientRect()

    */

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

function renderCurrentDirectory(data){

  var container = files;
  deleteChildren(container);

  var li = document.createElement('li');
  var h3 = document.createElement('h3');
  li.appendChild(h3)
  insertText(h3, data.name);
  container.appendChild(li);

  if (data.parent && data.parent.name){

    var li = document.createElement('li');
    var a = document.createElement('a');
    li.appendChild(a)

    insertText(a, 'Back up to ' + data.parent.name );
    a.onclick = loadDirectory.bind({}, data.parent.href);
    container.appendChild(li);
  }

  for (var child in data.children){
    if (data.children.hasOwnProperty(child)){
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.setAttribute('href', '#');
      insertText(a, data.children[child].name);
      li.onmouseup = loadDirectory.bind({}, data.children[child].href, data.children[child], a);
      li.appendChild(domify('<span class="typcn typcn-folder"><span>'))
      li.appendChild(a);
      container.appendChild(li);
    }
  }

  data.entities.forEach(function (entity){

    var li = document.createElement('li');
    var a = document.createElement('a');
    a.setAttribute('href', '#');
    insertText(a, entity.name);
    li.onmouseup = editFile.bind({}, entity, a);
    li.appendChild(domify('<span class="typcn typcn-document-text"><span>'))
    li.appendChild(a);
    container.appendChild(li);

  })

}

loadDirectory(fileSystem.children.root.href);
