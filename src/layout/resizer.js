'use strict';

var Component = require("../component");
var element = require("../module/element");
var DragDrop = require("material/dist/vendor/dragdrop");

var resize = {

  /**
   * _initResizeBorder description
   * @param  {component} component [description]
   */
  _initResizer(component) {
    var name = component.options.name;

    var container = component.container || component.options.container;
    var direction = this._initResizerDirection(container);
    var modifier = this.options.resizer.modifier[direction];

    if (!direction || !modifier || !container) {
      return;
    }

    var resizer = this.resizer[name] = new Component({
      tag: 'div.ui-resizer'
    }).insert(container);

    resizer.setAttribute('data-name', name);

    if (modifier.size) {
      resizer.addClass('resizer-' + modifier.size);
    }

    this._initResizerDrag(resizer, modifier, component);
    this._initResizerEvent(component, resizer, modifier);
  },

  /**
   * _initResizerDirection - description
   *
   * @param  {type} container description
   * @return {type}           description
   */
  _initResizerDirection(container) {
    var direction;

    var isColumn = container.className.match(new RegExp('(\\s|^)flex-column(\\s|$)'));
    var isRaw = container.className.match(new RegExp('(\\s|^)flex-raw(\\s|$)'));

    if (isColumn) {
      direction = 'column';
    } else if (isRaw) {
      direction = 'row';
    }

    return direction;
  },

  /**
   * _initResizerDrag
   */
  _initResizerDrag(resizer, modifier, component) {


    // the last statement is temporary before i fix the component correctly


    var draggable = DragDrop.bind(resizer.element, {
      //anchor: anotherElement,
      boundingBox: 'offsetParent',
      dragstart: (ev) => {
        //console.log('dragstart', ev);
        //this.emit('resizeStart', component);
        //self.mask.style('display', 'block');
      },
      dragend: (ev) => {
        this.emit('drag', ev);
        this._onDrag(resizer, modifier, component, true);
      },
      drag: () => {
        this._onDrag(resizer, modifier, component);
      }
    });

    return draggable;
  },


  /**
   * [_onDrag description]
   */
  _onDrag(resizer, modifier, component, end) {
    //self.mask.style('display', 'block');
    var from = modifier.from;
    var size = modifier.size;
    var container = component.container;
    var last = component.options.last;
    var style = {};
    let coord = {};

    let c = {};
    c[from] = resizer.offset(from);
    coord[from] = component.offset(from);

    var value;

    if (last) {
      var csize = element.offset(container, size);
      value = csize - c[from];
      style[size] = csize - c[from] + 'px';
      //console.log('resize', component, style);
      component.style(style);
    } else {
      value = c[from] - coord[from]
      style[size] = (c[from] - coord[from]) + 'px';
      component.style(style);
    }

    // console.log('settings', component.name, size, value, this.options.appname, this.options.name, component.name);



    if (end) {

      var settings = {
        key: 'app-' + this.options.appname,
        value: {},
        layout: {
          section: {}
        }
      };

      settings.value.layout.section[component.name] = {};
      settings.value.layout.section[component.name][size] = value;

      this.controller.publish('settings', settings);
    }
    //this._updateSize(component, resizer, modifier);
    this.emit('drag');
  },

  /**
   * [_onDrag description]
   */
  _onDrag(resizer, modifier, component) {
    //self.mask.style('display', 'block');
    var from = modifier.from;
    var size = modifier.size;
    var container = component.container;
    var last = component.options.last;
    var style = {};
    let coord = {};

    let c = {};
    c[from] = resizer.offset(from);
    coord[from] = component.offset(from);

    var value;

    if (last) {
      var csize = element.offset(container, size);
      value = csize - c[from];
      style[size] = csize - c[from] + 'px';
      //console.log('resize', component, style);
      component.style(style);
    } else {
      value = c[from] - coord[from]
      style[size] = (c[from] - coord[from]) + 'px';
      component.style(style);
    }

    // console.log('settings', component.name, size, value, this.options.appname, this.options.name, component.name);
    var name = this.options

    var settings = {};
    settings = {
      key: 'app-' + this.options.appname,
    }

    settings.value = {
      layout: {
        section: {}
      }
    };

    settings.value.layout.section[component.name] = {};
    settings.value.layout.section[component.name][size] = value;

    this.controller.publish('settings', settings);

    //this._updateSize(component, resizer, modifier);
    this.emit('drag');
  },

  /**
   * [_initResizerEvent description]
   * @param  {component} component [description]
   * @param  {element} resizer   [description]
   * @param  {string} modifier  [description]
   */
  _initResizerEvent(component, resizer, modifier) {

    resizer.on('click', (e) => { e.stopPropagation(); });
    resizer.on('mousedown', (e) => { e.stopPropagation(); });
    resizer.on('mouseup', (e) => { e.stopPropagation(); });

    this.on('drag', () => { this._updateSize(component, resizer, modifier); });
    this.on('maximize', () => { this._updateSize(component, resizer, modifier); });
    this.on('normalize', () => { this._updateSize(component, resizer, modifier); });
    this.on('resize', () => { this._updateSize(component, resizer, modifier); });
  },

  /**
   * _updateSize
   * @param  {component} component [description]
   * @param  {element} resizer   [description]
   * @param  {string} modifier  [description]
   */
  _updateSize(component, resizer, modifier) {
    var container = component.container;
    var from = modifier.from;
    var size = modifier.size;
    var style = {};
    var coord = {};

    coord[from] = component.offset(from);
    coord[size] = component.offset(size);

    // for the last component
    // the resizer is on the left or on the top
    if (component.options.last) {
      var csize = element.offset(container, size);
      style[from] = csize - coord[size] - 3 + 'px';
      resizer.style(style);
    } else {
      style[from] = coord[from] + coord[size] - 3 + 'px';
      resizer.style(style);
    }

    this.emit('size');
  }
};

module.exports = resize;
