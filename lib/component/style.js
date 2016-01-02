'use strict';

/**
 * Element style related methods
 * @module component/style
 */
import { 
	cssNameProperty, 
	_isIterable, 
	_isLiteralObject, 
	_isArray,
	_each
} from '../module/utils';

module.exports = {

    /**
     * Returns current coordinates of the element,
     * relative to the document
     *
     * @param {HTMLElement} element
     * @returns {*}
     */
    offset(prop) {

        var rect = this.element.getBoundingClientRect();

        var offs = {
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
            width: rect.width ? Math.round(rect.width) : Math.round(this.element.offsWidth),
            height: rect.height ? Math.round(rect.height) : Math.round(this.element.offsHeight)
        };

        //fallback to css width and height
        if (offs.width <= 0) {
            offs.width = parseFloat(this._getComputedStyle('width'));
        }
        if (offs.height <= 0) {
            offs.height = parseFloat(this._getComputedStyle('height'));
        }

        if (prop) {
			return offs[prop];
		} else {
			return offs;
		}
    },

    /**
     * Gets element's computed style
     * @param {string} prop
     * @returns {*}
     * @private
     */
    _getComputedStyle(prop) {

        var computedStyle;

        if (typeof window.getComputedStyle === 'function') { //normal browsers
            computedStyle = window.getComputedStyle(this.element);
        } else if (typeof document.currentStyle !== undefined) { //other browsers
            computedStyle = this.element.currentStyle;
        } else {
            computedStyle = this.element.style;
        }

        if (prop) {
            return computedStyle[prop];
        } else {
            return computedStyle;
        }
    },

    /**
     * Sets or gets HTMLElement's style
     *
     * @param {HTMLElement} element
     * @param {Object} style key value pair object
     * @returns {Object|false}
     */
    style(style) {
        //console.log('sytle', style);

        if (_isIterable(this.element) && _isLiteralObject(style)) {
            _each (this.element, function(e) {
                this.style(e, style);
            });
            return this;
        }

        //get one this.element
        if (typeof style === "string") {
            return this._getComputedStyle(cssNameProperty(style));
        }

        //get array of this.elements
        if (_isArray(style)) {
            var css = {};
            for (var i in style) {
                css[style[i]] = this._getComputedStyle(cssNameProperty(style[i]));
            }
            return css;
        }

        if (_isLiteralObject(style)) {
            //set csses
            for (var j in style) {
                this.element.style[cssNameProperty(j)] = style[j];
            }
            return style;
        }

        return false;
    }
};
