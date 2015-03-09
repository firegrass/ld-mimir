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
  '   <div>' + o.message + '</div>' +
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