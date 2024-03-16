import * as css from './css'
import dataset from './dataset'
import { create } from '../module/layout'

/**
 * Builds a UI component instance.
 * @param {object} instance - The component instance to build.
 */
const build = (instance) => {
  // console.log('name', instance.constructor.defaults)
  const { tag = 'div', class: customClass, data, base, container, layout, icon, label, show } = instance.options
  const { defaults = {} } = instance.constructor

  if (instance.constructor?.defaults.class === 'length') {
    console.log('---', instance.constructor.defaults)
  }

  instance.element = document.createElement(tag)

  if (defaults.base) css.add(instance.element, defaults.base)
  if (defaults.class) css.add(instance.element, defaults.class)

  if (customClass !== defaults.class) {
    css.add(instance.element, customClass)
  }

  if (data) {
    dataset(instance.element, data)
  }

  setupContainer(instance, base, container)

  if (layout) {
    setupLayout(instance, layout)
  }

  instance.ui = instance.ui || {}

  if (icon) buildIcon(instance)
  if (label) buildLabel(instance)

  if (show === true && instance.show) instance.show()
}

const setupContainer = (instance, base, container) => {
  instance.container = (base === 'view' || base === 'app') ? container || document.body : container
  if (instance.container) instance.container.appendChild(instance.element)
}

const setupLayout = (instance, layout) => {
  instance.layout = create(layout, instance.element)
  instance.ui = instance.layout.component

  if (instance.constructor.name === 'Length') {
    console.log(instance.ui)
  }
}

function buildLabel ({ ui, options, element }) {
  const { label } = options
  if (!label) return

  ui.label = document.createElement('label')
  ui.label.classList.add('label')
  ui.label.innerHTML = label

  element.appendChild(ui.label)
}

function buildIcon ({ ui, options, element }) {
  const { icon } = options
  if (!icon) return

  ui.icon = document.createElement('i')
  ui.icon.classList.add('icon')
  ui.icon.innerHTML = icon

  element.appendChild(ui.icon)
}

export default build
