module.exports = {

  /**
   * Check if the element className passed in parameters
   * @param  {string}  className
   * @return {boolean} The result
   */
  has(element, className) {
    return !!element.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
  },

  /**
   * [addClass description]
   * @param {string} className [description]
   */
  add(element, className) {

    if (!this.has(element, className)) {
      element.className += ' ' + className;
    }

    return this;
  },

  /**
   * [removeClass description]
   * @param  {string} className [description]
   * @return {void}           [description]
   */
  remove(element, className) {
    if (this.has(element, className)) {
      var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
      element.className = element.className.replace(reg, ' ');
    }
  }
}
