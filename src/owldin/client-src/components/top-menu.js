var dom = require('green-mesa-dom');

module.exports = function (app, box){

  var $menu = dom('' + 
    '<ul class="box-inner menu-content">' +
    '<li><span class="typcn typcn-th-menu"></span>' + 
      '<ul>' + 
        '<li><a href="#" rel="rels/save-file"><span class="typcn typcn-arrow-sync"></span>Save all</a></li>' + 
        '<li><a href="#" rel="rels/commit-session"><span class="typcn typcn-arrow-sync"></span>Commit</a></li>' + 
        '<li><a href="#" rel="rels/new-terminal"><span class="typcn typcn-device-desktop"></span>New Terminal</a></li>' + 
        '<li><a href="#" rel="rels/new-command"><span class="typcn typcn-spanner"></span>Run command</a></li>' + 
      '</ul>' + 
    '</li>' +
  '</ul>');

  $menu.appendTo(box.element);

  dom('a[rel="rels/save-file"]', $menu).on('click', function (e){

    e.preventDefault();
    app.emit('save-entity');

  });

  dom('a[rel="rels/commit-session"]', $menu).on('click', function (e){

    e.preventDefault();
    app.emit('new-commit-session');

  });

  dom('a[rel="rels/new-terminal"]', $menu).on('click', function (e){

    e.preventDefault();
    app.emit('new-terminal-session');

  });

  dom('a[rel="rels/new-command"]', $menu).on('click', function (e){

    e.preventDefault();
    app.emit('new-command-session');

  });

}