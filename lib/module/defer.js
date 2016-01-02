'use strict';

/**
 * Module defer
 * @module module/defer
 */


// function kindOf from mout
var _rKind = /^\[object (.*)\]$/;
var _toString = Object.prototype.toString;
var UNDEF;

/**
 * Gets the "kind" of value. (e.g. "String", "Number", etc)
 */
function kindOf(val) {
    if (val === null) {
        return 'Null';
    } else if (val === UNDEF) {
        return 'Undefined';
    } else {
        return _rKind.exec( _toString.call(val) )[1];
    }
}


var callbacks = {
    timeout: {},
    frame: [],
    immediate: []
};

/**
 * defer
 * @class
 * @author https://github.com/kamicane
 */
var push = function(collection, callback, context, defer){

    var iterator = function(){
        iterate(collection);
    };

    if (!collection.length) defer(iterator);

    var entry = {
        callback: callback,
        context: context
    };

    collection.push(entry);

    return function(){
        var io = collection.indexOf(entry);
        if (io > -1) collection.splice(io, 1);
    };
};

/**
 * [iterate description]
 * @return {void}            [description]
 */
var iterate = function(collection){
    var time = Date.now();

    //console.log('!!', collection);

    collection.splice(0).forEach(function(entry) {
        entry.callback.call(entry.context, time);
    });
};

var defer = function(callback, argument, context){
    return (kindOf(argument) === "Number") ? defer.timeout(callback, argument, context) : defer.immediate(callback, argument)


};

if (global.process && process.nextTick){

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, process.nextTick);
    };

} else if (global.setImmediate){

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, setImmediate);
    };

} else if (global.postMessage && global.addEventListener){

    addEventListener("message", function(event){
        if (event.source === global && event.data === "@deferred"){
            event.stopPropagation();
            iterate(callbacks.immediate);
        }
    }, true);

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, function(){
            postMessage("@deferred", "*");
        });
    };

} else {

    defer.immediate = function(callback, context){
        return push(callbacks.immediate, callback, context, function(iterator){
            setTimeout(iterator, 0);
        });
    };
}

var requestAnimationFrame = global.requestAnimationFrame ||
    global.webkitRequestAnimationFrame ||
    global.mozRequestAnimationFrame ||
    global.oRequestAnimationFrame ||
    global.msRequestAnimationFrame ||
    function(callback) {
        setTimeout(callback, 1e3 / 60);
    };

/**
 * [frame description]
 * @param  {Function} callback [description]
 * @return {Array}            [description]
 */
defer.frame = function(callback, context){
    return push(callbacks.frame, callback, context, requestAnimationFrame);
};

var clear;

/**
 * [timeout description]
 * @param  {Function} callback [description]
 * @return {Array}            [description]
 */
defer.timeout = function(callback, ms, context){
    var ct = callbacks.timeout;

    if (!clear) clear = defer.immediate(function(){
        clear = null;
        callbacks.timeout = {};
    });

    return push(ct[ms] || (ct[ms] = []), callback, context, function(iterator){
        setTimeout(iterator, ms);
    });
};

module.exports = defer;