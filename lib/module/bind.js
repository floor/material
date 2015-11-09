
/**
 * bind module
 *
 * @class module/bind
 */
"use strict"

var prime = require('prime/index'),
	Emitter = require('prime/emitter'),
	__debug = require('./debug');

var	_log = __debug('material:module-bind');
//	_log.defineLevel('DEBUG');

var bind = prime({

	mixin: [Emitter],

	/**
	 * Events communication controller
	 * Event bindings
	 * @method _initBinding
	 * @return {object}      this.bind
	 */
	bind: function(options) {
		options = options || this.options.bind;
		_log.debug('bind', options);

		if (!options) return;

		if (!options._list) {
			this._bindObject(options);
		} else {
			var list = options._list;

			for (var i = 0; list.length > i; i++ ) {
				var bind = binding[list[i]];
				this.binding = this.binding || {};

				this._bindObject(bind);
			}
		}

		return this;
	},

	/**
	 * Bind an object
	 * @param  {object} obj obj whit key and value to be bound
	 * @return {void}
	 */
	_bindObject: function(obj) {
		_log.debug('_bindObject', obj);

		for (var key in obj) {
			var value = obj[key];

			if (typeof value !== 'object') {
				this._bindkey(key, value);
			} else {
				this._bindList(key, value);
			}
		}
	},

	/**
	 * Bind a list of events to a specific object
	 * @param  {string} key Object path that will listen
	 * @param  {array} values List if values to bind
	 * @return {void}
	 */
	_bindList: function(key, values) {
		_log.debug('_bindList', key, values);

		for (var i = 0; i < values.length; i++) {
			this._bindkey(key, values[i]);
		}
	},

	/**
	 * Bind to object path
	 * get the event,
	 * get the reference to the last key of the first object,
	 * check if there is a event or a mehtod to bind
	 * @param  {string} key Object path that will listen
	 * @param  {string} val Object path to be bound
	 * @return {void}
	 */
	_bindkey: function(key, val) {
		_log.debug('_bindkey', key, val);

		var eventKeys = key.split('.');
		var ev = eventKeys[eventKeys.length - 1];

		eventKeys.pop();
		var listenerCtx = this._path(eventKeys.join('.'));

		var valKeys = val.split('.');

		//Check if it's an event
		if (valKeys[valKeys.length - 2] === 'emit') {
			var emit = valKeys[valKeys.length - 1];
			this._bindEvent(listenerCtx, ev, emit, val);
		} else {
			this._bindMethod(listenerCtx, ev, val);
		}
	},

	/**
	 * Listen to the given event and trigger another
	 * @param  {object} listenerCtx Object to listen
	 * @param  {string} ev Event that will be listened
	 * @param  {string} emit Event that will be emitted
	 * @param  {string} val Method path to be bound
	 * @return {void}
	 */
	_bindEvent: function(listenerCtx, ev, emit, val) {
		_log.debug('_bindEvent', listenerCtx, ev, emit, val);
		var emitter = 'emit';

		var valKeys = val.split('.');
		valKeys.splice(-2, 2);

		var boundCtx = this._path(valKeys.join('.'));

		if (listenerCtx && listenerCtx.on && boundCtx && boundCtx.emit) {
			listenerCtx.on(ev, boundCtx.emit.bind(boundCtx, emit));
		} else {
			_log.debug('Missing context or method', listenerCtx, val);
		}
	},

	/**
	 * Listen to the given event and bind to the given method
	 * @param  {object} listenerCtx Object to listen
	 * @param  {string} ev Event that will be listened
	 * @param  {string} val Method path to be bound
	 * @return {void}
	 */
	_bindMethod: function(listenerCtx, ev, val) {
		//_log.debug('_bindMethod', listenerCtx, ev, val);
		var method = this._path(val);

		var valKeys = val.split('.');
		valKeys.pop();
		var boundCtx = this._path(valKeys.join('.'));

		if (listenerCtx && listenerCtx.addEvent && method) {
			listenerCtx.addEvent(ev, method.bind(boundCtx));
			// keep track of the binding
			//this.binding[key] = method;
		} else if (listenerCtx && listenerCtx.on && method) {
			listenerCtx.on(ev, method.bind(boundCtx));
		} else {
			//_log.debug('Missing context or method', listenerCtx, val);
		}
	},

	/**
	 * Return the last reference from an object
	 * @param  {string} str Object path for example key1.key2.key3
	 * @return {object}
	 */
	_path: function(str) {
		//_log.debug('_path', str);
		if (!str) return this;
		else if (!str.match(/\./)) return this[str];

		var last;

		var keys = str.split('.');
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];

			last = last || this;
			last = last[key];
		}

		return last;
	}

});

module.exports = bind;
