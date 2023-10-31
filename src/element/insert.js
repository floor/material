import dom from '../module/dom'

const insert = (element, container, context = 'bottom') => {
  if (!element || !container) return

  element = element.root || element
  container = container.root || container

  const contexts = ['top', 'bottom', 'after', 'before']
  const methods = ['prepend', 'append', 'after', 'before']

  const index = contexts.indexOf(context)
  if (index === -1) {
    return
  }

  const method = methods[index]

  // Insert component element to the DOM tree using dom
  dom[method](container, element)

  return element
}

export default insert
