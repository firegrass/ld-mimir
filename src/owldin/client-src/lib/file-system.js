var request = require('browser-request');
var Gather = require('gm-gather');
var cloneDeep = require('clone-deep');

var console = require('../components/console.js');

module.exports.initialiseFileSystem = function initialiseFileSystem (app, vfsRoot){

  var system = new (require('events')).EventEmitter;

  // global application events... 
  app.on('remote-entity-update', function (msg){

    app.emit('entity-updated', 'update', msg.path);

    loadFileSystem(data.children.root.href, function (err){

      if (!err){

        console.log('Remote file system synchronised');

        app.emit('sync', data.children.root.relPath);

      } else {

        app.emit('sync-error', 'Unable to synchronise with remote file system', err);

      }

    });

  });

  app.on('remote-entity-create', function (msg){

    app.emit('entity-updated', 'create', msg.path);

    // you know, 

    loadFileSystem(data.children.root.href, function (err){

      if (!err){

        console.log('Remote file system synchronised');

        app.emit('sync', data.children.root.relPath);

      } else {

        app.emit('sync-error', 'Unable to synchronise with remote file system', err);

      }

    });

  });

  app.on('remote-entity-delete', function (msg){

    app.emit('entity-updated', 'delete', msg.path);

    loadFileSystem(data.children.root.href, function (err){

      if (!err){

        console.log('Remote file system synchronised');

        app.emit('sync', data.children.root.relPath);

      } else {

        app.emit('sync-error', 'Unable to synchronise with remote file system', err);

      }

    });

  });


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

  system.readFile = function readFile (path, fn){

    var entity = entityLookup[path];

    request(entity.href, function (err, response){

      //var headers = response.getAllResponseHeaders();

      if (!err){

        var body = response.body;

        request(vfsRoot + entity.parent, function (err, response){

          if (!err){
            var meta = JSON.parse(response.body);
            for (var i = 0; i < meta.length; i++){
              if (meta[i].name === entity.name){
                entity.mime = meta[i].mime;
                entity.size = meta[i].size;
                entity.mtime = meta[i].mtime;
                fn (false, entity, body);
                break;
              }
            }
          } else {
            fn (err, entity);
          }

        });

      } else {
        fn (err, entity);
      }

    });

  };

  system.readFileAsBase64 = function readFileAsBase64 (path, fn){

    var entity = entityLookup[path];

    // have to go grizzly for this...

    var xhr = new XMLHttpRequest();
    xhr.open('GET', entity.href, true);
    xhr.responseType = 'blob';
    xhr.onload = function (){

      var blob = xhr.response;
      var body = URL.createObjectURL(blob);

      request(vfsRoot + entity.parent, function (err, response){

        if (!err){
          var meta = JSON.parse(response.body);
          for (var i = 0; i < meta.length; i++){
            if (meta[i].name === entity.name){
              entity.mime = meta[i].mime;
              entity.size = meta[i].size;
              entity.mtime = meta[i].mtime;
              fn (false, entity, body);
              break;
            }
          }
        } else {
          fn (err, entity);
        }

      });

    }
    xhr.onerror = function (){
      fn (response.status, entity);
    }

    xhr.send();

  }



  system.writeFile = function writeFile(path, body, fn){

    var entity = entityLookup[path];

    if (entity){

      request.put({ uri : entity.href, body : body}, function (err, response){
        if (!err){
          fn (false, entity);
          app.emit('entity-updated', 'update', path);
        } else {
          fn (err);
        }
      });

    } else {

      request.put({ uri : vfsRoot + path, body : body}, function (err, response){
        if (!err){

          var p = path.split('/'); var name = p.pop(); p.shift(); 
          var folder = "/" + p.join('/');

          request.get(vfsRoot + folder, function (err, response){

            var ref = getDirectoryReference(folder);

            var body = JSON.parse(response.body);
            var entity = false;

            for (var i = 0; i < body.length; i++){
              if (body[i].name === name){
                entity = body[i];
                break;
              }
            }

            entityLookup[path] = entity;

            ref.entities.push(entity);

            fn (false, entity);
            app.emit('sync', data.children.root.relPath);
            app.emit('entity-updated', 'update', path);


          });


        } else {
          fn (err);
        }

      });

    }

  };

  system.renameFile = function renameFile (path, newName, fn){

    var entity = entityLookup[path];

    var oldPath = entity.relPath;
    var newPath = entity.href.replace(entity.name, newName);

    request({ method: 'POST', url : newPath, json : { renameFrom : oldPath }}, function (err, response, body){
      // load new metadata... 
      if (response.status === 200){
        var newEntity = cloneDeep(entity);
        newEntity.relPath = newPath.replace(vfsRoot, '');
        newEntity.href = newPath;
        newEntity.name = newName;

        delete entityLookup[path];

        entityLookup[newEntity.relPath] = newEntity;

        fn (false, newEntity, entity);
      } else {
        fn (err);
      }
      //fn(err, newName, entity.name );

    });
  };

  system.deleteFile = function deleteFile (path, fn){

    var entity = entityLookup[path];

    request({ method : 'delete', url : entity.href}, function (err, response){

      fn(err);

    })

  };

  system.readFolder = function readFolder (path, fn){

  };

  system.writeFolder = function writeFolder (path, newFolderName, fn){

    var entity = entityLookup[path];

    var newPath = entity.href + "/" + newFolderName + "/";

    request({ method: 'put', url : newPath}, function (err, response){

      fn (err, newFolderName);

    });

  };

  system.createFile = function writeFolder (path, newFileName, fn){

    var entity = entityLookup[path];

    var newPath = entity.href + "/" + newFileName;

    request({ method: 'put', url : newPath}, function (err, response){

      fn (err, newFileName);

    });

  };

  system.renameFolder = function renameFolder (path, newName, fn){

    var entity = entityLookup[path];

    var newPath = entity.href.replace(entity.name + "/", newName);
    var oldPath = entity.relPath;

    request({ method : 'POST', url : newPath, json : {renameFrom : oldPath}}, function (err, response, body){
      fn (err, newName, entity.name);
    });
/*
  var uri = currentPath.replace(oldFolderName, newFolderName);

  var oldUri = currentPath.replace(vfsRoot, '');

  request({ method: 'POST', url: uri, json : { renameFrom : oldUri}}, function (err, response, body){
    loadDirectory(activeDirectory);
  });
*/

  };

  system.deleteFolder = function deleteFolder (path, fn){

    var entity = entityLookup[path];

    request({ method : 'delete', url : entity.href}, function (err, response){

      fn(err);

    });

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
          mime : node.entities[i].mime,
          mtime : node.entities[i].mtime,
          size : node.entities[i].size,
          parent : node.relPath
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

      app.emit('sync', data.children.root.relPath);

    } else {

      app.emit('sync-error', 'Unable to synchronise with remote file system', err);

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
        entity.parent = path.replace(vfsRoot, '');
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

    entityLookup['/'] = data.children.root;
  }

  return system;

}



/*

  - Status one: Nothing is loaded.
  - Status two: 

*/