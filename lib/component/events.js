'use strict';

var Emitter = require("../module/emitter");

var html = document.documentElement;

var addEventListener = html.addEventListener ? function(node, event, handle, useCapture){
	node.addEventListener(event, handle, useCapture || false);
	return handle;
} : function(node, event, handle){
	node.attachEvent('on' + event, handle);
	return handle;
};

var removeEventListener = html.removeEventListener ? function(node, event, handle, useCapture){
	node.removeEventListener(event, handle, useCapture || false);
} : function(node, event, handle){
	node.detachEvent("on" + event, handle);
};

/**
 * Component events module
 * @module component/events
 */
module.exports = {

	/**
	 * [on description]
	 * @param  {string} event      [description]
	 * @param  {Function} handle     [description]
	 * @param  {boolean} useCapture [description]
	 * @return {void}            [description]
	 */
	on(event, handle, useCapture){

		var self = this.element;

		var internalEvent = event + (useCapture ? ':capture' : '');

		Emitter.prototype.on.call(self, internalEvent, handle);

		var domListeners = self._domListeners || (self._domListeners = {});
		if (!domListeners[internalEvent]) domListeners[internalEvent] = addEventListener(this.element, event, function(e){
			Emitter.prototype.emit.call(self, internalEvent, e || 
			window.event, Emitter.EMIT_SYNC);
		}, useCapture);

		return this;
	},

	/**
	 * [off description]
	 * @param  {string} event      [description]
	 * @param  {Function} handle     [description]
	 * @param  {boolean} useCapture [description]
	 * @return {void}            [description]
	 */
	off(event, handle, useCapture){
		var self = this.element;

		var internalEvent = event + (useCapture ? ":capture" : "");

		var domListeners = self._domListeners;
		var domEvent;
		var listeners = self._listeners;
		var events;

		if (domListeners && (domEvent = domListeners[internalEvent]) && 
			listeners && (events = listeners[internalEvent])){

			Emitter.prototype.off.call(self, internalEvent, handle);

			if (!self._listeners || !self._listeners[event]){
				removeEventListener(this.element, event, domEvent);
				delete domListeners[event];

				for (var l in domListeners) return;
				delete self._domListeners;
			}

		}
	}
};
