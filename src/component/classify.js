import css from '../module/css';

/**
 * Init component class
 * @return {Object} This Class instance
 *
 */
function classify(element, options) {

  var classes = ['type', 'state'];
  //css.add(element, options.prefix + '-' + name);

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

  for (var i = 0; i < classes.length; i++) {
    var n = classes[i];
    if (options[n]) {
      css.add(element, options.name + '-' + options[n]);
    }
  }

  return element;
}

export default classify;