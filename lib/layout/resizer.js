'use strict';

var Element = require("../element");

var resize = {

	/**
	 * _initResizeBorder description
	 * @param  {component} component [description]
	 */
	_initResizer(component) {
		var name = component.options.name;

		var container = component.container || component.options.container.element;
		var direction = this._initResizerDirection(container);
		var modifier = this.options.resizer.modifier[direction];

		if (!direction || !modifier || !container) {
			return;
		}

		var resizer = this.resizer[name] = new Element('div.ui-resizer')
			.inject(container);

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
		var container = component.container || component.options.container.element;
		var last = component.options.last;

		var draggable = DragDrop.bind(resizer.dom, {
		    //anchor: anotherElement,
		    boundingBox: 'offsetParent',
		    dragstart: function() {
				self.emit('resizeStart', component);
				//self.mask.setStyle('display', 'block');
			},
		  drag: (evt) => {
				//self.mask.setStyle('display', 'block');
				let coord = {};

				let c = {};

				coord[from] = parseInt(element.compute(from).replace('px', ''));

				c[from] = parseInt(resizer.compute(from).replace('px', ''));

				if (last){
					console.log('--');
					var csize = container.getSize()[size];
					element.style(size, csize - c[from]);
				}
				else {
					element.style(size, c[from] - coord[from]);
				}

				//this._updateSize(component, resizer, modifier);
				this.emit('drag', evt);
		  },
		  dragend: (evt) => {
				//self.mask.setStyle('display', 'none');

				// var coord = {};

				// coord[modifier.from] = parseInt(element.compute(modifier.from).replace('px', ''));
				// coord[modifier.size] = parseInt(element.compute(modifier.size).replace('px', ''));

				// var size = element.style(container)[modifier.size];
				// self.emit('resizer', [component.main, modifier.size, size]);
				// component.emit('resizeComplete', [modifier.size, size]);

				// component[modifier.size] = size;
				this.emit('resizeEnd', evt);
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
		// the last statement is temporary before i fix the component correctly
		var container = component.container || component.options.container.element;
		var element = component.element;
		var from = modifier.from;
		var size = modifier.size;

		var coord = {};
		coord[from] = element.getCoord()[from];
		coord[size] = element.getSize()[size];

		// for the last component
		// the resizer is on the left or on the top
		if (component.options.last) {
			var csize = container.getSize()[size];
			resizer.style(from, csize - coord[size] - 3);
		} else {
			resizer.style(from, coord[from] + coord[size] -3);
		}

		this.emit('size');
	}
};

module.exports = resize;
