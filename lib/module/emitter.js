'use strict';

let indexOf = require("mout/array/indexOf");
let forEach = require("mout/array/forEach");

let defer = require("./defer");

let slice = Array.prototype.slice;

/**
 * Emitter is a module for managing and emitting events.
 * @class Emitter
 * @author Valerio Proietti
 * @link https://github.com/kamicane/prime/blob/master/emitter.js
 */
class Emitter {

    constructor(stoppable){
        this._stoppable = stoppable;

        return this;
    }

    on(event, fn){
        let listeners = this._listeners || (this._listeners = {});
        let events = listeners[event] || (listeners[event] = []);

        if (indexOf(events, fn) === -1) events.push(fn);

        return this;
    }

    off(event, fn){
        let listeners = this._listeners, events;

        if (listeners && (events = listeners[event])){

            let io = indexOf(events, fn);
            if (io > -1) events.splice(io, 1);
            if (!events.length) delete listeners[event];
            for (let l in listeners) {
                return this;
            }
            delete this._listeners;
        }
        return this;
    }

    emit(event){
        let args = slice.call(arguments, 1);

        let emit = () => {
            let listeners = this._listeners, events;
            if (listeners && (events = listeners[event])){
                forEach(events.slice(0), (event) => {
                    let result = event.apply(this, args);
                    if (this._stoppable) return result;
                });
            }
        }

        if (args[args.length - 1] === Emitter.EMIT_SYNC){
            args.pop();
            emit();
        } else {
            defer(emit);
        }

        return this;
    }
};

Emitter.EMIT_SYNC = {};

module.exports = Emitter;
