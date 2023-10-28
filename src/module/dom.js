// DOM manipulation function

function append (container, element) {
  container.appendChild(element)
  return element
}

function prepend (container, element) {
  return container.insertBefore(element, container.firstChild)
}

function after (container, element) {
  return container.parentNode.insertBefore(element, container.nextSibling)
}

function before (container, element) {
  return container.insertBefore(element, container)
}

function replace (container, element) {
  return container.parentNode.replaceChild(element, container)
}

function remove (element) {
  var parent = element.parentNode
  return parent.removeChild(element)
}

function dispose (element) {
  var el = element
  return (el.parentNode) ? el.parentNode.removeChild(el) : el
}

function empty (element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
}

function destroy (element) {
  return element.parentNode.removeChild(element)
}

export default { append, prepend, after, before, replace, remove, destroy, empty, dispose }
