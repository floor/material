/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module !== 'undefined') module.exports = definition();
  else if (typeof define === 'function' && typeof define.amd === 'object') define(definition);
  else this[name] = definition();

}('domready', function () {

  var fns = [];
  var listener;
  var doc = document;
  var hack = doc.documentElement.doScroll;
  var domContentLoaded = 'DOMContentLoaded';
  var loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState);


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener);
    loaded = 1;
    while (listener = fns.shift()) listener()
  });

  return function (fn) {
    loaded ? setTimeout(fn, 0) : fns.push(fn);
  };

});

