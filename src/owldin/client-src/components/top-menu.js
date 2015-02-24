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