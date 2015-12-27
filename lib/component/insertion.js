'use strict';

/**
 * Element insertion related methods
 * @module component/insertion
 */
import {
    isNode
} from '../module/utils';

module.exports = {
    /**
     * Inserts content specified by the container argument at the end of HTMLElement
     *
     * @param {HTMLElement} container
     * @param {String|HTMLElement} html
     * @return {HTMLElement} inserted element
     */
    append(container) {

        if (!isNode(container)) {
            throw new Error("Dom.append " + container + " is not a DOMNode object");
        }

        container.appendChild(this.element);
        return this.element;
    },

    /**
     * Inserts content specified by the html argument at the beginning of HTMLElement
     *
     * @param {HTMLElement} container
     * @param {string|HTMLElement} html
     * @returns {HTMLElement} inserted container
     */
    prepend(container) {

        if (!isNode(container)) {
            throw new Error("Dom.prepend " + container + " is not a DOMNode object");
        }

        container.insertBefore(this.element, container.firstChild);
        return this.element;
    },

    /**
     * Inserts content specified by the html argument after the HTMLElement
     *
     * @param {HTMLElement} container
     * @returns {HTMLElement} inserted container
     */
    after(container) {

        if (!isNode(container)) {
            throw new Error("Dom.after " + container + " is not a DOMNode object");
        }

        container.parentNode.insertBefore(this.element, container.nextSibling);
        return this.element;
    },

    /**
     * Inserts content specified by the html argument before the HTMLElement
     *
     * @param {HTMLElement} container
     * @returns {HTMLElement} inserted container
     */
    before(container) {
        if (!isNode(container)) {
            throw new Error("Dom.before " + container + " is not a DOMNode object");
        }

        container.insertBefore(this.element, container);
        return this.element;
    },

    /**
     * Replaces given html container with content specified in html parameter
     *
     * @param {HTMLElement} container
     * @param {string|HTMLElement} html
     * @returns {HTMLElement} inserted container
     */
    replace(container) {

        if (!this.isNode(container)) {
            throw new Error("Dom.replace " + container + " is not a DOMNode object");
        }

        container.parentNode.replaceChild(this.element, container);
        return this.element;
    },

    /**
     * Removes HTMLElement from dom tree
     *
     * @param {HTMLElement} container
     * @returns {HTMLElement} removed container
     */
    remove(container) {

        if (!this.isNode(container)) {
            throw new Error("Dom.remove " + container + " is not a DOMNode object");
        }

        var parent = container.parentNode;
        return parent.removeChild(container);
    }
};
