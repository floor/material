
/**
 * dom element module
 * @module container/dom
 */
'use strict';

import {
    isNode,
    _isString
} from '../module/utils';

module.exports = {
    
    /**
     * [hasClass description]
     * @param  {string}  className
     * @return {Boolean}
     */
    hasClass(className) {
        return (" " + this.element.className + " ").indexOf(" "+className+" ") > -1;
    },

    /**
     * [addClass description]
     * @param {[type]} className [description]
     */
    addClass(className) {
        if (!this.hasClass(className)) {
            this.element.className += " " + className;
        }
    },

    /**
     * [removeClass description]
     * @param  {[type]} className [description]
     * @return {[type]}           [description]
     */
    removeClass(className) {     
        if (this._hasClass(className)) {
            this.element.className = this.element.className.replace(new RegExp("(^|\\s)" + className + "(\\s|$)"), " ").replace(/\s$/, "");
        }
    },
    
     /**
     * Gets or sets text value of the HTML element
     *
     * @param {HTMLElement} element
     * @param {String} string
     * @returns {*}
     */
    text(string) {

        if (_isString(string)) {

            if (this.element.innerText) {
                this.element.innerText = string;
            } else {
                this.element.textContent = string;
            }
            return string;
        }

        if (this.element.innerText) {
            return this.element.innerText;
        }

        return this.element.textContent;
    },
    
    /**
     * [setAttribute description]
     * @param {[type]} elm   [description]
     * @param {[type]} attr  [description]
     * @param {[type]} value [description]
     */
    setAttribute(attr, value) {
        this.element.setAttribute(attr, "" + value);
    },
    
    /**
     * [getAttribute description]
     * @param  {[type]} attr [description]
     * @return {[type]}      [description]
     */
    getAttribute(attr) {
        return this.element.getAttribute(attr) || null;
    },
    
    /**
     * [_attr description]
     * @param  {[type]} elm   [description]
     * @param  {[type]} attr  [description]
     * @param  {[type]} value [description]
     * @return {[type]}       [description]
     */
    attr(attr, value) {
        if (typeof attr === "object") {
            for (var key in attr) {
                this.setAttribute(key, attr[key]);
            }
            return;
        }
        
        if (value === undefined) {
            return this.getAttribute(attr);
        } else {
            this.setAttribute(attr, value);
        }
    },

    /**
     * empty
     * @return {void}
     */
    empty() {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
    }
};
