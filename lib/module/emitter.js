'use strict';

var indexOf = require("mout/array/indexOf");
var forEach = require("mout/array/forEach");

var defer = require("./defer");

var slice = Array.prototype.slice;

/**
 * Emitter is a module for managing and emitting events.
 * @class
 * @author https://github.com/kamicane
 */
class Emitter {

    constructor(stoppable){
        this._stoppable = stoppable;

        return this;
    }

    on(event, fn){
        var listeners = this._listeners || (this._listeners = {});
        var events = listeners[event] || (listeners[event] = []);

        if (indexOf(events, fn) === -1) events.push(fn);

        return this;
    }

    off(event, fn){
        var listeners = this._listeners, events;

        if (listeners && (events = listeners[event])){

            var io = indexOf(events, fn);
            if (io > -1) events.splice(io, 1);
            if (!events.length) delete listeners[event];
            for (var l in listeners) {
                return this;
            }
            delete this._listeners;
        }
        return this;
    }

    emit(event){
        var self = this;
        var args = slice.call(arguments, 1);

        var emit = function(){
            var listeners = self._listeners, events;
            if (listeners && (events = listeners[event])){
                forEach(events.slice(0), function(event){
                    var result = event.apply(self, args);
                    if (self._stoppable) return result;
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