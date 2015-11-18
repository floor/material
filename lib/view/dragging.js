/**
* Minimalistic Implement for Minimal.View Class
*
* @implement Minimal.View
* @author Jerome Vial, Bruno Santos
*/

define(function() {

    var exports = new Class({

	/**
	 * Initialize Dragging - The idea is to allow dragging when content is
	 * larger than the container For example to view an image. as google map.
	 *
	 * @method _initDragging
	 * @param {element}
	 * @param {options}
	 * @private
	 */
	_initDragging: function(element, options){

		element = this.element;
		// _log.debug('Drag.Scroll ', element);
		// Drag speed
		var prevTime, prevScroll, speed, scroll, timer;
		var timerFn = function(){
			var now = Date.now();
			scroll = [element.scrollLeft, element.scrollTop];
			if (prevTime){
				var dt = now - prevTime + 1;
				speed = [
				1000 * (scroll[0] - prevScroll[0]) / dt,
				1000 * (scroll[1] - prevScroll[1]) / dt
			];
		}

		prevScroll = scroll;
		prevTime = now;

		};

		// Use Fx.Scroll for scrolling to the right position after the dragging
		var fxdrag = this.fxdrag = new Fx.Scroll(element, {
			transition: Fx.Transitions.Expo.easeOut
		});

		//_log.debug('-----------', fxdrag);

		// Set initial scroll
		fxdrag.set.apply(fxdrag, this.limit(element.scrollLeft, element.scrollTop));

		var self = this,
			friction = this.options.friction,
			axis = this.options.axis;

		// Make the element draggable
		var drag = this.drag = new Drag(element, {
			style: false,
			invert: true,
			handlers: [],
			modifiers: {
				x: axis.x && 'scrollLeft',
				y: axis.y && 'scrollTop'
			},
			onStart: function(){
				// Start the speed measuring
				timerFn();
				timer = setInterval(timerFn, 1000 / 60);
				// cancel any fx if they are still running
				fxdrag.cancel();
			},
			onDrag: function() {
				//_log.debug(element.scrollHeight,element.scrollWidth);
			},
			onComplete: function(){
				// Stop the speed measuring
				prevTime = false;
				clearInterval(timer);
				// Scroll to the new location
				/*fxdrag.start.apply(fxdrag, self.limit(
					scroll[0] + (speed[0] || 0) / friction,
					scroll[1] + (speed[1] || 0) / friction
				));*/
			}
		});
	}

    });

    return exports;

});
