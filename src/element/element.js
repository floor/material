import css from '../module/css';


export default class Element {

  constructor(options) {

    this._render(options, 0);

    return this;
  }

  _render(options, level) {
    console.log('render', level, options.tag);

    options.name = options.name || element;

    level++;

    var tag = options.tag || 'div';
    var element = document.createElement(tag);

    if (options.attribute) {
      this._attribute(element, options.attribute);
    }

    if (level === 1) {
      this.container = element;
      this.name = options.name;
      css.add(element, 'material-' + this.name);
    } else {
      this[options.name] = element;
      css.add(element, this.name + '-' + options.name);
    }

    if (options.container) {
      options.container.appendChild(element);
    }

    if (options.elements) {
      for (var i = 0, len = options.elements.length; i < len; i++) {
        var o = options.elements[i];
        o.container = element;
        this._render(o, level);
      }
    }

    return this;
  }

  _attribute(element, attribute) {
    for (var key in attribute) {
      if (attribute.hasOwnProperty(key)) {
        element.setAttribute(key, attribute[key]);
      }
    }

    return element;
  }
};