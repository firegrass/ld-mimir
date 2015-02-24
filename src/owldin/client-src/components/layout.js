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