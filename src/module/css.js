module.exports = {

  /**
   * Check if the element className passed in parameters
   * @param  {string}  className
   * @return {boolean} The result
   */
  has(element, className) {
    if (!element || !className) {
      return;
    }

    return !!element.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
  },

  /**
   * [addClass description]
   * @param  {HTMLElement} element [description]
   * @param {string} className [description]
   * @return {object} This object
   */
  add(element, className) {
    if (!element || !className) {
      return;
    }

    if (!this.has(element, className)) {
      if (element.classList) {
        element.classList.add(className);
      } else {
        if (element.className === '') {
          element.className = className;
        } else {
          element.className += ' ' + className;
        }
      }
    }

    return this;
  },

  /**
   * Remove tghe give className from the element
   * @param  {HTMLElement} element [description]
   * @param  {string} className [description]
   * @return {object} This object
   */
  remove(element, className) {
    if (!element || !className) {
      return;
    }

    if (element.classList) {
      element.classList.remove(className);
    } else {
      if (this.has(element, className)) {
        var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
        element.className = element.className.replace(reg, ' ');
      }
    }

    return this;
  }
}
