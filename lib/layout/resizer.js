'use strict';

var Element = require("../element");

var resize = {

	/**
	 * [_initResizeBorder description]
	 * @param  {component} component [description]
	 */
	_initResizer(component) {
		var self = this;
		var name = component.options.name;
		var container = component.container || component.options.container.element;

		this._initMaximize(component);

		if (!container) return;

		var direction = container.style('flex-direction');
		
		if (!direction)	return;

		var modifier = this.options.resizer.modifier[direction];

		if (!modifier) return;

		var resizer = this.resizer[name] = new Element('div.ui-resizer', {
			'data-name': component.options.name
		}).inject(container);

		resizer.on('click', function(e){ 
			e.stopPropagation(); 
		});

		resizer.on('mousedown', function(e){ 
			e.stopPropagation();
			self.mask.style('display', 'block');
		});

		resizer.on('mouseup', function(e){ 
			e.stopPropagation();
			self.mask.style('display', 'block');
		});

		if (modifier.size) {
			resizer.addClass('resizer-'+ modifier.size);
		}

		//this._initResizerDrag(resizer, modifier, component);
		this._initResizerEvent(component, resizer, modifier);

		this.emit('drag');
	},

	/**
	 * [_initDrag description]
	 */
	_initResizerDrag(resizer, modifier, component) {
		var self = this;

		var element = component.element;
		var container = component.container;
		var last = component.options.last;

		var drag = new Drag.Move(resizer, {
			modifiers: modifier.mode,
			/**
			 * [onStart description]
			 */
		    onStart: function() {
				//self.emit('resizeStart', el);
				self.mask.setStyle('display', 'block');
			},
			/**
			 * [onDrag description]
			 */
			onDrag: function() {
				self.mask.setStyle('display', 'block');
				var coord = element.getCoordinates(container);
				var coordc = container.getCoordinates();
				var c = resizer.getCoordinates(container);

				//style('flex','none');
				//style(modifier.size, c[modifier.from] - coord[modifier.from]);
				if (last){
					style(modifier.size, coordc[modifier.size] - c[modifier.from]);
				}
				else {
					style(modifier.size, c[modifier.from] - coord[modifier.from]);
				}

				self.emit('drag');
			},
			/**
			 * [onComplete description]
			 */
			onComplete: function(){
				self.mask.setStyle('display', 'none');
				
				var coord = element.getCoordinates(container);
				var size = element.getCoordinates(container)[modifier.size];
				self.emit('resizer', [component.main, modifier.size, size]);
				component.emit('resizeComplete', [modifier.size, size]);

				component[modifier.size] = size;
				
			}
		});

		return drag;
	},

	/**
	 * [_initResizerEvent description]
	 * @param  {component} component [description]
	 * @param  {element} resizer   [description]
	 * @param  {string} modifier  [description]
	 */
	_initResizerEvent(component, resizer, modifier) {
		var self = this;

		this.on('drag', function() {
			self._updateSize(component, resizer, modifier);
		});

		this.on('maximize', function() {
			self._updateSize(component, resizer, modifier);
		});

		this.on('normalize', function() {
			self._updateSize(component, resizer, modifier);
		});

		this.on('resize', function() {
			self._updateSize(component, resizer, modifier);
		});
	},

	/**
	 * [_updateSize description]
	 */
	_updateSize(component, resizer, modifier) {
		var container = component.container;
		var element = component.element;

		var coord = element.getCoordinates(container);
		// the last container doesnt need resizedr
		if (component.options.last) {
			resizer.setStyle(modifier.from, coord[modifier.from] -3);
		} else { 
			resizer.setStyle(modifier.from, coord[modifier.from] + coord[modifier.size] -3);
		}

		this.emit('size');
	},

	/**
	 * Init maximisation. dblclick trigger the toggle
	 * @param  {component} component [description]
	 */
	_initMaximize(component) {
		var self = this;
		var element = component.element;
		var container = component.container;

		if (!container) return;

		component.emit('max', function() {
			var name = component.options.name;

			if (element.hasClass('container-max')) {
				element.removeClass('container-max');
				container.getChildren('.ui-container').each(function(c) {
					c.setStyle('display', c.retrieve('display'));
				});

				style('width', element.retrieve('width'));
				style('height', element.retrieve('height'));

				self.emit('normalize', component);
			} else{
				element.addClass('container-max');
				element.store('width', element.style('width'));
				element.store('height', element.style('height'));
				element.style('width', 'initial');
				element.style('height', 'initial');
				container.getChildren('.ui-container').each(function(c) {
					if (!c.hasClass('container-'+name)) {
						c.store('display', c.style('display'));
						c.hide();
					}
				});

				self.emit('resize', component);
			}
		});
	},


	/**
	 * [_initResize description]
	 * @return {instance} The class instance
	 */
	_initResizers(components) {
		var len = components.length;

		// add resize Border on the right or on the bottom
		// execpt for the last one 
		for (var i = 0; i < len; i++) {
			var component = components[i];

			if (component.options.noResizer) {
				continue;
			}

			this._initResizer(component);
		}
	}
};

module.exports = resize;
