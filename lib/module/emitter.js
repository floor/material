'use strict';

let defer = require("./defer");

let slice = Array.prototype.slice;

/**
 * Emitter is a module for managing and emitting events.
 * @class
 * @author Valerio Proietti
 * @see https://github.com/kamicane/prime/blob/master/emitter.js
 */
class Emitter {

	constructor(stoppable){
		this._stoppable = stoppable;

		return this;
	}

	/**
	 * [on description]
	 * @param  {string}   event [description]
	 * @param  {Function} fn    [description]
	 * @return {Object} Thia class instance
	 */
	on(event, fn){
		let listeners = this._listeners || (this._listeners = {});
		let events = listeners[event] || (listeners[event] = []);

		if (events.indexOf(fn) === -1) events.push(fn);

		return this;
	}

	/**
	 * [off description]
	 * @param  {string}   event [description]
	 * @param  {Function} fn    [description]
	 * @return {}         [description]
	 */
	off(event, fn){
		let listeners = this._listeners, events;

		if (listeners && (events = listeners[event])){

			let io = events.indexOf(fn);
			if (io > -1) events.splice(io, 1);
			if (!events.length) delete listeners[event];
			for (let l in listeners) {
				return this;
			}
			delete this._listeners;
		}
		return this;
	}

	/**
	 * [emit description]
	 * @param  {string} event The event name
	 * @return {Object} this
	 */
	emit(event){
		let args = slice.call(arguments, 1);

		let fire = () => {
			let listeners = this._listeners;
			let events;
			if (listeners && (events = listeners[event])){
			   events.slice(0).forEach((event) => {
					let result = event.apply(this, args);
					if (this._stoppable) return result;
				});
			}
		};

		if (args[args.length - 1] === Emitter.EMIT_SYNC){
			args.pop();
			fire();
		} else {
			defer(fire);
		}

		return this;
	}
}

Emitter.EMIT_SYNC = {};

module.exports = Emitter;
