'use strict';

// dependencies
import morpheus from 'material/dist/vendor/morpheus';

/**
 * Animation related methods
 * @module component/animate
 */
export default {

  /**
   * [animate description]
   * @return {} animate function
   */
  animate(element, prop) {

    var animation = morpheus(element, prop);

    return animation;
  }
};