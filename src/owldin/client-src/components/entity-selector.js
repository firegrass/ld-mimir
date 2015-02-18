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
    return '<li>' +
        '<span class="typcn typcn-document-text"></span>' +
        '<a href="#">' + 
          o.name +
        '</a>' +
      '</li>';
  }

  function folderT (o){
    return '<li >' +
        '<span class="typcn typcn-folder"></span>' +
        '<a href="#">' + 
          o.name + 
        '</a>' +
      '</li>';

  }

  function refreshTree (tree){

    //deleteChildren(files);

    dom('li', files).remove();
    var $files = dom(files);

    $files.append(domify('<h3>Project root</h3>'))

    function showContents (tree, $parent, level){

      tree.forEach(function (entity){

        var el, $a, $ul = false;

        if (entity.type === "file"){

          el = domify(fileT(entity));
          $a = dom('a', el);

          $a.on('mouseup', (function(entity, $el, event){

            if (event.which === 1){

              app.emit('open-entity', entity.path);

            } else if (event.which === 3){

              fileContextMenu(entity, $el);

            }

          }).bind({}, entity, dom(el)))

        } else if (entity.type === "folder"){

          el = domify(folderT(entity));
          $a = dom('a', el);
          
          $ul = dom('<ul class="level-' + (level + 1)+ '"></ul>');

          showContents(entity.contents, $ul, level + 1);

        }

        $parent.append(el);
        if ($ul){
          $parent.append($ul);
        }

      });

    }

    showContents(tree, $files, 0);

  }

  function fileContextMenu(entity, $el){

    debugger;

  }


/*
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

*/

};