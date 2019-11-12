
function attributes (element, options) {
  for (var i = 0; i < options.attributes.length; i++) {
    var attribute = attributes[i]
    // console.log('attribute', attribute)
    if (attribute === 'required') {
      element.setAttribute(attribute, attribute)
    } else if (options[attribute] && options[attribute] !== 'undefined') {
      element.setAttribute(attribute, options[attribute])
    }
  }
}

export default attributes
