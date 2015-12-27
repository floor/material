'use strict';

/**
 * Module fieldset
 * @module component/attribute
 */
import {
    _isString
} from '../module/utils';

/**
 * [classes description]
 * @param  {string} className [description]
 * @return {Array} [description]
 */
var classes = function(className){
    className = className.x.replace(/^\s+|\s+$/gm,'');
    var classNames = className.replace(/\s+/g, " ").split(" ");
    var uniques = {};

    return classNames.filter(function(className){
        if (className !== "" && !uniques[className]) {
            return uniques[className] = className;
        }
    });
};

module.exports = {

    /**
     * Get/Set element attribute
     * @param  {string} name The attribute name
     * @param  {string} value The attribute value
     * @return {Object} This class instance
     */
    attr(name, value) {
        if (typeof name === "object") {
            for (var key in name) {
                this.setAttribute(key, name[key]);
            }
            return;
        }
        
        if (value === undefined) {
            return this.getAttribute(name);
        } else {
            this.setAttribute(name, value);
        }
    },

    /**
     * Get/Set element attribute
     * @param  {string} name The attribute name
     * @param  {string} value The attribute value
     * @return {Object} This class instance
     */
    attribute(name, value) {
        this.attr(name, value);

        return this;
    },

    /**
     * Set element attribute
     * @param  {string} name The attribute name
     * @param  {string} value The attribute value
     * @return {Object} This class instance
     */
    setAttribute(name, value) {
        this.element.setAttribute(name, "" + value);
    },
    
    /**
     * Get element attribute
     * @param  {string} name The attribute name
     * @param  {string} value The attribute value
     * @return {Object} This class instance
     */
    getAttribute(name) {
        return this.element.getAttribute(name) || null;
    },

    /**
     * Check if the element className passed in parameters
     * @param  {string}  className
     * @return {boolean} The result
     */
    hasClass(className) {
        return (" " + this.element.className + " ").indexOf(" "+className+" ") > -1;
    },

    /**
     * [addClass description]
     * @param {string} className [description]
     */
    addClass(className) {
        if (!this.hasClass(className)) {
            this.element.className += " " + className;
        }

        return this;
    },

    /**
     * [removeClass description]
     * @param  {string} className [description]
     * @return {void}           [description]
     */
    removeClass(className) {     
        if (this._hasClass(className)) {
            this.element.className = this.element.className.replace(new RegExp("(^|\\s)" + className + "(\\s|$)"), " ").replace(/\s$/, "");
        }
    },

    /**
     * Setter for the state of the component
     * @param {string} state active/disable etc...
     */
    setState(state){
        if (this.state) {
            this.removeClass('state-'+this.state);
        }

        if (state) {
            this.addClass('state-'+state);
        }

        this.state = state;
        this.emit('state', state);

        return this;
    },

    /**
     * Get or set text value of the element
     * @param {string} value The text to set
     * @returns {*}
     */
    text(value) {
        if (_isString(value)) {
            if (this.element.innerText) {
                this.element.innerText = value;
            } else {
                this.element.textContent = value;
            }
            return value;
        }

        if (this.element.innerText) {
            return this.element.innerText;
        }

        return this.element.textContent;
    }
};
