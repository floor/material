'use strict';

/**
 * Utility functions
 * @module module/utils
 */

//ie?
var ie = (function() {
    var undef, v = 3, div = document.createElement('div'), all = div.getElementsByTagName('i');
    while ( div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->', all[0]);
    return v > 4 ? v : undef;
}());

/**
 * css name property detection
 * @param  {string} prop [description]
 * @return {string}      [description]
 */
function cssNameProperty(prop) {
	 if (ie && ie < 9) {
        for(var exp=/-([a-z0-9])/; exp.test(prop); prop = prop.replace(exp,RegExp.$1.toUpperCase()));
        return prop;
    } else {
		return prop;
	}
}

/**
 * Checks if given value is an array
 * @param {*} object
 * @returns {boolean}
 * @private
 */
function _isArray(object) {
	return Object.prototype.toString.call(object) === '[object Array]';
}

/**
 * Checks if given value is a string
 * @param {*} object
 * @returns {boolean}
 * @private
 */
function _isString(object) {
	return typeof object === 'string';
}

/**
 * Checks if given value is a number
 * @param {*} object
 * @returns {boolean}
 * @private
 */
function _isNumeric(object) {
	return typeof object === 'number' && isFinite(object);
}

/**
 * Checks if given value is an object
 * @param {*} object
 * @returns {boolean}
 * @private
 */
function _isObject(object) {
	return typeof object === 'object';
}

/**
 * Checks if given value is a function
 * @param {*} object
 * @returns {boolean}
 * @private
 */
function _isFunction(object) {
	return typeof object === 'function';
}

/**
 * Checks if given node parameter is a DOMNode
 * @param {Node} node
 * @returns {*}
 */
function isNode(node) {
    if (typeof Node === 'object') {
        return node instanceof Node;
    }
    return node && typeof node === 'object' && typeof node.nodeType === 'number' && typeof node.nodeName === 'string';
}

/**
 * Checks if given object is a DOMElement
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isElement(element) {
    if (typeof HTMLElement === 'object') {
        return element instanceof HTMLElement;
    }

    return element && typeof element === 'object' && element.nodeType === 1 && typeof element.nodeName === 'string';
}

/**
 * Checks if javascript object is plain object
 * @param {Object} object
 * @returns {*|boolean}
 * @private
 */
function _isLiteralObject(object) {
    return object && typeof object === "object" && Object.getPrototypeOf(object) === Object.getPrototypeOf({});
}

/**
 * Checks if object is iterable
 * @param {Object} object
 * @returns {boolean}
 * @private
 */
function _isIterable(object) {
    // if (Dom.isNode(object) || Dom.isElement(object) || object === window) {
    //     return false;
    // }

    var r = _isLiteralObject(object) || _isArray(object) || (typeof object === 'object' && object !== null && object.length !== undefined);
    return r;
}

/**
 *
 * @param {Object} object
 * @param {Function} callback
 * @private
 */
function _each(object, callback) {
    if (_isArray(object) || (typeof object === 'object' && object.length !== undefined)) {
        for (var i = 0, l = object.length; i < l; i++) {
            callback.apply(object[i], [object[i], i]);
        }
        return;
    }

    if (_isLiteralObject(object)) {
        for (var key in object) {
            callback.apply(object[key], [object[key], key]);
        }
    }
}

/**
 * Array.indexOf support
 * @param {Array} array
 * @param {*} obj
 * @returns {number}
 * @private
 */
function _indexOf(array, obj) {
    if (Array.prototype.indexOf) {
        return Array.prototype.indexOf.call(array, obj);
    }
    for (var i = 0, j = array.length; i < j; i++) {
        if (array[i] === obj) {
            return i;
        }
    }
    return -1;
}


export { 
	_isArray, 
	_isString, 
	_isFunction, 
	_isNumeric, 
	_isObject, 
	isElement,
	isNode,
	_isIterable, 
	_isLiteralObject,
	_each,
    _indexOf,
	cssNameProperty
};
