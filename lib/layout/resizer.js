'use strict';

var Element = require("../element");
var toInt = require("mout/number/toInt");
//var DragDrop = require("../../dist/vendor/DrqgDrop/drag-drop.js");

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

		console.log(container, modifier, direction);

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

		this.emit('drag');
	},

	_initResizerDirection(container){
		var direction;

		if (container.hasClass('flex-column')) {
			direction = 'column'
		} else if (container.hasClass('flex-raw')) {
			direction = 'row'
		}

		return direction;
	},

	/**
	 * _initResizerDrag
	 */
	_initResizerDrag(resizer, modifier, component) {
		var self = this;

		var element = component.element;

		// the last statement is temporary before i fix the component correctly
		var container = component.container || component.options.container.element;
		var last = component.options.last;

		console.log(resizer);

		var draggable = DragDrop.bind(resizer.dom[0], {
		    //anchor: anotherElement,
		    boundingBox: 'offsetParent',
		    dragstart: function() {
				self.emit('resizeStart', component);
				//self.mask.setStyle('display', 'block');
			},
		  drag: (evt) => {
				//self.mask.setStyle('display', 'block');
				let coord = {};
				let coordc = {};
				let c = {};

				coord[modifier.from] = toInt(element.compute(modifier.from).replace('px', ''));
				coord[modifier.size] = toInt(element.compute(modifier.size).replace('px', ''));

				c[modifier.from] = toInt(resizer.compute(modifier.from).replace('px', ''));
				c[modifier.size] = toInt(resizer.compute(modifier.size).replace('px', ''));

				coordc[modifier.from] = toInt(container.compute(modifier.from).replace('px', ''));
				coordc[modifier.size] = toInt(container.compute(modifier.size).replace('px', ''));

				if (last){
					console.log('drag', modifier.size, coordc[modifier.size] - c[modifier.from]);
					element.style(modifier.size, coordc[modifier.size] - c[modifier.from]);
				}
				else {
					element.style(modifier.size, c[modifier.from] - coord[modifier.from]);
				}

				self.emit('drag');
		  },
		  dragend: (evt) => {
				//self.mask.setStyle('display', 'none');

				var coord = {};

				// coord[modifier.from] = toInt(element.compute(modifier.from).replace('px', ''));
				// coord[modifier.size] = toInt(element.compute(modifier.size).replace('px', ''));

				// var size = element.style(container)[modifier.size];
				// self.emit('resizer', [component.main, modifier.size, size]);
				// component.emit('resizeComplete', [modifier.size, size]);

				// component[modifier.size] = size;
				this.emit('resizeEnd', evt);
		    }
		});


		// var drag = new Drag.Move(resizer, {
		// 	modifiers: modifier.mode,
		// 	/**
		// 	 * [onStart description]
		// 	 */
		//     onStart: function() {
		// 		//self.emit('resizeStart', el);
		// 		self.mask.setStyle('display', 'block');
		// 	},
		// 	/**
		// 	 * [onDrag description]
		// 	 */
		// 	onDrag: function() {
		// 		self.mask.setStyle('display', 'block');
		// 		var coord = element.getCoordinates(container);
		// 		var coordc = container.getCoordinates();
		// 		var c = resizer.getCoordinates(container);

		// 		//style('flex','none');
		// 		//style(modifier.size, c[modifier.from] - coord[modifier.from]);
		// 		if (last){
		// 			style(modifier.size, coordc[modifier.size] - c[modifier.from]);
		// 		}
		// 		else {
		// 			style(modifier.size, c[modifier.from] - coord[modifier.from]);
		// 		}

		// 		self.emit('drag');
		// 	},
		// 	/**
		// 	 * [onComplete description]
		// 	 */
		// 	onComplete: function(){
		// 		self.mask.setStyle('display', 'none');

		// 		var coord = element.getCoordinates(container);
		// 		var size = element.getCoordinates(container)[modifier.size];
		// 		self.emit('resizer', [component.main, modifier.size, size]);
		// 		component.emit('resizeComplete', [modifier.size, size]);

		// 		component[modifier.size] = size;

		// 	}
		// });

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
		this.on('normalize', () => { self._updateSize(component, resizer, modifier); });
		this.on('resize', function() { self._updateSize(component, resizer, modifier); });
	},

	/**
	 * _updateSize
	 */
	_updateSize(component, resizer, modifier) {
		// the last statement is temporary before i fix the component correctly
		var container = component.container || component.options.container.element;
		var element = component.element;

		var coord = {};
		coord[modifier.from] = toInt(element.compute(modifier.from).replace('px', ''));
		coord[modifier.size] = toInt(element.compute(modifier.size).replace('px', ''));

		// for the last component
		// the resizer is on the left or on the top
		if (component.options.last) {
			console.log('_updateSize last', element.compute(modifier.from), coord[modifier.from]);
			resizer.style(modifier.from, coord[modifier.from] +3);
		} else {
			//console.log('_updateSize', modifier.from, coord[modifier.from] + coord[modifier.size] -3);
			resizer.style(modifier.from, coord[modifier.from] + coord[modifier.size] -3);
		}

		this.emit('size');
	}
};

module.exports = resize;
