'use strict'

/**
 * insert element into dom
 * @param  {HTMLElement} element   [description]
 * @param  {HTMLElement} container [description]
 * @param  {string} context   [description]
 * @return {?}           [description]
 */
function insert(element, container, context) {
  if (!element || !container) return

  element = element.wrapper || element
  container = container.wrapper || container

  context = context || 'bottom'

  var contexts = ['top', 'bottom', 'after', 'before']
  var methods = ['prepend', 'append', 'after', 'before']

  var index = contexts.indexOf(context)
  if (index === -1) {
    return
  }

  switch (context) {
    case 'top':
      container.insertBefore(element, container.firstChild)
      break
    case 'bottom':
      container.appendChild(element)
      break
    case 'after':
      container.parentNode.insertBefore(element, container.nextSibling)
      break
    case 'before':
      container.insertBefore(element, container)
      break
    default:
      container.appendChild(element)
  }

  return element
}

export default insert