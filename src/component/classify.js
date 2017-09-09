import css from '../module/css';

/**
 * Classify component related functions
 * @module component/classify
 * @category component
 */

/**
 * Init component class
 * @param  {element} element The component wrapper element
 * @param  {object} options component class options
 * @return {Instance} The Class instance
 *
 */
function classify(element, options) {

  css.add(element, options.prefix + '-' + options.class);

  if (options.name) {
    css.add(element, options.class + '-' + options.name);
  }

  if (options.color) {
    css.add(element, options.color + '-color');
  }

  if (options.css) {
    css.add(element, options.css);
  }

  return;
}

export default classify;