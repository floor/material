
function setClass (element, className) {
  // console.log('attributes', o.attributes, element)

  if (!element || !className) return

  let classNames = className.split(' ')

  for (var i = 0; i < classNames.length; i++) {
    var name = classNames[i]
    element.classList.add(name)
  }
  return element
}

export default setClass
