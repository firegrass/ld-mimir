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

