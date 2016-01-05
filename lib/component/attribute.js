'use strict';

/**
 * Module fieldset
 * @module component/attribute
 */
import {
    _isString,
    _indexOf
} from '../module/utils';

module.exports = {

    /**
     * Get/Set element attribute
     * @param  {string} name The attribute name
     * @param  {string} value The attribute value
     * @return {Object} This class instance
     */
    attribute(name, value) {
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
     * Set element attribute
     * @param  {string} name The attribute name
     * @param  {string} value The attribute value
     * @return {Object} This class instance
     */
    setAttribute(name, value) {
        if (value !== null){
            this.element.setAttribute(name, '' + value);
        } else {
            this.element.removeAttribute(name);
        }
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
        return !!this.element.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
    },

    /**
     * [addClass description]
     * @param {string} className [description]
     */
    addClass(className) {

       if (!this.hasClass(className)) this.element.className += ' '+className;

        return this;
    },

    /**
     * [removeClass description]
     * @param  {string} className [description]
     * @return {void}           [description]
     */
    removeClass(className) {     
        if (this.hasClass(className)) {
        var reg = new RegExp('(\\s|^)'+className+'(\\s|$)');
        this.element.className=this.element.className.replace(reg,' ');
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
        if (value) {
            if (this.element.innerText) {
                this.element.innerText = value;
            } else {
                this.element.textContent = value;
            }

            return this;
        }

        return value;
    }
};
