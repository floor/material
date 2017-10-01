import { is as isObject } from './module/object'
import css from './module/css'
import insert from './element/insert'

/**
 *
 */
class Layout {
  /**
   * [constructor description]
   * @param  {?} schema    [description]
   * @param  {?} container [description]
   * @return {?}           [description]
   */
  constructor(schema, container) {
    this.component = this.create(schema, container)

    return this
  }

  /**
   * [create description]
   * @param  {?} schema    [description]
   * @param  {?} container [description]
   * @param  {?} structure [description]
   * @return {?}           [description]
   */
  create(schema, container, structure, level) {
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

        if (this.isClass(schema[i])) { component = new schema[i](options) } else component = schema[i](options)

        if (name) {
          structure[name] = component
        }

        if (component) {
          this.display(component.wrapper, options)
          this.style(component, options)
        }

        // if (level === 1) console.log('insert', component, container);
        if (component && container) {
          insert(component, container)
        }
      } else if (Array.isArray(schema[i])) {
        this.create(schema[i], component, structure, level)
      }
    }

    return structure
  }

  isClass(F) {
    try {
      var object = new F()
    } catch (err) {
      // verify err is the expected error and then
      return false
    }
    return object
  }

  /**
   * [_initFlexDirection description]
   * @param  {Element} container Init direction for the given container
   * @param  {string} direction (horizontal,vertical)
   */
  display(element, options) {
    var display = options.display
    var direction = options.direction || 'horizontal'

    if (!element || !display) return

    if (direction === 'horizontal') {
      element.className += ' ' + 'flex-raw'
    } else if (direction === 'vertical') {
      element.className += ' ' + 'flex-column'
    }
  }

  /**
   * [style description]
   * @param  {?} component [description]
   * @return {?}           [description]
   */
  style(component) {
    var options = component.options || {}

    // console.log('component', component);

    if (options.flex) {
      css.add(component.wrapper, 'flex-' + options.flex)
    } else {
      var size = options.size
      if (options.size && options.width) {
        component.wrapper.width = size + 'px'
      } else if (options.size && options.height) {
        component.wrapper.height = size + 'px'
      }
    }

    if (options.hide) {
      component.wrapper.display = 'none'
    }

    if (options.theme) {
      css.add(component.wrapper, 'theme' + '-' + options.theme)
    }
  }

  /**
   * [get description]
   * @param  {?} name [description]
   * @return {?}      [description]
   */
  get(name) {
    return this.component[name]
  }
}

export default Layout