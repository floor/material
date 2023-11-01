import { is as isObject } from './module/object'
import * as css from './module/css'

class Layout {
  constructor (schema, container) {
    this.components = []
    this.component = this.create(schema, container)

    return this
  }

  create (schema, container, structure, level) {
    level = level || 0
    level++

    structure = structure || {}
    let component = null

    for (let i = 0; i < schema.length; i++) {
      // console.log('index', i, typeof schema[i])
      var name
      let options = {}

      if (schema[i] instanceof Object &&
        typeof schema[i] === 'function') {
        if (isObject(schema[i + 1])) {
          options = schema[i + 1]
        } else if (isObject(schema[i + 2])) {
          options = schema[i + 2]
        }

        if (typeof schema[i + 1] === 'string') {
          name = schema[i + 1]
          if (!schema[i].isElement && !schema[i].isComponent) {
            options.name = name
          }
        }

        component = new schema[i](options)
        const element = component.element || component

        if (level === 1) {
          structure.element = element
        }

        if (name) {
          structure[name] = component
          this.components.push([name, component])
        }

        // if (component) {
        //   this.display(component.element, options)
        //   this.style(component, options)
        // }

        if (component && container) {
          if (component.insert) {
            component.insert(container)
          } else {
            const wrapper = container.element || container

            wrapper.appendChild(element)

            if (component.onInserted) {
              component.onInserted(wrapper)
            }
          }
          component._container = container
        }
      } else if (Array.isArray(schema[i])) {
        // console.log('------', schema[i])
        if (component == null) {
          component = container
        }
        this.create(schema[i], component, structure, level)
      }
    }

    return structure
  }

  display (element, options) {
    const display = options.display
    const direction = options.direction || 'horizontal'

    if (!element || !display) return

    if (direction === 'horizontal') {
      element.className += ' ' + 'flex-row'
    } else if (direction === 'vertical') {
      element.className += ' ' + 'flex-column'
    }
  }

  style (component) {
    const options = component.options || {}

    // console.log('component', component);

    if (options.flex) {
      css.add(component.element, 'flex-' + options.flex)
    } else {
      const size = options.size
      if (options.size && options.width) {
        component.element.width = size + 'px'
      } else if (options.size && options.height) {
        component.element.height = size + 'px'
      }
    }

    if (options.position) {
      component.element.position = options.position
    }

    if (options.bottom) {
      component.element.bottom = options.bottom
    }

    if (options.hide) {
      component.element.display = 'none'
    }

    if (options.theme) {
      css.add(component.element, 'theme' + '-' + options.theme)
    }
  }

  extractInfo (object) {
    // console.log('extractField', object)

    const field = {}

    for (const property in object) {
      if (object.hasOwnProperty(property)) {
        const infos = property.split(/\./)

        if (infos[0] === 'info' && infos[1] !== undefined) {
          // console.log('field', infos[0], infos[1])
          field[infos[1]] = object[property]
        }
      }
    }

    return field
  }

  get (name) {
    if (name) return this.component[name]
    else return this.component
  }
}

export default Layout
