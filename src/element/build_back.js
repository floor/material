import create from './create';
import insert from './insert';
import css from '../module/css';

export default {

  /**
   * build element and inner elements
   * @return {[type]} [description]
   */
  element(options) {
    //console.log('buildComponents', this.options.class);

    var element = create.element(options.tag);

    if (options.class) {
      css.add(element, options.class);
    }

    if (options.elements) {
      for (var i = 0; i < options.elements.length; i++) {
        var next = options.elements[i];
        this.add(next, element);
      }
    }
    return element;
  },

  /**
   * Add inner component
   * @param {optios} options Inner compoonent options
   */
  add(options, element) {
    options.tag = options.tag || 'div';

    var element = create.element(options.tag);

    //console.log('prop', idx, properties, this.element);

    var component = this.component[idx] = new Component(properties);
    component.insert(this.element);

    this.components.push(component);
  }
};