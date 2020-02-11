const special = ['required', 'disabled', 'multiple', 'checked']

function setAttributes (element, o) {
  // console.log('attributes', o.attributes, element)

  if (!element) return

  for (var i = 0; i < o.attributes.length; i++) {
    var attribute = o.attributes[i]

    if (o[attribute] && o[attribute] !== 'undefined') {
      if (special.indexOf(attribute) > -1) {
        element.setAttribute(attribute, attribute)
      } else {
        element.setAttribute(attribute, o[attribute])
      }
    }
  }
}

export default setAttributes
