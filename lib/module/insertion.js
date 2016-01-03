'use strict';

/**
 * Element insertion related methods
 * @module module/insertion
 */
module.exports = {

    /**
     * Inserts content specified by the container argument at the end of HTMLElement
     *
     * @param {HTMLElement} container
     * @param {String|HTMLElement} html
     * @return {HTMLElement} inserted element
     */
    append(container, element) {

        container.appendChild(element);
        return element;
    },

    /**
     * Inserts content specified by the html argument at the beginning of HTMLElement
     *
     * @param {HTMLElement} container
     * @param {string|HTMLElement} html
     * @returns {HTMLElement} inserted container
     */
    prepend(container, element) {

        container.insertBefore(element, container.firstChild);
        return element;
    },

    /**
     * Inserts content specified by the html argument after the HTMLElement
     *
     * @param {HTMLElement} container
     * @returns {HTMLElement} inserted container
     */
    after(container, element) {

        container.parentNode.insertBefore(element, container.nextSibling);
        return element;
    },

    /**
     * Inserts content specified by the html argument before the HTMLElement
     *
     * @param {HTMLElement} container
     * @returns {HTMLElement} inserted container
     */
    before(container, element) {

        container.insertBefore(element, container);
        return element;
    },

    /**
     * Replaces given html container with content specified in html parameter
     *
     * @param {HTMLElement} container
     * @param {string|HTMLElement} html
     * @returns {HTMLElement} inserted container
     */
    replace(container, element) {

        container.parentNode.replaceChild(element, container);
        return element;
    },

    /**
     * Removes HTMLElement from dom tree
     *
     * @param {HTMLElement} container
     * @returns {HTMLElement} removed container
     */
    remove(element) {

        var parent = element.parentNode;
        return parent.removeChild(element);
    }
};
