function render(options, parent, level) {

  level = level++ || 1;

  var tag = options.tag || 'div';
  var element = document.createElement(tag);

  if (parent) {
    parent.appendChild(element);
  }

  // this._initPosition(element, options.position);
  // this._initStyles(element, options.styles);
  // this._initDisplay(element, options.display, options.direction);

  if (options.elements) {
    for (var i = 0, len = options.elements.length; i < len; i++) {
      var o = options.elements[i];
      return render(options, parent, level);
    }
  }
}

export default render;