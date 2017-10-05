import { is as isObject } from '../module/object'
import isClass from './isclass'
import css from '../module/css'
import insert from '../element/insert'

const defaults = {}

/**
 * [constructor description]
 * @param  {?} schema    [description]
 * @param  {?} container [description]
 * @return {?}           [description]
 */
const layout = (schema, container) => {
  /**
   * [create description]
   * @param  {?} schema    [description]
   * @param  {?} container [description]
   * @param  {?} structure [description]
   * @return {?}           [description]
   */
  function create(schema, container, structure, level) {
    level = level || 0
    level++

    structure = structure || {}
    let component

    // if (level === 1)
    //   console.log('level', level);

    for (var i = 0; i < schema.length; i++) {
      var name
      var options = {}

      if (schema[i] instanceof Object &&
        typeof schema[i] === 'function') {
        if (isObject(schema[i + 2])) {
          options = schema[i + 2]
        }

        if (typeof schema[i + 1] === 'string') {
          name = schema[i + 1]
          options.name = name
        }

        if (isClass(schema[i])) { component = new schema[i](options) } else component = schema[i](options)

        if (name) {
          structure[name] = component
        }

        if (component) {
          display(component.wrapper, options)
          style(component.wrapper, options)
        }

        // if (level === 1) console.log('insert', component, container);
        if (component && container) {
          insert(component, container)
        }
      } else if (Array.isArray(schema[i])) {
        create(schema[i], component, structure, level)
      }
    }

    return structure
  }

  /**
   * [style description]
   * @param  {?} component [description]
   * @return {?}           [description]
   */
  function style(wrapper, options) {
    // console.log('component', component);

    if (options.flex) {
      css.add(wrapper, 'flex-' + options.flex)
    } else {
      var size = options.size
      if (options.size && options.width) {
        wrapper.width = size + 'px'
      } else if (options.size && options.height) {
        wrapper.height = size + 'px'
      }
    }

    if (options.hide) {
      wrapper.display = 'none'
    }

    if (options.theme) {
      css.add(wrapper, 'theme' + '-' + options.theme)
    }
  }

  /**
   * [_initFlexDirection description]
   * @param  {Element} container Init direction for the given container
   * @param  {string} direction (horizontal,vertical)
   */
  function display(element, options) {
    var display = options.display
    var direction = options.direction || 'horizontal'

    if (!element || !display) return

    if (direction === 'horizontal') {
      element.className += ' ' + 'flex-raw'
    } else if (direction === 'vertical') {
      element.className += ' ' + 'flex-column'
    }
  }

  var struct = create(schema, container)

  const api = {
    /**
     * [get description]
     * @param  {?} name [description]
     * @return {?}      [description]
     */
    get(name) {
      if (name) return struct[name]
      else return struct
    }
  }

  return api
}

export default layout