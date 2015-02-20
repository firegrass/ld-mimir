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
        '<span class="typcn typcn-hover typcn-info-large"></span>' + 
        '<span class="typcn typcn-hover typcn-trash"></span>' + 
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
        '<span class="typcn typcn-hover typcn-trash"></span>' + 
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

          $a.on('mouseup', (function(entity, $el, event){

            if (event.which === 1){

              app.emit('edit-entity', entity.path);

            } else if (event.which === 3){

              fileContextMenu(entity, $el);

            }

          }).bind({}, entity, dom(el)))

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

    debugger;

  }

};