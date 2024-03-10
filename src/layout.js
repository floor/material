import { is as isObject } from './module/object'

/**
 * Layout class for creating and managing UI components.
 */
class Layout {
  /**
   * Constructs a new Layout instance.
   *
   * @param {Array} schema - An array defining the structure and components of the layout.
   * @param {HTMLElement} container - The container in which the layout components are placed.
   * @param {boolean} [enableMemoization=false] - Flag to enable memoization (not implemented in current version).
   */
  constructor (schema, container) {
    this.components = []
    // const startTime = Date.now()
    this.component = this.create(schema, container)
    // const endTime = Date.now()
    // console.log(`Execution time: ${endTime - startTime} ms`)
    return this
  }

  /**
   * Recursively creates components based on a provided schema.
   *
   * @param {Array} schema - An array of components or sub-schemas.
   * @param {HTMLElement} container - The container for the current level of components.
   * @param {Object} [structure={}] - An accumulator object for components, keyed by name.
   * @param {number} [level=0] - The current level of recursion.
   * @returns {Object} The structure containing all created components.
   */
  create (schema, container, structure, level) {
    level = level || 0
    level++

    structure = structure || {}
    let component = null
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < schema.length; i++) {
      var name
      let options = {}

      if (schema[i] instanceof Object && typeof schema[i] === 'function') {
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
        if (level === 1) structure.element = element

        if (name) {
          structure[name] = component
          this.components.push([name, component])
        }

        if (component) {
          if (component.insert) component.insert(fragment)
          else fragment.appendChild(element)

          if (component.onInserted) component.onInserted(fragment)
        }
      } else if (Array.isArray(schema[i])) {
        if (!component) component = container
        this.create(schema[i], component, structure, level)
      }
    }

    if (container && fragment.hasChildNodes()) {
      const wrapper = container.element || container
      // console.log('wrapper', wrapper)
      // console.log('fragment', fragment)
      wrapper.appendChild(fragment)
    }

    return structure
  }

  /**
   * Retrieves a specific component or the entire component structure.
   *
   * This method allows accessing a component from the created layout by its name.
   * If a name is provided, it returns the component associated with that name.
   * If no name is provided, it returns the entire component structure.
   *
   * @param {string} name - The name of the component to retrieve.
   * @returns {Object} The requested component or the entire component structure.
   */
  get (name) {
    if (name) return this.component[name]
    else return this.component
  }
}

export default Layout
