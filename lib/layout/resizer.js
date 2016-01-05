'use strict';

var Component = require("../component");
var DragDrop = require("../module/dragdrop");

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

		resizer.attribute('data-name', name);

		if (modifier.size) {
			resizer.addClass('resizer-'+ modifier.size);
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
	_initResizerDirection(container){
		var direction;

		if (container.hasClass('flex-column')) {
			direction = 'column';
		} else if (container.hasClass('flex-raw')) {
			direction = 'row';
		}

		return direction;
	},

	/**
	 * _initResizerDrag
	 */
	_initResizerDrag(resizer, modifier, component) {


		var self = this;

		var element = component.element;
		var from = modifier.from;
		var size = modifier.size;

		// the last statement is temporary before i fix the component correctly
		var container = component.container;
		var last = component.options.last;

		var draggable = DragDrop.bind(resizer.element, {
		    //anchor: anotherElement,
		    boundingBox: 'offsetParent',
		    dragstart: (ev) => {
		    	console.log('dragstart', ev);
				//this.emit('resizeStart', component);
				//self.mask.style('display', 'block');
			},
			dragend: (ev) => {
		    	console.log('dragend');
				//this.emit('resizeEnd', ev);
			},
		  	drag: (ev) => {
				//self.mask.style('display', 'block');
				let coord = {};

				let c = {};

				coord[from] = component.offset(from);

				c[from] = resizer.offset(from);

				if (last){
					
					var csize = container.offset(size);
					var style = {}; style[size] = csize - c[from]+'px';
					component.style(style);
				}
				else {
					var style = {}; style[size] = (c[from] - coord[from])+'px';
					component.style(style);
				}

				//this._updateSize(component, resizer, modifier);
				this.emit('drag', ev);
			}
		});

		return draggable;
	},

	/**
	 * [_initResizerEvent description]
	 * @param  {component} component [description]
	 * @param  {element} resizer   [description]
	 * @param  {string} modifier  [description]
	 */
	_initResizerEvent(component, resizer, modifier) {

		resizer.on('click', (e) => {e.stopPropagation();});
		resizer.on('mousedown', (e) => {e.stopPropagation();});
		resizer.on('mouseup', (e) => { e.stopPropagation(); });

		this.on('drag', () => {	this._updateSize(component, resizer, modifier); });
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
		//console.log('_updateSize', component.container);
		var container = component.container;
		var from = modifier.from;
		var size = modifier.size;

		var coord = {};
		coord[from] = component.offset(from);
		coord[size] = component.offset(size);

		// for the last component
		// the resizer is on the left or on the top
		if (component.options.last) {
			var csize = container.offset(size);
			//console.log();
			var style = {}; style[from] = csize - coord[size] - 3 +'px';
			resizer.style(style);
		} else {
			//console.log(from, coord[from] + coord[size] -3);
			var style = {}; style[from] = coord[from] + coord[size] -3 +'px';
			resizer.style(style);
			//console.log(resizer);
		}

		this.emit('size');
	}
};

module.exports = resize;
