'use strict';

// dependencies
import morpheus from 'morpheus';

/**
 * Animation related methods
 * @module component/animate
 */
module.exports = {

  /**
   * [animate description]
   * @return {} animate function
   */
  animate(element, prop) {

    var animation = morpheus(element, prop);

    return animation;
  }
};
